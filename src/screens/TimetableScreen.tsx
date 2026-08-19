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
import { TimetableItem } from '../components/TimetableItem';
import { DayOfWeek, SubjectType } from '../types';
import {
  Plus,
  X,
  Calendar,
  AlertCircle,
  Clock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sun,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { timeToMinutes, getLocalDateString } from '../utils/ipuEngine';

import { TIME_PRESETS } from '../constants/timetableConfig';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const TimetableScreen: React.FC = React.memo(() => {
  const { colors } = useTheme();
  const { timetable, subjects, addTimetableSlot, addSubject, todayDay } = useAttendance();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Manual Add Slot Form State
  const [useCustomCourse, setUseCustomCourse] = useState<boolean>(subjects.length === 0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [customCourseCode, setCustomCourseCode] = useState<string>('');
  const [slotType, setSlotType] = useState<SubjectType>('Theory');
  const [slotStartTime, setSlotStartTime] = useState('09:30');
  const [slotEndTime, setSlotEndTime] = useState('10:30');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotFaculty, setSlotFaculty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const subjectMap = new Map();
  subjects.forEach(s => subjectMap.set(s.id, s));

  const isRealSunday = new Date().getDay() === 0;

  // Compute exact calendar dates for each weekday of the current or navigated week
  const weekDates = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    // On Sunday, anchor to the upcoming Monday (tomorrow) for the upcoming week
    const diffToMon = day === 0 ? 1 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayIso = getLocalDateString(d);

    const map = {} as Record<
      DayOfWeek,
      {
        dateStr: string;
        dayNum: number;
        monthName: string;
        isPast: boolean;
        isToday: boolean;
        isFuture: boolean;
        dayName: string;
        formatted: string;
      }
    >;

    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    days.forEach((dk, i) => {
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(curDate);
      const dayNum = curDate.getDate();
      const monthName = curDate.toLocaleDateString('en-US', { month: 'short' });
      const isToday = dateStr === todayIso;
      const isPast = dateStr < todayIso;
      const isFuture = dateStr > todayIso;
      const dayName = fullDayNames[i];
      const formatted = `${dayName}, ${monthName} ${dayNum}`;

      map[dk] = {
        dateStr,
        dayNum,
        monthName,
        isPast,
        isToday,
        isFuture,
        dayName,
        formatted,
      };
    });

    return map;
  }, [weekOffset]);

  const selectedDayInfo = weekDates[selectedDay] || {
    dateStr: getLocalDateString(),
    dayNum: new Date().getDate(),
    monthName: 'Aug',
    isPast: false,
    isToday: true,
    isFuture: false,
    dayName: 'Monday',
    formatted: 'Monday, Schedule',
  };

  const weekRangeLabel = useMemo(() => {
    const mon = weekDates.MON;
    const sat = weekDates.SAT;
    if (!mon || !sat) return '';
    return `${mon.monthName} ${mon.dayNum} – ${sat.monthName} ${sat.dayNum}`;
  }, [weekDates]);

  const daySlots = timetable
    .filter(t => t.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const handleOpenAddModal = () => {
    AppHaptics.light();
    setFormError(null);
    if (subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
      setUseCustomCourse(false);
    } else {
      setUseCustomCourse(true);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveSlot = async () => {
    setFormError(null);

    let finalSubjectId = selectedSubjectId;
    let finalSubjectName = '';
    let finalSubjectCode = '';

    if (useCustomCourse || !selectedSubjectId || subjects.length === 0) {
      if (!customCourseName.trim()) {
        setFormError('Please enter a course name (e.g. Operating Systems).');
        AppHaptics.warning();
        return;
      }
      const code = customCourseCode.trim() || customCourseName.trim().slice(0, 3).toUpperCase() + '-101';
      finalSubjectName = customCourseName.trim();
      finalSubjectCode = code.toUpperCase();

      // Create new subject in local state & storage
      const createdSub = await addSubject({
        name: finalSubjectName,
        code: finalSubjectCode,
        type: slotType,
        faculty: slotFaculty.trim(),
        room: slotRoom.trim(),
        credits: 4,
        targetRequirement: 75,
      });
      finalSubjectId = createdSub.id;
    } else {
      const existingSub = subjectMap.get(selectedSubjectId);
      if (existingSub) {
        finalSubjectName = existingSub.name;
        finalSubjectCode = existingSub.code;
      } else {
        finalSubjectName = 'Class';
        finalSubjectCode = 'GEN-101';
      }
    }

    if (!slotStartTime.trim() || !slotEndTime.trim()) {
      setFormError('Please provide start and end times.');
      AppHaptics.warning();
      return;
    }

    AppHaptics.success();
    await addTimetableSlot({
      day: selectedDay,
      startTime: slotStartTime.trim(),
      endTime: slotEndTime.trim(),
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      subjectCode: finalSubjectCode,
      type: slotType,
      room: slotRoom.trim() || 'A-204',
      faculty: slotFaculty.trim(),
    });

    setIsAddModalOpen(false);
    setCustomCourseName('');
    setCustomCourseCode('');
    setSlotFaculty('');
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.screenEyebrow, { color: colors.textTertiary }]}>ACADEMIC TIMETABLE</Text>
              <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Schedule.</Text>
            </View>

            <View style={styles.headerActions}>
              {/* + Add Slot Button */}
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.navy }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Add new schedule slot"
                onPress={handleOpenAddModal}
              >
                <Plus size={13} color={colors.textInverse} />
                <Text style={[styles.addBtnText, { color: colors.textInverse }]}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            {selectedDayInfo.formatted} · {daySlots.length} Scheduled {daySlots.length === 1 ? 'Period' : 'Periods'}
          </Text>
        </View>

        {/* ─── Week Range Navigator ────────────────────────────────────── */}
        <View style={[styles.weekNavContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity
            style={[styles.weekNavArrow, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => {
              AppHaptics.light();
              setWeekOffset(prev => prev - 1);
            }}
          >
            <ChevronLeft size={16} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.weekNavTitle, { color: colors.textPrimary }]}>
              {weekRangeLabel}
            </Text>
            <Text style={[styles.weekNavSub, { color: colors.accent }]}>
              {weekOffset === 0
                ? isRealSunday
                  ? 'Upcoming Week Preview'
                  : 'Current Week'
                : weekOffset > 0
                ? `+${weekOffset} Week${weekOffset > 1 ? 's' : ''} Ahead`
                : `${weekOffset} Week${weekOffset < -1 ? 's' : ''} Ago`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {weekOffset !== 0 && (
              <TouchableOpacity
                style={[styles.todayResetPill, { backgroundColor: colors.accentSubtle, borderColor: colors.borderHighlight }]}
                onPress={() => {
                  AppHaptics.selection();
                  setWeekOffset(0);
                }}
              >
                <Text style={[styles.todayResetText, { color: colors.accent }]}>Today</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.weekNavArrow, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => {
                AppHaptics.light();
                setWeekOffset(prev => prev + 1);
              }}
            >
              <ChevronRight size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sunday Weekend Banner */}
        {isRealSunday && weekOffset === 0 && (
          <View style={[styles.sundayBanner, { backgroundColor: colors.amberSubtle, borderColor: colors.amber }]}>
            <Sun size={14} color={colors.amber} />
            <Text style={[styles.sundayBannerText, { color: colors.amber }]}>
              Today is Sunday ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) · Academic schedule starts tomorrow
            </Text>
          </View>
        )}

        {/* Day Selector Chips with Exact Dates */}
        <View style={styles.daySelectorRow}>
          {DAYS.map(d => {
            const isActive = selectedDay === d;
            const dayInfo = weekDates[d];
            const count = timetable.filter(t => t.day === d).length;

            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { borderColor: colors.navy, backgroundColor: colors.surface },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  AppHaptics.selection();
                  setSelectedDay(d);
                }}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.navy, fontWeight: '800' },
                  ]}
                >
                  {d}
                </Text>
                
                {/* Date Number Badge */}
                <Text
                  style={[
                    styles.dayDateNumber,
                    { color: colors.textTertiary },
                    isActive && { color: colors.navy, fontWeight: '800' },
                    dayInfo?.isToday && { color: colors.accent },
                  ]}
                >
                  {dayInfo?.dayNum}
                </Text>

                {dayInfo?.isToday && <View style={[styles.todayIndicator, { backgroundColor: colors.accent }]} />}
                
                <Text
                  style={[
                    styles.dayCount,
                    { color: colors.textTertiary },
                    isActive && { color: colors.textSecondary, fontWeight: 'bold' },
                  ]}
                >
                  {count} {count === 1 ? 'class' : 'classes'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date Context Banner */}
        <View style={[styles.dateContextBanner, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {selectedDayInfo?.isToday ? (
              <CalendarDays size={13} color={colors.accent} />
            ) : selectedDayInfo?.isPast ? (
              <CheckCircle2 size={13} color={colors.emerald} />
            ) : (
              <Clock size={13} color={colors.textTertiary} />
            )}
            <Text style={[styles.dateContextTitle, { color: colors.textPrimary }]}>
              {selectedDayInfo?.formatted}
            </Text>
          </View>

          <View
            style={[
              styles.dateContextBadge,
              {
                backgroundColor: selectedDayInfo?.isToday
                  ? colors.accentSubtle
                  : isRealSunday && selectedDay === 'MON' && weekOffset === 0
                  ? colors.accentSubtle
                  : selectedDayInfo?.isPast
                  ? colors.emeraldSubtle
                  : colors.surfaceSubtle,
              },
            ]}
          >
            <Text
              style={[
                styles.dateContextBadgeText,
                {
                  color: selectedDayInfo?.isToday
                    ? colors.accent
                    : isRealSunday && selectedDay === 'MON' && weekOffset === 0
                    ? colors.accent
                    : selectedDayInfo?.isPast
                    ? colors.emerald
                    : colors.textTertiary,
                },
              ]}
            >
              {selectedDayInfo?.isToday
                ? 'TODAY'
                : isRealSunday && selectedDay === 'MON' && weekOffset === 0
                ? 'TOMORROW'
                : selectedDayInfo?.isPast
                ? 'PAST DAY'
                : 'UPCOMING'}
            </Text>
          </View>
        </View>

        {/* Timeline Slots */}
        <View style={styles.slotsContainer}>
          {daySlots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No classes scheduled for {selectedDay}</Text>
              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  style={[styles.emptyAddBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={handleOpenAddModal}
                >
                  <Plus size={13} color={colors.textPrimary} />
                  <Text style={[styles.emptyAddText, { color: colors.textPrimary }]}>Add Class to {selectedDay}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            daySlots.map(slot => {
              const sub = subjectMap.get(slot.subjectId);
              return (
                <TimetableItem
                  key={slot.id}
                  slot={slot}
                  subject={sub}
                  showActions={true}
                  targetDateStr={selectedDayInfo?.dateStr}
                  isPastDay={selectedDayInfo?.isPast}
                  isToday={selectedDayInfo?.isToday}
                  isFutureDay={selectedDayInfo?.isFuture}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Manual Add Slot Modal */}
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Class to {selectedDay}</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsAddModalOpen(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              {formError && (
                <View style={[styles.errorBox, { backgroundColor: colors.crimsonSubtle, borderColor: 'rgba(200, 92, 92, 0.3)' }]}>
                  <AlertCircle size={14} color={colors.crimson} />
                  <Text style={[styles.errorText, { color: colors.crimson }]}>{formError}</Text>
                </View>
              )}

              {/* Course Selection or Custom Input */}
              {subjects.length > 0 && (
                <View style={[styles.toggleCourseModeRow, { backgroundColor: colors.surfaceSubtle }]}>
                  <TouchableOpacity
                    style={[styles.modeTab, !useCustomCourse && [styles.modeTabActive, { backgroundColor: colors.surfaceElevated }]]}
                    onPress={() => setUseCustomCourse(false)}
                  >
                    <Text style={[styles.modeTabText, { color: colors.textTertiary }, !useCustomCourse && { color: colors.textPrimary, fontWeight: 'bold' }]}>
                      Select Existing Course
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, useCustomCourse && [styles.modeTabActive, { backgroundColor: colors.surfaceElevated }]]}
                    onPress={() => setUseCustomCourse(true)}
                  >
                    <Text style={[styles.modeTabText, { color: colors.textTertiary }, useCustomCourse && { color: colors.textPrimary, fontWeight: 'bold' }]}>
                      + New Course
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!useCustomCourse && subjects.length > 0 ? (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CHOOSE COURSE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {subjects.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.subSelectPill,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                          selectedSubjectId === s.id && [styles.subSelectPillActive, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }],
                        ]}
                        onPress={() => {
                          AppHaptics.selection();
                          setSelectedSubjectId(s.id);
                          setSlotType(s.type);
                          if (s.room) setSlotRoom(s.room);
                          if (s.faculty) setSlotFaculty(s.faculty);
                        }}
                      >
                        <Text
                          style={[
                            styles.subSelectPillText,
                            { color: colors.textSecondary },
                            selectedSubjectId === s.id && { color: colors.accent },
                          ]}
                        >
                          {s.code} · {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE NAME</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                      placeholder="e.g. Operating Systems"
                      placeholderTextColor={colors.textTertiary}
                      value={customCourseName}
                      onChangeText={setCustomCourseName}
                    />
                  </View>

                  <View style={styles.twoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE CODE</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        placeholder="e.g. BCS-301"
                        placeholderTextColor={colors.textTertiary}
                        value={customCourseCode}
                        onChangeText={setCustomCourseCode}
                        autoCapitalize="characters"
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CATEGORY</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                        {(['Theory', 'Lab', 'Tutorial'] as SubjectType[]).map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[
                              styles.typePill,
                              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                              slotType === t && [styles.typePillActive, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }],
                            ]}
                            onPress={() => setSlotType(t)}
                          >
                            <Text style={[styles.typePillText, { color: colors.textSecondary }, slotType === t && { color: colors.accent }]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              )}

              {/* Time Presets */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>QUICK TIME SLOTS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {TIME_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.timePresetChip,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                        slotStartTime === preset.start &&
                          slotEndTime === preset.end && [
                            styles.timePresetChipActive,
                            { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight },
                          ],
                      ]}
                      onPress={() => {
                        AppHaptics.selection();
                        setSlotStartTime(preset.start);
                        setSlotEndTime(preset.end);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePresetText,
                          { color: colors.textTertiary },
                          slotStartTime === preset.start &&
                            slotEndTime === preset.end && { color: colors.accent },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Custom Time Inputs */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>START TIME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="09:00"
                    placeholderTextColor={colors.textTertiary}
                    value={slotStartTime}
                    onChangeText={setSlotStartTime}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>END TIME</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="10:00"
                    placeholderTextColor={colors.textTertiary}
                    value={slotEndTime}
                    onChangeText={setSlotEndTime}
                  />
                </View>
              </View>

              {/* Room & Faculty */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ROOM NO.</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="A-204 / Lab 3"
                    placeholderTextColor={colors.textTertiary}
                    value={slotRoom}
                    onChangeText={setSlotRoom}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>FACULTY (OPTIONAL)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    placeholder="Dr. / Prof."
                    placeholderTextColor={colors.textTertiary}
                    value={slotFaculty}
                    onChangeText={setSlotFaculty}
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveSlotBtn, { backgroundColor: colors.textPrimary }]}
                activeOpacity={0.85}
                onPress={handleSaveSlot}
              >
                <Text style={[styles.saveSlotBtnText, { color: colors.textInverse }]}>Add Class to Schedule</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontWeight: THEME.typography.weights.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  weekNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
  },
  weekNavArrow: {
    width: 28,
    height: 28,
    borderRadius: THEME.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavTitle: {
    fontSize: 12.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  weekNavSub: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  todayResetPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  todayResetText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
  },
  sundayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  sundayBannerText: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
    flex: 1,
  },
  daySelectorRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    gap: 6,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    position: 'relative',
    gap: 1,
  },
  dayChipActive: {},
  dayChipText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  dayChipTextActive: {},
  dayDateNumber: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  dayCount: {
    fontSize: 8,
    marginTop: 1,
  },
  dayCountActive: {},
  dateContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spacing.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: THEME.spacing.sm,
  },
  dateContextTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  dateContextBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  dateContextBadgeText: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.4,
  },
  slotsContainer: {
    marginTop: 2,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.xl,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 8,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
  },
  emptyAddText: {
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
    maxHeight: '88%',
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    flex: 1,
  },
  toggleCourseModeRow: {
    flexDirection: 'row',
    borderRadius: THEME.borderRadius.pill,
    padding: 3,
    marginBottom: THEME.spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.pill,
  },
  modeTabActive: {},
  modeTabText: {
    fontSize: 11,
  },
  modeTabTextActive: {},
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
  subSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  subSelectPillActive: {},
  subSelectPillText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  typePillActive: {},
  typePillText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
  },
  timePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  timePresetChipActive: {},
  timePresetText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  saveSlotBtn: {
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 40,
  },
  saveSlotBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
});
