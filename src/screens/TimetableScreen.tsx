import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { TimetableItem } from '../components/TimetableItem';
import { TimetableSlot, DayOfWeek, SubjectType } from '../types';
import { Plus, X, Calendar, AlertCircle } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const TIME_PRESETS = [
  { label: '09:30 – 10:30', start: '09:30', end: '10:30' },
  { label: '10:30 – 11:30', start: '10:30', end: '11:30' },
  { label: '11:30 – 12:30', start: '11:30', end: '12:30' },
  { label: '12:30 – 01:30', start: '12:30', end: '01:30' },
  { label: '01:30 – 02:30', start: '01:30', end: '02:30' },
  { label: '02:30 – 03:30', start: '02:30', end: '03:30' },
  { label: '03:30 – 04:30', start: '03:30', end: '04:30' },
  { label: '04:30 – 05:30', start: '04:30', end: '05:30' },
  { label: '11:30 – 01:30 (Lab)', start: '11:30', end: '01:30' },
  { label: '01:30 – 03:30 (Lab)', start: '01:30', end: '03:30' },
];

export const TimetableScreen: React.FC = () => {
  const { timetable, subjects, addTimetableSlot, addSubject, todayDay } = useAttendance();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Manual Add Slot Form State
  const [useCustomCourse, setUseCustomCourse] = useState<boolean>(subjects.length === 0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [customCourseCode, setCustomCourseCode] = useState<string>('');
  const [slotType, setSlotType] = useState<SubjectType>('Theory');
  const [slotStartTime, setSlotStartTime] = useState('09:30');
  const [slotEndTime, setSlotEndTime] = useState('10:30');
  const [slotRoom, setSlotRoom] = useState('A-204');
  const [slotFaculty, setSlotFaculty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const subjectMap = new Map();
  subjects.forEach(s => subjectMap.set(s.id, s));

  const daySlots = timetable
    .filter(t => t.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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

      // Create new subject in database
      const newSubId = `sub_${Date.now()}`;
      finalSubjectId = newSubId;
      await addSubject({
        name: finalSubjectName,
        code: finalSubjectCode,
        type: slotType,
        faculty: slotFaculty.trim(),
        room: slotRoom.trim(),
        credits: 4,
        targetRequirement: 75,
      });
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
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenEyebrow}>WEEKLY SCHEDULE</Text>
            <Text style={styles.screenTitle}>Timetable.</Text>
          </View>

          <View style={styles.headerActions}>
            {/* + Add Slot Button */}
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.8}
              onPress={handleOpenAddModal}
            >
              <Plus size={13} color={THEME.colors.textInverse} />
              <Text style={styles.addBtnText}>Add Class</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Selector Chips */}
        <View style={styles.daySelectorRow}>
          {DAYS.map(d => {
            const isActive = selectedDay === d;
            const isToday = todayDay === d;
            const count = timetable.filter(t => t.day === d).length;

            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, isActive && styles.dayChipActive]}
                activeOpacity={0.7}
                onPress={() => {
                  AppHaptics.selection();
                  setSelectedDay(d);
                }}
              >
                <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                  {d}
                </Text>
                {isToday && <View style={styles.todayIndicator} />}
                <Text style={[styles.dayCount, isActive && styles.dayCountActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline Slots */}
        <View style={styles.slotsContainer}>
          {daySlots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={28} color={THEME.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No classes scheduled for {selectedDay}</Text>
              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={handleOpenAddModal}
                >
                  <Plus size={13} color={THEME.colors.textPrimary} />
                  <Text style={styles.emptyAddText}>Add Class to {selectedDay}</Text>
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
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Manual Add Slot Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class to {selectedDay}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <X size={18} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              {formError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={14} color={THEME.colors.crimson} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              {/* Course Selection or Custom Input */}
              {subjects.length > 0 && (
                <View style={styles.toggleCourseModeRow}>
                  <TouchableOpacity
                    style={[styles.modeTab, !useCustomCourse && styles.modeTabActive]}
                    onPress={() => setUseCustomCourse(false)}
                  >
                    <Text style={[styles.modeTabText, !useCustomCourse && styles.modeTabTextActive]}>
                      Select Existing Course
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, useCustomCourse && styles.modeTabActive]}
                    onPress={() => setUseCustomCourse(true)}
                  >
                    <Text style={[styles.modeTabText, useCustomCourse && styles.modeTabTextActive]}>
                      + New Course
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!useCustomCourse && subjects.length > 0 ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CHOOSE COURSE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {subjects.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.subSelectPill,
                          selectedSubjectId === s.id && styles.subSelectPillActive,
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
                            selectedSubjectId === s.id && { color: THEME.colors.cyan },
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
                    <Text style={styles.fieldLabel}>COURSE NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Operating Systems"
                      placeholderTextColor={THEME.colors.textTertiary}
                      value={customCourseName}
                      onChangeText={setCustomCourseName}
                    />
                  </View>

                  <View style={styles.twoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>COURSE CODE</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. BCS-301"
                        placeholderTextColor={THEME.colors.textTertiary}
                        value={customCourseCode}
                        onChangeText={setCustomCourseCode}
                        autoCapitalize="characters"
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>CATEGORY</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                        {(['Theory', 'Lab', 'Tutorial'] as SubjectType[]).map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.typePill, slotType === t && styles.typePillActive]}
                            onPress={() => setSlotType(t)}
                          >
                            <Text style={[styles.typePillText, slotType === t && { color: THEME.colors.cyan }]}>
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
                <Text style={styles.fieldLabel}>QUICK TIME SLOTS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {TIME_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.timePresetChip,
                        slotStartTime === preset.start && slotEndTime === preset.end && styles.timePresetChipActive,
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
                          slotStartTime === preset.start && slotEndTime === preset.end && { color: THEME.colors.cyan },
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
                  <Text style={styles.fieldLabel}>START TIME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="09:00"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={slotStartTime}
                    onChangeText={setSlotStartTime}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>END TIME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10:00"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={slotEndTime}
                    onChangeText={setSlotEndTime}
                  />
                </View>
              </View>

              {/* Room & Faculty */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>ROOM NO.</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="A-204 / Lab 3"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={slotRoom}
                    onChangeText={setSlotRoom}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>FACULTY (OPTIONAL)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Dr. / Prof."
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={slotFaculty}
                    onChangeText={setSlotFaculty}
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveSlotBtn}
                activeOpacity={0.85}
                onPress={handleSaveSlot}
              >
                <Text style={styles.saveSlotBtnText}>Add Class to Schedule</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  screenEyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.headline,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 38,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.textPrimary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  addBtnText: {
    color: THEME.colors.textInverse,
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
  },
  daySelectorRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    gap: 6,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    position: 'relative',
  },
  dayChipActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderHighlight,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textTertiary,
  },
  dayChipTextActive: {
    color: THEME.colors.textPrimary,
  },
  todayIndicator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.cyan,
    marginTop: 2,
  },
  dayCount: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  dayCountActive: {
    color: THEME.colors.cyan,
    fontWeight: THEME.typography.weights.bold,
  },
  slotsContainer: {
    marginTop: THEME.spacing.sm,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.xl,
    marginTop: 20,
  },
  emptyTitle: {
    color: THEME.colors.textTertiary,
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
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
  },
  emptyAddText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md + 1,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.crimsonSubtle,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: THEME.colors.crimson,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    flex: 1,
  },
  toggleCourseModeRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceSubtle,
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
  modeTabActive: {
    backgroundColor: THEME.colors.surfaceElevated,
  },
  modeTabText: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.medium,
  },
  modeTabTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: THEME.typography.weights.bold,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  subSelectPill: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  subSelectPillActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
  },
  subSelectPillText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
  },
  typePill: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  typePillActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
  },
  typePillText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  timePresetChip: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  timePresetChipActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderHighlight,
  },
  timePresetText: {
    color: THEME.colors.textTertiary,
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  saveSlotBtn: {
    backgroundColor: THEME.colors.textPrimary,
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 40,
  },
  saveSlotBtnText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
});
