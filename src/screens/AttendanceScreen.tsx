import React, { useState, useCallback } from 'react';
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { SubjectCard } from '../components/SubjectCard';
import { SimulatorModal } from '../components/SimulatorModal';
import { RecoveryModal } from '../components/RecoveryModal';
import { PastAttendanceModal } from '../components/PastAttendanceModal';
import { Subject, SubjectType, DayOfWeek } from '../types';
import {
  Plus,
  Search,
  BookOpenCheck,
  X,
  Trash2,
  CalendarDays,
  AlertCircle,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { attendancePercentage } from '../utils/ipuEngine';

import { TIME_PRESETS } from '../constants/timetableConfig';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatTimeString = (t: string): string => {
  if (!t) return '09:30';
  const clean = t.trim();
  if (!clean.includes(':')) {
    const num = parseInt(clean);
    if (!isNaN(num)) {
      return `${num.toString().padStart(2, '0')}:00`;
    }
    return clean;
  }
  const [h, m] = clean.split(':');
  const hNum = parseInt(h);
  const mNum = parseInt(m) || 0;
  if (isNaN(hNum)) return clean;
  return `${hNum.toString().padStart(2, '0')}:${mNum.toString().padStart(2, '0')}`;
};

interface CourseScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export const AttendanceScreen: React.FC = React.memo(() => {
  const { colors } = useTheme();
  const { subjects, addSubject, addTimetableSlot, addMultipleTimetableSlots, overallPercentage, profile } =
    useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'CRITICAL' | 'SAFE' | 'THEORY' | 'LAB'
  >('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPastLogsOpen, setIsPastLogsOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  // New subject form state
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subType, setSubType] = useState<SubjectType>('Theory');
  const [subFaculty, setSubFaculty] = useState('');
  const [subRoom, setSubRoom] = useState('');
  const [subCredits, setSubCredits] = useState('4');
  const [subLTP, setSubLTP] = useState('3-0-2');
  const [isLab2x, setIsLab2x] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initial Attendance Count Inputs
  const [subInitialPresent, setSubInitialPresent] = useState('');
  const [subInitialAbsent, setSubInitialAbsent] = useState('');

  // Weekly Timetable Slots Configuration during course creation
  const [courseSlots, setCourseSlots] = useState<CourseScheduleSlot[]>([]);

  const target = profile.targetAttendance || 75;

  const initialPresentNum = parseInt(subInitialPresent) || 0;
  const initialAbsentNum = parseInt(subInitialAbsent) || 0;
  const initialTotalNum = initialPresentNum + initialAbsentNum;
  const initialPct =
    initialTotalNum > 0 ? (initialPresentNum / initialTotalNum) * 100 : 0;

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const pct = attendancePercentage(s.attended, s.total);
    if (activeFilter === 'CRITICAL') return pct < (s.targetRequirement || target);
    if (activeFilter === 'SAFE') return pct >= (s.targetRequirement || target);
    if (activeFilter === 'THEORY') return s.type === 'Theory';
    if (activeFilter === 'LAB') return s.type === 'Lab' || s.isLab2x;
    return true;
  });

  const handleToggleDaySlot = (d: DayOfWeek) => {
    AppHaptics.selection();
    const existing = courseSlots.filter(s => s.day === d);
    if (existing.length > 0) {
      // Remove slots for this day
      setCourseSlots(prev => prev.filter(s => s.day !== d));
    } else {
      // Add default slot starting from 09:30
      const defaultTime = isLab2x ? TIME_PRESETS[8] : TIME_PRESETS[0];
      const newSlot: CourseScheduleSlot = {
        id: `slot_${Date.now()}_${d}`,
        day: d,
        startTime: defaultTime.start,
        endTime: defaultTime.end,
      };
      setCourseSlots(prev => [...prev, newSlot]);
    }
  };

  const handleAddExtraSlotForDay = (d: DayOfWeek) => {
    AppHaptics.light();
    const newSlot: CourseScheduleSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      day: d,
      startTime: '10:30',
      endTime: '11:30',
    };
    setCourseSlots(prev => [...prev, newSlot]);
  };

  const handleUpdateTimeForSlot = (slotId: string, start: string, end: string) => {
    setCourseSlots(prev =>
      prev.map(s => (s.id === slotId ? { ...s, startTime: start, endTime: end } : s))
    );
  };

  const handleRemoveSlot = (slotId: string) => {
    AppHaptics.light();
    setCourseSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const handleCreateSubject = async () => {
    setFormError(null);
    if (!subName.trim()) {
      setFormError('Please enter a course name (e.g. Operating Systems).');
      AppHaptics.warning();
      return;
    }
    AppHaptics.success();

    const finalCode = subCode.trim() || subName.trim().slice(0, 3).toUpperCase() + '-101';
    const createdSub = await addSubject({
      name: subName.trim(),
      code: finalCode,
      type: subType,
      faculty: subFaculty.trim() || undefined,
      room: subRoom.trim() || 'A-204',
      credits: parseInt(subCredits) || 4,
      ltp: subLTP.trim() || '3-0-2',
      isLab2x,
      targetRequirement: target,
      attended: initialPresentNum,
      total: initialTotalNum,
    });

    if (createdSub && courseSlots.length > 0) {
      const slotsToAdd = courseSlots.map(slot => ({
        subjectId: createdSub.id,
        subjectName: createdSub.name,
        subjectCode: createdSub.code,
        type: createdSub.type,
        day: slot.day,
        startTime: formatTimeString(slot.startTime) || '09:30',
        endTime: formatTimeString(slot.endTime) || '10:30',
        room: createdSub.room || subRoom.trim() || 'A-204',
        faculty: createdSub.faculty || subFaculty.trim(),
      }));
      await addMultipleTimetableSlots(slotsToAdd);
    }

    setIsAddModalOpen(false);
    setSubName('');
    setSubCode('');
    setSubFaculty('');
    setSubInitialPresent('');
    setSubInitialAbsent('');
    setCourseSlots([]);
    setFormError(null);
  };

  const handleOpenSimulator = useCallback((s: Subject) => {
    setSelectedSubject(s);
    setIsSimulatorOpen(true);
  }, []);

  const handleOpenRecovery = useCallback((s: Subject) => {
    setSelectedSubject(s);
    setIsRecoveryOpen(true);
  }, []);

  const handleOpenPastHistory = useCallback((s: Subject) => {
    setSelectedSubject(s);
    setIsPastLogsOpen(true);
  }, []);

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.screenEyebrow, { color: colors.textTertiary }]}>CURRICULUM OBSERVATORY</Text>
              <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Courses.</Text>
            </View>

            <View style={styles.headerActions}>
              {/* 📅 Interactive Attendance Calendar Button */}
              <TouchableOpacity
                style={[styles.pastLogsBtn, { backgroundColor: colors.softBlue, borderColor: colors.border }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open attendance calendar"
                onPress={() => {
                  AppHaptics.light();
                  setIsPastLogsOpen(true);
                }}
              >
                <CalendarDays size={13} color={colors.navy} />
                <Text style={[styles.pastLogsBtnText, { color: colors.navy }]}>Calendar</Text>
              </TouchableOpacity>

              {/* + Add Course Button */}
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.navy }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Add new course"
                onPress={() => {
                  AppHaptics.light();
                  setIsAddModalOpen(true);
                }}
              >
                <Plus size={13} color={colors.textInverse} />
                <Text style={[styles.addBtnText, { color: colors.textInverse }]}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Your semester curriculum & performance at a glance
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={14} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search course title or code..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'CRITICAL', 'SAFE', 'THEORY', 'LAB'] as const).map(f => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.navy, borderColor: colors.navy },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  AppHaptics.selection();
                  setActiveFilter(f);
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.textInverse, fontWeight: '800' },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List of Subjects */}
        {filteredSubjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpenCheck size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No courses found</Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setIsAddModalOpen(true)}
            >
              <Plus size={13} color={colors.textPrimary} />
              <Text style={[styles.emptyAddBtnText, { color: colors.textPrimary }]}>Add Your First Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSubjects.map((sub, idx) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              index={idx}
              onOpenSimulator={handleOpenSimulator}
              onOpenRecovery={handleOpenRecovery}
              onOpenPastHistory={handleOpenPastHistory}
            />
          ))
        )}
      </ScrollView>

      {/* Add Subject Modal with Initial Counts & Timetable Slots */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Course & Schedule</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                accessibilityRole="button"
                accessibilityLabel="Close course creation modal"
                onPress={() => setIsAddModalOpen(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              {formError && (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: colors.crimsonSubtle,
                      borderColor: 'rgba(200, 92, 92, 0.3)',
                    },
                  ]}
                >
                  <AlertCircle size={14} color={colors.crimson} />
                  <Text style={[styles.errorText, { color: colors.crimson }]}>{formError}</Text>
                </View>
              )}

              {/* Course Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE / SUBJECT NAME</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="e.g. Operating Systems"
                  placeholderTextColor={colors.textTertiary}
                  value={subName}
                  onChangeText={text => {
                    setSubName(text);
                    if (formError) setFormError(null);
                  }}
                />
              </View>

              {/* Code & L-T-P */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE CODE (OPTIONAL)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="Auto or BCS-303"
                    placeholderTextColor={colors.textTertiary}
                    value={subCode}
                    onChangeText={setSubCode}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>L-T-P</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="3-0-2"
                    placeholderTextColor={colors.textTertiary}
                    value={subLTP}
                    onChangeText={setSubLTP}
                  />
                </View>
              </View>

              {/* 🎯 INITIAL ATTENDANCE SO FAR */}
              <View style={[styles.initialAttendanceBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.initialBoxTitle, { color: colors.accent }]}>INITIAL ATTENDANCE (SO FAR)</Text>
                <Text style={[styles.initialBoxSub, { color: colors.textTertiary }]}>
                  If classes have already started, enter your current counts:
                </Text>

                <View style={styles.twoCol}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.emerald }]}>
                      ATTENDED (PRESENT)
                    </Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: 'rgba(46, 139, 99, 0.4)' }]}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      value={subInitialPresent}
                      onChangeText={setSubInitialPresent}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.crimson }]}>
                      MISSED (ABSENT)
                    </Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: 'rgba(200, 92, 92, 0.4)' }]}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      value={subInitialAbsent}
                      onChangeText={setSubInitialAbsent}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {initialTotalNum > 0 && (
                  <View style={[styles.initialPreviewBadge, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.initialPreviewText, { color: colors.textSecondary }]}>
                      Starting at:{' '}
                      <Text
                        style={{
                          color:
                            initialPct >= target
                              ? colors.emerald
                              : colors.crimson,
                          fontWeight: '800',
                        }}
                      >
                        {initialPct.toFixed(1)}%
                      </Text>{' '}
                      ({initialPresentNum} attended / {initialTotalNum} held)
                    </Text>
                  </View>
                )}
              </View>

              {/* 📅 WEEKLY TIMETABLE SCHEDULE (MANUAL & EDITABLE) */}
              <View style={[styles.timetableSectionBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.timetableSectionHeader}>
                  <CalendarDays size={13} color={colors.accent} />
                  <Text style={[styles.timetableSectionTitle, { color: colors.accent }]}>
                    WEEKLY TIMETABLE SCHEDULE
                  </Text>
                </View>
                <Text style={[styles.timetableSectionSub, { color: colors.textTertiary }]}>
                  Tap days to assign classes. Customize exact start and end times manually:
                </Text>

                {/* Day Toggle Chips */}
                <View style={styles.dayGridRow}>
                  {DAYS.map(d => {
                    const isDayActive = courseSlots.some(s => s.day === d);
                    const slotsCount = courseSlots.filter(s => s.day === d).length;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayToggleChip,
                          { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                          isDayActive && { backgroundColor: colors.surfaceElevated, borderColor: colors.accent },
                        ]}
                        onPress={() => handleToggleDaySlot(d)}
                      >
                        <Text
                          style={[
                            styles.dayToggleText,
                            { color: colors.textTertiary },
                            isDayActive && { color: colors.accent },
                          ]}
                        >
                          {d}
                        </Text>
                        {slotsCount > 0 && (
                          <View style={[styles.dayDot, { backgroundColor: colors.accent }]}>
                            <Text style={[styles.dayDotText, { color: colors.textInverse }]}>{slotsCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 1-Tap Quick Schedule Presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 8 }}
                >
                  <TouchableOpacity
                    style={[styles.presetChipSmall, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      AppHaptics.selection();
                      const days: DayOfWeek[] = ['MON', 'WED', 'FRI'];
                      setCourseSlots(days.map((d, i) => ({
                        id: `slot_${Date.now()}_${i}_${d}`,
                        day: d,
                        startTime: '09:30',
                        endTime: '10:30',
                      })));
                    }}
                  >
                    <Text style={[styles.presetChipTextSmall, { color: colors.textSecondary }]}>
                      + Mon / Wed / Fri (09:30)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChipSmall, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      AppHaptics.selection();
                      const days: DayOfWeek[] = ['TUE', 'THU'];
                      setCourseSlots(days.map((d, i) => ({
                        id: `slot_${Date.now()}_${i}_${d}`,
                        day: d,
                        startTime: '10:30',
                        endTime: '11:30',
                      })));
                    }}
                  >
                    <Text style={[styles.presetChipTextSmall, { color: colors.textSecondary }]}>
                      + Tue / Thu (10:30)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChipSmall, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      AppHaptics.selection();
                      const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
                      setCourseSlots(days.map((d, i) => ({
                        id: `slot_${Date.now()}_${i}_${d}`,
                        day: d,
                        startTime: '09:30',
                        endTime: '10:30',
                      })));
                    }}
                  >
                    <Text style={[styles.presetChipTextSmall, { color: colors.textSecondary }]}>
                      + Mon – Fri (09:30)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Configured Slots per Active Day */}
                {courseSlots.length > 0 && (
                  <View style={styles.slotsConfigList}>
                    {DAYS.map(d => {
                      const daySlots = courseSlots.filter(s => s.day === d);
                      if (daySlots.length === 0) return null;

                      return (
                        <View key={`config_${d}`} style={[styles.daySlotGroup, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                          <View style={styles.dayGroupHeader}>
                            <Text style={[styles.dayGroupTitle, { color: colors.textPrimary }]}>{d} SCHEDULE</Text>
                            <TouchableOpacity
                              style={styles.addExtraBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`Add extra period on ${d}`}
                              onPress={() => handleAddExtraSlotForDay(d)}
                            >
                              <Plus size={10} color={colors.accent} />
                              <Text style={[styles.addExtraText, { color: colors.accent }]}>+ Add Period</Text>
                            </TouchableOpacity>
                          </View>

                          {daySlots.map((slot, slotIdx) => (
                            <View key={slot.id} style={[styles.slotEditCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                              <View style={styles.slotCardHeader}>
                                <Text style={[styles.slotCardTitle, { color: colors.textPrimary }]}>Period {slotIdx + 1}</Text>
                                <TouchableOpacity
                                  style={styles.removeSlotBtn}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Delete period ${slotIdx + 1} on ${d}`}
                                  onPress={() => handleRemoveSlot(slot.id)}
                                >
                                  <Trash2 size={11} color={colors.crimson} />
                                  <Text style={[styles.removeSlotText, { color: colors.crimson }]}>Delete</Text>
                                </TouchableOpacity>
                              </View>

                              {/* Manual Start & End Time Inputs */}
                              <View style={styles.slotTimeInputRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.timeInputSubLabel, { color: colors.textTertiary }]}>START TIME</Text>
                                  <TextInput
                                    style={[styles.timeInputSmall, { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                                    value={slot.startTime}
                                    onChangeText={val =>
                                      handleUpdateTimeForSlot(slot.id, val, slot.endTime)
                                    }
                                    placeholder="09:30"
                                    placeholderTextColor={colors.textTertiary}
                                  />
                                </View>
                                <Text style={[styles.timeToDivider, { color: colors.textTertiary }]}>–</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.timeInputSubLabel, { color: colors.textTertiary }]}>END TIME</Text>
                                  <TextInput
                                    style={[styles.timeInputSmall, { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                                    value={slot.endTime}
                                    onChangeText={val =>
                                      handleUpdateTimeForSlot(slot.id, slot.startTime, val)
                                    }
                                    placeholder="10:30"
                                    placeholderTextColor={colors.textTertiary}
                                  />
                                </View>
                              </View>

                              {/* Quick Presets aligned to 09:30 */}
                              <Text style={[styles.timeInputSubLabel, { color: colors.textTertiary, marginTop: 6, marginBottom: 3 }]}>
                                1-TAP PRESETS (09:30 START)
                              </Text>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 4 }}
                              >
                                {TIME_PRESETS.map(tp => (
                                  <TouchableOpacity
                                    key={tp.label}
                                    style={[
                                      styles.presetChipSmall,
                                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                                      slot.startTime === tp.start &&
                                        slot.endTime === tp.end && [
                                          styles.presetChipSmallActive,
                                          { borderColor: colors.accent, backgroundColor: colors.accentSubtle },
                                        ],
                                    ]}
                                    onPress={() => {
                                      AppHaptics.selection();
                                      handleUpdateTimeForSlot(slot.id, tp.start, tp.end);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.presetChipTextSmall,
                                        { color: colors.textTertiary },
                                        slot.startTime === tp.start &&
                                          slot.endTime === tp.end && {
                                            color: colors.accent,
                                          },
                                      ]}
                                    >
                                      {tp.label}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CATEGORY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {(['Theory', 'Lab', 'Practical', 'Tutorial', 'Elective'] as SubjectType[]).map(
                    t => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.catPill,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                          subType === t && [styles.catPillActive, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }],
                        ]}
                        onPress={() => {
                          setSubType(t);
                          if (t === 'Lab') setIsLab2x(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            { color: colors.textSecondary },
                            subType === t && { color: colors.accent },
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>

              {/* Room & Faculty */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ROOM NO.</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="A-204"
                    placeholderTextColor={colors.textTertiary}
                    value={subRoom}
                    onChangeText={setSubRoom}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>FACULTY (OPTIONAL)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="Dr. / Prof."
                    placeholderTextColor={colors.textTertiary}
                    value={subFaculty}
                    onChangeText={setSubFaculty}
                  />
                </View>
              </View>

              {/* 2-Hour Lab Option */}
              <TouchableOpacity
                style={[styles.labToggleRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                onPress={() => setIsLab2x(!isLab2x)}
              >
                <View style={[styles.checkbox, { borderColor: colors.textTertiary }, isLab2x && [styles.checkboxActive, { backgroundColor: colors.accent, borderColor: colors.accent }]]}>
                  {isLab2x && (
                    <Text style={{ color: colors.textInverse, fontWeight: '800', fontSize: 11 }}>
                      ✓
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labToggleTitle, { color: colors.textPrimary }]}>
                    2-Hour Lab Practical (2x Units)
                  </Text>
                  <Text style={[styles.labToggleSubtitle, { color: colors.textTertiary }]}>
                    Counts as 2 attendance units per practical session.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Save Course & Schedule Button */}
              <TouchableOpacity
                style={[styles.createCourseBtn, { backgroundColor: colors.textPrimary }]}
                activeOpacity={0.8}
                onPress={handleCreateSubject}
              >
                <Text style={[styles.createCourseText, { color: colors.textInverse }]}>
                  Save Course{' '}
                  {courseSlots.length > 0
                    ? `& ${courseSlots.length} Timetable Slot${courseSlots.length > 1 ? 's' : ''}`
                    : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Simulator Modal */}
      <SimulatorModal
        visible={isSimulatorOpen}
        subject={selectedSubject || undefined}
        onClose={() => {
          setIsSimulatorOpen(false);
          setSelectedSubject(null);
        }}
      />

      {/* Recovery Modal */}
      <RecoveryModal
        visible={isRecoveryOpen}
        subject={selectedSubject}
        onClose={() => {
          setIsRecoveryOpen(false);
          setSelectedSubject(null);
        }}
      />

      {/* 🕰️ Past Attendance & Previous Days Logs Modal */}
      <PastAttendanceModal
        visible={isPastLogsOpen}
        initialSubjectId={selectedSubject?.id || 'ALL'}
        onClose={() => {
          setIsPastLogsOpen(false);
          setSelectedSubject(null);
        }}
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
  headerBox: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenEyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.headline,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 38,
  },
  screenSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  pastLogsBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: THEME.typography.sizes.xs,
  },
  filterScroll: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  filterPillTextActive: {},
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.xl,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 8,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    marginTop: 14,
  },
  emptyAddBtnText: {
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
    maxHeight: '92%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md + 1,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  textInput: {
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  initialAttendanceBox: {
    padding: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  initialBoxTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  initialBoxSub: {
    fontSize: 10,
    marginBottom: 8,
  },
  initialPreviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  initialPreviewText: {
    fontSize: 10,
  },
  timetableSectionBox: {
    padding: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  timetableSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  timetableSectionTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  timetableSectionSub: {
    fontSize: 10,
    marginBottom: 8,
  },
  dayGridRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
  },
  dayToggleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    position: 'relative',
  },
  dayToggleChipActive: {},
  dayToggleText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  dayToggleTextActive: {},
  dayDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: {
    fontSize: 8,
    fontWeight: '800',
  },
  slotsConfigList: {
    gap: 8,
    marginTop: 4,
  },
  daySlotGroup: {
    padding: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayGroupTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
  },
  addExtraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addExtraText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  slotEditCard: {
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slotCardTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
  },
  slotTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputSubLabel: {
    fontSize: 8,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeInputSmall: {
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: THEME.typography.sizes.xs,
    fontFamily: 'monospace',
    fontWeight: THEME.typography.weights.bold,
    borderWidth: 1,
    textAlign: 'center',
  },
  timeToDivider: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    marginTop: 10,
  },
  presetChipSmall: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  presetChipSmallActive: {},
  presetChipTextSmall: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  removeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  removeSlotText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.medium,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  catPillActive: {},
  catPillText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
  },
  labToggleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginVertical: THEME.spacing.md,
    borderWidth: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {},
  labToggleTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  labToggleSubtitle: {
    fontSize: 10,
  },
  createCourseBtn: {
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 40,
  },
  createCourseText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    flex: 1,
  },
});
