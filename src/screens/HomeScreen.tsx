import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { Header } from '../components/Header';
import { AttendanceHero } from '../components/AttendanceHero';
import { TimetableItem } from '../components/TimetableItem';
import { CanISkipModal } from '../components/CanISkipModal';
import { SimulatorModal } from '../components/SimulatorModal';
import { RecoveryModal } from '../components/RecoveryModal';
import { AskAttendlyModal } from '../components/AskIPUModal';
import { Subject, DayOfWeek } from '../types';
import {
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
  RotateCcw,
  Zap,
  Plus,
  X,
  Check,
  Clock,
  Sun,
  Calendar,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import {
  attendancePercentage,
  attendanceBuffer,
  timeToMinutes,
  isSlotMatchingRecord,
  getLocalDateString,
} from '../utils/ipuEngine';
import { TIME_PRESETS } from '../constants/timetableConfig';

interface HomeScreenProps {
  onNavigateTab: (tab: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = React.memo(({ onNavigateTab }) => {
  const { colors } = useTheme();
  const {
    todaySlots,
    todayDay,
    isSunday,
    timetable,
    subjects,
    records,
    undoLastAction,
    markAttendance,
    markAllSlotsAttendance,
    addTimetableSlot,
    profile,
    lastActionBatch,
  } = useAttendance();

  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isAskAttendlyOpen, setIsAskAttendlyOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showMondayPreview, setShowMondayPreview] = useState(false);

  // Extra Class Modal State
  const [isExtraClassModalOpen, setIsExtraClassModalOpen] = useState(false);
  const [extraSubId, setExtraSubId] = useState<string>(subjects[0]?.id || '');
  const [extraStart, setExtraStart] = useState('03:30');
  const [extraEnd, setExtraEnd] = useState('04:30');
  const [extraRoom, setExtraRoom] = useState('A-204');

  const target = profile.targetAttendance || 75;

  const todayStr = getLocalDateString();
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }, []);

  const mondaySlots = useMemo(() => {
    return timetable
      .filter(slot => slot.day === 'MON')
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [timetable]);

  const areAllTodayMarked =
    todaySlots.length > 0 &&
    todaySlots.every(slot =>
      records.some(
        r =>
          r.subjectId === slot.subjectId &&
          r.date === todayStr &&
          isSlotMatchingRecord(r.slotTime, r.note, slot.startTime, slot.endTime, slot.day) &&
          r.status === 'PRESENT'
      )
    );

  // Find the subject most in need of attention (lowest attendance below target among courses with classes held)
  const criticalSubject = useMemo(() => {
    const subjectsWithClasses = subjects.filter(s => s.total > 0);
    const belowTarget = subjectsWithClasses.filter(s => {
      const subTarget = s.targetRequirement || target;
      return attendancePercentage(s.attended, s.total) < subTarget;
    });

    if (belowTarget.length === 0) return null;

    return belowTarget.reduce((prev, curr) => {
      const prevPct = attendancePercentage(prev.attended, prev.total);
      const currPct = attendancePercentage(curr.attended, curr.total);
      return currPct < prevPct ? curr : prev;
    });
  }, [subjects, target]);

  // Find the subject with highest positive buffer
  const bufferStarSubject = useMemo(() => {
    const subjectsWithClasses = subjects.filter(s => s.total > 0);
    if (subjectsWithClasses.length === 0) return null;

    const withBuffer = subjectsWithClasses.map(s => ({
      subject: s,
      buf: attendanceBuffer(s.attended, s.total, s.targetRequirement || target),
      pct: attendancePercentage(s.attended, s.total),
    })).filter(item => item.buf > 0);

    if (withBuffer.length === 0) return null;

    withBuffer.sort((a, b) => b.buf - a.buf || b.pct - a.pct);
    return withBuffer[0];
  }, [subjects, target]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const lastRecord = records[0];
  const hasRecentAction = !!lastActionBatch && !!lastRecord;

  // 1-Tap Mark Full Day Present (Atomic batch, safe from duplicates)
  const handleMarkAllTodayPresent = async () => {
    if (areAllTodayMarked) {
      AppHaptics.light();
      return;
    }
    await markAllSlotsAttendance(todaySlots, 'PRESENT');
  };

  const handleOpenExtraClass = () => {
    AppHaptics.light();
    if (subjects.length > 0 && !extraSubId) {
      setExtraSubId(subjects[0].id);
    }
    setIsExtraClassModalOpen(true);
  };

  const handleLogExtraAttendance = async (status: 'PRESENT' | 'ABSENT' | 'OD') => {
    const sub = subjects.find(s => s.id === extraSubId) || subjects[0];
    if (!sub) return;

    AppHaptics.success();
    await markAttendance(sub.id, status, {
      time: `${extraStart} - ${extraEnd}`,
      room: extraRoom.trim() || sub.room || 'Extra Class',
      note: isSunday ? 'Extra Class (Sunday)' : `Extra Class (${todayDay})`,
    });
    setIsExtraClassModalOpen(false);
  };

  const handleAddExtraToSchedule = async () => {
    const sub = subjects.find(s => s.id === extraSubId) || subjects[0];
    if (!sub) return;

    AppHaptics.success();
    await addTimetableSlot({
      day: isSunday ? 'MON' : (todayDay as DayOfWeek),
      startTime: extraStart.trim() || '03:30',
      endTime: extraEnd.trim() || '04:30',
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      type: sub.type,
      room: extraRoom.trim() || sub.room || 'A-204',
      faculty: sub.faculty || 'Extra Faculty',
    });
    setIsExtraClassModalOpen(false);
  };

  const chosenExtraSub = subjects.find(s => s.id === extraSubId) || subjects[0];

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Header with Greeting and AI button */}
        <Header onOpenAskAttendly={() => setIsAskAttendlyOpen(true)} />

        {/* 2. Main Kinetic Ring Hero */}
        <AttendanceHero
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onOpenMarks={() => onNavigateTab?.('INSIGHTS')}
        />

        {/* 3. Undo / Recent Action Banner */}
        {hasRecentAction && (
          <View style={[styles.undoBanner, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.undoLeft}>
              <View style={[styles.undoDot, { backgroundColor: lastRecord.status === 'PRESENT' ? colors.emerald : colors.crimson }]} />
              <Text style={[styles.undoText, { color: colors.textSecondary }]} numberOfLines={1}>
                Marked {lastRecord.status.toLowerCase()} for {lastRecord.subjectCode}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.undoBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Undo last marked attendance action"
              onPress={() => undoLastAction()}
            >
              <RotateCcw size={12} color={colors.accent} />
              <Text style={[styles.undoBtnText, { color: colors.accent }]}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Interactive Editorial Action Strips (Replacing side-by-side cards) */}
        <View style={styles.actionStripsContainer}>
          <TouchableOpacity
            style={[
              styles.actionStrip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              AppHaptics.light();
              setIsSkipModalOpen(true);
            }}
          >
            <View style={styles.actionStripLeft}>
              <View style={[styles.actionStripIconBadge, { backgroundColor: '#E8F0FF' }]}>
                <CalendarCheck size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionStripTitle, { color: colors.textPrimary }]}>Can I skip today?</Text>
                <Text style={[styles.actionStripSub, { color: colors.textTertiary }]}>Check attendance threshold & safety buffer</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionStrip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                marginTop: 8,
              },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              AppHaptics.light();
              setIsSimulatorOpen(true);
            }}
          >
            <View style={styles.actionStripLeft}>
              <View style={[styles.actionStripIconBadge, { backgroundColor: '#E8F0FF' }]}>
                <Sparkles size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionStripTitle, { color: colors.textPrimary }]}>What-If Simulator</Text>
                <Text style={[styles.actionStripSub, { color: colors.textTertiary }]}>Miss a class or attend consecutively. See what changes</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Welcome Quick-Start Card for Fresh Installs */}
        {subjects.length === 0 && (
          <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} color={colors.accent} />
              <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Welcome to Attendly!</Text>
            </View>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              You have no courses added yet. Register your semester courses and timetable to unlock attendance rings, skip predictions, and dispute logs.
            </Text>
            <TouchableOpacity
              style={[styles.welcomeBtn, { backgroundColor: colors.textPrimary }]}
              activeOpacity={0.8}
              onPress={() => {
                AppHaptics.medium();
                onNavigateTab('ATTENDANCE');
              }}
            >
              <Plus size={14} color={colors.textInverse} />
              <Text style={[styles.welcomeBtnText, { color: colors.textInverse }]}>+ Add Your First Course</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Critical Subject Intervention Card */}
        {criticalSubject && (
          <TouchableOpacity
            style={[
              styles.attentionCard,
              {
                backgroundColor: colors.surface,
                borderColor: 'rgba(244, 63, 94, 0.25)',
                shadowColor: colors.crimson,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 6,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              AppHaptics.light();
              setSelectedSubject(criticalSubject);
              setIsRecoveryOpen(true);
            }}
          >
            <View style={styles.attentionTop}>
              <View style={[styles.attentionBadge, { backgroundColor: colors.crimsonSubtle }]}>
                <ShieldAlert size={12} color={colors.crimson} />
                <Text style={[styles.attentionBadgeText, { color: colors.crimson }]}>ATTENTION REQUIRED</Text>
              </View>
              <View style={[styles.attentionPctBadge, { backgroundColor: colors.crimsonSubtle }]}>
                <Text style={[styles.attentionPct, { color: colors.crimson }]}>
                  {attendancePercentage(criticalSubject.attended, criticalSubject.total).toFixed(1)}%
                </Text>
              </View>
            </View>

            <Text style={[styles.attentionSubjectName, { color: colors.textPrimary }]}>{criticalSubject.name}</Text>
            <Text style={[styles.attentionReason, { color: colors.textSecondary }]}>
              Short by {Math.abs(attendanceBuffer(criticalSubject.attended, criticalSubject.total, target))} classes to meet {target}% target.
            </Text>

            <View style={styles.rescueBtnRow}>
              <Text style={[styles.rescueBtnText, { color: colors.crimson }]}>View Step-by-Step Recovery Plan</Text>
              <ChevronRight size={13} color={colors.crimson} />
            </View>
          </TouchableOpacity>
        )}

        {/* 6. Today's Timeline Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>TODAY'S SCHEDULE</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {isSunday ? 'Sunday · Weekend' : `${todayDay} · ${todaySlots.length} Classes`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* + Extra Class Button */}
            <TouchableOpacity
              style={[
                styles.extraClassBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
              activeOpacity={0.75}
              onPress={handleOpenExtraClass}
            >
              <Plus size={11} color={colors.accent} />
              <Text style={[styles.extraClassBtnText, { color: colors.accent }]}>+ Extra Class</Text>
            </TouchableOpacity>

            {!isSunday && todaySlots.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.quickMarkAllBtn,
                  {
                    backgroundColor: areAllTodayMarked ? colors.surfaceSubtle : colors.emeraldSubtle,
                    borderColor: areAllTodayMarked
                      ? colors.borderSubtle
                      : 'rgba(46, 139, 99, 0.25)',
                  },
                ]}
                activeOpacity={areAllTodayMarked ? 1 : 0.75}
                onPress={handleMarkAllTodayPresent}
              >
                {areAllTodayMarked ? (
                  <Check size={11} color={colors.emerald} />
                ) : (
                  <Zap size={11} color={colors.emerald} />
                )}
                <Text
                  style={[
                    styles.quickMarkAllText,
                    { color: areAllTodayMarked ? colors.textSecondary : colors.emerald },
                  ]}
                >
                  {areAllTodayMarked ? 'All Marked ✓' : 'All Present'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSunday ? (
          <View>
            {/* Sunday Weekend Card */}
            <View style={[styles.weekendCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Sun size={15} color={colors.amber} />
                <Text style={[styles.weekendTitle, { color: colors.amber }]}>Sunday · Weekend</Text>
              </View>
              <Text style={[styles.weekendSub, { color: colors.textSecondary }]}>
                No classes scheduled today. Academic lectures resume tomorrow (Monday).
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.weekendBtn,
                    {
                      backgroundColor: showMondayPreview ? colors.surfaceElevated : colors.accentSubtle,
                      borderColor: showMondayPreview ? colors.borderHighlight : colors.accent,
                    },
                  ]}
                  onPress={() => {
                    AppHaptics.selection();
                    setShowMondayPreview(prev => !prev);
                  }}
                >
                  <Calendar size={13} color={colors.accent} />
                  <Text style={[styles.weekendBtnText, { color: colors.accent }]}>
                    {showMondayPreview ? 'Hide Monday Preview' : 'Preview Monday (Tomorrow)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.weekendBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                  onPress={handleOpenExtraClass}
                >
                  <Plus size={13} color={colors.textSecondary} />
                  <Text style={[styles.weekendBtnText, { color: colors.textSecondary }]}>+ Log Extra Class</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Optional Monday Preview (Locked Future Mode) */}
            {showMondayPreview && (
              <View style={{ marginTop: 12 }}>
                <View style={[styles.previewNotice, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                  <Clock size={12} color={colors.textTertiary} />
                  <Text style={[styles.previewNoticeText, { color: colors.textSecondary }]}>
                    Previewing Monday ({mondaySlots.length} Classes) · Action buttons locked until tomorrow
                  </Text>
                </View>
                {mondaySlots.length === 0 ? (
                  <View style={[styles.noClassesCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.noClassesText, { color: colors.textTertiary }]}>No classes scheduled for Monday.</Text>
                  </View>
                ) : (
                  mondaySlots.map(slot => {
                    const sub = subjectMap.get(slot.subjectId);
                    return (
                      <TimetableItem
                        key={slot.id}
                        slot={slot}
                        subject={sub}
                        showActions={true}
                        isFutureDay={true}
                        targetDateStr={tomorrowIso}
                      />
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : todaySlots.length === 0 ? (
          <View style={[styles.noClassesCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.noClassesText, { color: colors.textTertiary }]}>No classes scheduled for {todayDay}.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.goToTimetableBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleOpenExtraClass}
              >
                <Text style={[styles.goToTimetableText, { color: colors.accent }]}>+ Log Extra Class</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.goToTimetableBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => onNavigateTab('TIMETABLE')}
              >
                <Text style={[styles.goToTimetableText, { color: colors.textSecondary }]}>View Weekly Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          todaySlots.map(slot => {
            const sub = subjectMap.get(slot.subjectId);
            return (
              <TimetableItem
                key={slot.id}
                slot={slot}
                subject={sub}
                showActions={true}
                targetDateStr={todayStr}
              />
            );
          })
        )}
      </ScrollView>

      {/* ─── EXTRA CLASS MODAL ─────────────────────────────────────── */}
      <Modal
        visible={isExtraClassModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsExtraClassModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log Extra Class</Text>
                <Text style={[styles.modalSub, { color: colors.textTertiary }]}>{todayDay} · Single Session</Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsExtraClassModalOpen(false)}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: THEME.spacing.lg }} showsVerticalScrollIndicator={false}>
              {/* Select Course */}
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SELECT COURSE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
                {subjects.map(sub => {
                  const isSelected = (extraSubId || subjects[0]?.id) === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.coursePill,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                        isSelected && { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
                      ]}
                      onPress={() => {
                        AppHaptics.selection();
                        setExtraSubId(sub.id);
                        if (sub.room) setExtraRoom(sub.room);
                      }}
                    >
                      <Text
                        style={[
                          styles.coursePillText,
                          { color: colors.textSecondary },
                          isSelected && { color: colors.accent, fontWeight: 'bold' },
                        ]}
                      >
                        {sub.code} · {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Quick Time Presets */}
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CLASS TIMING</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {TIME_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      extraStart === preset.start &&
                        extraEnd === preset.end && {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.borderHighlight,
                        },
                    ]}
                    onPress={() => {
                      AppHaptics.selection();
                      setExtraStart(preset.start);
                      setExtraEnd(preset.end);
                    }}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        { color: colors.textTertiary },
                        extraStart === preset.start &&
                          extraEnd === preset.end && { color: colors.accent },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Custom Time & Room */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>START TIME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={extraStart}
                    onChangeText={setExtraStart}
                    placeholder="03:30"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>END TIME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={extraEnd}
                    onChangeText={setExtraEnd}
                    placeholder="04:30"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ROOM / LOCATION</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={extraRoom}
                  onChangeText={setExtraRoom}
                  placeholder="e.g. Room A-204"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Direct Log Actions */}
              <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 10 }]}>MARK ATTENDANCE FOR THIS EXTRA CLASS</Text>
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.logPresentBtn, { backgroundColor: colors.emerald }]}
                  activeOpacity={0.85}
                  onPress={() => handleLogExtraAttendance('PRESENT')}
                >
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.logPresentText}>Mark Present (+1)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logAbsentBtn, { backgroundColor: colors.crimsonSubtle, borderColor: 'rgba(200,92,92,0.3)' }]}
                  activeOpacity={0.85}
                  onPress={() => handleLogExtraAttendance('ABSENT')}
                >
                  <X size={14} color={colors.crimson} />
                  <Text style={[styles.logAbsentText, { color: colors.crimson }]}>Mark Absent</Text>
                </TouchableOpacity>
              </View>

              {/* Or Add to Today's Timeline Slot */}
              <TouchableOpacity
                style={[styles.addToTimelineBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight }]}
                activeOpacity={0.8}
                onPress={handleAddExtraToSchedule}
              >
                <Clock size={13} color={colors.accent} />
                <Text style={[styles.addToTimelineText, { color: colors.accent }]}>
                  + Add as Slot on Today's Timeline
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modals */}
      <CanISkipModal
        visible={isSkipModalOpen}
        onClose={() => setIsSkipModalOpen(false)}
      />

      <SimulatorModal
        visible={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      <RecoveryModal
        visible={isRecoveryOpen}
        subject={selectedSubject}
        onClose={() => {
          setIsRecoveryOpen(false);
          setSelectedSubject(null);
        }}
      />

      <AskAttendlyModal
        visible={isAskAttendlyOpen}
        onClose={() => setIsAskAttendlyOpen(false)}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spacing.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  undoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  undoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  undoText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  undoBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  actionStripsContainer: {
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.md,
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  actionStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  actionStripIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionStripTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  actionStripSub: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 2,
  },
  attentionCard: {
    marginHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  attentionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  attentionBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
  },
  attentionPctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  attentionPct: {
    fontSize: 12.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.3,
  },
  attentionSubjectName: {
    fontSize: 13.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  attentionReason: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  rescueBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  rescueBtnText: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.sm,
    marginTop: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    marginTop: 1,
  },
  extraClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  extraClassBtnText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  quickMarkAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  quickMarkAllText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  noClassesCard: {
    marginHorizontal: THEME.spacing.xl,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  noClassesText: {
    fontSize: 11,
  },
  goToTimetableBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  goToTimetableText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  modalSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  coursePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  coursePillText: {
    fontSize: 11,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  textInput: {
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  logPresentBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  logPresentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
  },
  logAbsentBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  logAbsentText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
  },
  addToTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: 30,
  },
  addToTimelineText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  weekendCard: {
    marginHorizontal: THEME.spacing.xl,
    padding: 16,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  weekendTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  weekendSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  weekendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  weekendBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: THEME.spacing.xl,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  previewNoticeText: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.medium,
  },
  welcomeCard: {
    marginHorizontal: THEME.spacing.xl,
    padding: 16,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginTop: 12,
  },
  welcomeTitle: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  welcomeSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  welcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  welcomeBtnText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
  },
});
