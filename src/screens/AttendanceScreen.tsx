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
} from 'react-native';
import { THEME } from '../constants/theme';
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
  History,
  Trash2,
  CalendarDays,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { attendancePercentage } from '../utils/ipuEngine';

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

interface CourseScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export const AttendanceScreen: React.FC = () => {
  const { subjects, addSubject, addTimetableSlot, overallPercentage, profile } =
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
  const [subRoom, setSubRoom] = useState('A-204');
  const [subCredits, setSubCredits] = useState('4');
  const [subLTP, setSubLTP] = useState('3-0-2');
  const [isLab2x, setIsLab2x] = useState(false);

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
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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
    if (!subName.trim() || !subCode.trim()) return;
    AppHaptics.success();

    const createdSubId = `sub_${Date.now()}`;
    const cleanCode = subCode.trim().toUpperCase();
    const cleanName = subName.trim();

    await addSubject({
      id: createdSubId,
      name: cleanName,
      code: cleanCode,
      type: subType,
      faculty: subFaculty.trim(),
      room: subRoom.trim(),
      credits: parseInt(subCredits) || 4,
      ltp: subLTP.trim() || '3-0-0',
      isLab2x: isLab2x || subType === 'Lab',
      targetRequirement: target,
      attended: initialPresentNum,
      total: initialTotalNum,
    });

    // Automatically create the weekly timetable slots for this subject
    for (const cs of courseSlots) {
      await addTimetableSlot({
        day: cs.day,
        startTime: cs.startTime.trim() || '09:30',
        endTime: cs.endTime.trim() || '10:30',
        subjectId: createdSubId,
        subjectName: cleanName,
        subjectCode: cleanCode,
        room: subRoom.trim() || 'A-204',
        faculty: subFaculty.trim(),
        type: isLab2x ? 'Lab' : subType,
      });
    }

    setIsAddModalOpen(false);
    setSubName('');
    setSubCode('');
    setSubFaculty('');
    setSubInitialPresent('');
    setSubInitialAbsent('');
    setCourseSlots([]);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenEyebrow}>ACADEMIC CURRICULUM</Text>
            <Text style={styles.screenTitle}>Courses.</Text>
            <Text style={styles.screenSubtitle}>
              {subjects.length} Registered Courses · {overallPercentage.toFixed(1)}% Aggregate
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* 📅 Interactive Attendance Calendar Button */}
            <TouchableOpacity
              style={styles.pastLogsBtn}
              activeOpacity={0.8}
              onPress={() => {
                AppHaptics.light();
                setIsPastLogsOpen(true);
              }}
            >
              <CalendarDays size={13} color={THEME.colors.cyan} />
              <Text style={styles.pastLogsBtnText}>Calendar</Text>
            </TouchableOpacity>

            {/* + Add Course Button */}
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.8}
              onPress={() => {
                AppHaptics.light();
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={13} color={THEME.colors.textInverse} />
              <Text style={styles.addBtnText}>Add Course</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={14} color={THEME.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search course title or code..."
            placeholderTextColor={THEME.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color={THEME.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'CRITICAL', 'SAFE', 'THEORY', 'LAB'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                activeFilter === f && styles.filterPillActive,
              ]}
              onPress={() => {
                AppHaptics.selection();
                setActiveFilter(f);
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === f && styles.filterPillTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List of Subjects */}
        {filteredSubjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpenCheck size={28} color={THEME.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setIsAddModalOpen(true)}
            >
              <Plus size={13} color={THEME.colors.textPrimary} />
              <Text style={styles.emptyAddBtnText}>Add Your First Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSubjects.map((sub, idx) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              index={idx}
              onOpenSimulator={s => {
                setSelectedSubject(s);
                setIsSimulatorOpen(true);
              }}
              onOpenRecovery={s => {
                setSelectedSubject(s);
                setIsRecoveryOpen(true);
              }}
              onOpenPastHistory={s => {
                setSelectedSubject(s);
                setIsPastLogsOpen(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Add Subject Modal with Initial Counts & Timetable Slots */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add IPU Course & Schedule</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <X size={18} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              {/* Course Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>COURSE / SUBJECT NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Operating Systems"
                  placeholderTextColor={THEME.colors.textTertiary}
                  value={subName}
                  onChangeText={setSubName}
                />
              </View>

              {/* Code & L-T-P */}
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>COURSE CODE</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. BCS-303"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={subCode}
                    onChangeText={setSubCode}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>L-T-P</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="3-0-2"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={subLTP}
                    onChangeText={setSubLTP}
                  />
                </View>
              </View>

              {/* 🎯 INITIAL ATTENDANCE SO FAR */}
              <View style={styles.initialAttendanceBox}>
                <Text style={styles.initialBoxTitle}>INITIAL ATTENDANCE (SO FAR)</Text>
                <Text style={styles.initialBoxSub}>
                  If classes have already started, enter your current counts:
                </Text>

                <View style={styles.twoCol}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: THEME.colors.emerald }]}>
                      ATTENDED (PRESENT)
                    </Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textTertiary}
                      value={subInitialPresent}
                      onChangeText={setSubInitialPresent}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: THEME.colors.crimson }]}>
                      MISSED (ABSENT)
                    </Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textTertiary}
                      value={subInitialAbsent}
                      onChangeText={setSubInitialAbsent}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {initialTotalNum > 0 && (
                  <View style={styles.initialPreviewBadge}>
                    <Text style={styles.initialPreviewText}>
                      Starting at:{' '}
                      <Text
                        style={{
                          color:
                            initialPct >= target
                              ? THEME.colors.emerald
                              : THEME.colors.crimson,
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
              <View style={styles.timetableSectionBox}>
                <View style={styles.timetableSectionHeader}>
                  <CalendarDays size={13} color={THEME.colors.cyan} />
                  <Text style={styles.timetableSectionTitle}>
                    WEEKLY TIMETABLE SCHEDULE
                  </Text>
                </View>
                <Text style={styles.timetableSectionSub}>
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
                          isDayActive && styles.dayToggleChipActive,
                        ]}
                        onPress={() => handleToggleDaySlot(d)}
                      >
                        <Text
                          style={[
                            styles.dayToggleText,
                            isDayActive && styles.dayToggleTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                        {slotsCount > 0 && (
                          <View style={styles.dayDot}>
                            <Text style={styles.dayDotText}>{slotsCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Configured Slots per Active Day */}
                {courseSlots.length > 0 && (
                  <View style={styles.slotsConfigList}>
                    {DAYS.map(d => {
                      const daySlots = courseSlots.filter(s => s.day === d);
                      if (daySlots.length === 0) return null;

                      return (
                        <View key={`config_${d}`} style={styles.daySlotGroup}>
                          <View style={styles.dayGroupHeader}>
                            <Text style={styles.dayGroupTitle}>{d} SCHEDULE</Text>
                            <TouchableOpacity
                              style={styles.addExtraBtn}
                              onPress={() => handleAddExtraSlotForDay(d)}
                            >
                              <Plus size={10} color={THEME.colors.cyan} />
                              <Text style={styles.addExtraText}>+ Add Period</Text>
                            </TouchableOpacity>
                          </View>

                          {daySlots.map((slot, slotIdx) => (
                            <View key={slot.id} style={styles.slotEditCard}>
                              <View style={styles.slotCardHeader}>
                                <Text style={styles.slotCardTitle}>Period {slotIdx + 1}</Text>
                                <TouchableOpacity
                                  style={styles.removeSlotBtn}
                                  onPress={() => handleRemoveSlot(slot.id)}
                                >
                                  <Trash2 size={11} color={THEME.colors.crimson} />
                                  <Text style={styles.removeSlotText}>Delete</Text>
                                </TouchableOpacity>
                              </View>

                              {/* Manual Start & End Time Inputs */}
                              <View style={styles.slotTimeInputRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.timeInputSubLabel}>START TIME</Text>
                                  <TextInput
                                    style={styles.timeInputSmall}
                                    value={slot.startTime}
                                    onChangeText={val =>
                                      handleUpdateTimeForSlot(slot.id, val, slot.endTime)
                                    }
                                    placeholder="09:30"
                                    placeholderTextColor={THEME.colors.textTertiary}
                                  />
                                </View>
                                <Text style={styles.timeToDivider}>–</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.timeInputSubLabel}>END TIME</Text>
                                  <TextInput
                                    style={styles.timeInputSmall}
                                    value={slot.endTime}
                                    onChangeText={val =>
                                      handleUpdateTimeForSlot(slot.id, slot.startTime, val)
                                    }
                                    placeholder="10:30"
                                    placeholderTextColor={THEME.colors.textTertiary}
                                  />
                                </View>
                              </View>

                              {/* Quick Presets aligned to 09:30 */}
                              <Text style={[styles.timeInputSubLabel, { marginTop: 6, marginBottom: 3 }]}>
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
                                      slot.startTime === tp.start &&
                                        slot.endTime === tp.end &&
                                        styles.presetChipSmallActive,
                                    ]}
                                    onPress={() => {
                                      AppHaptics.selection();
                                      handleUpdateTimeForSlot(slot.id, tp.start, tp.end);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.presetChipTextSmall,
                                        slot.startTime === tp.start &&
                                          slot.endTime === tp.end && {
                                            color: THEME.colors.cyan,
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
                <Text style={styles.fieldLabel}>CATEGORY</Text>
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
                          subType === t && styles.catPillActive,
                        ]}
                        onPress={() => {
                          setSubType(t);
                          if (t === 'Lab') setIsLab2x(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            subType === t && { color: THEME.colors.cyan },
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
                  <Text style={styles.fieldLabel}>ROOM NO.</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="A-204"
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={subRoom}
                    onChangeText={setSubRoom}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>FACULTY (OPTIONAL)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Dr. / Prof."
                    placeholderTextColor={THEME.colors.textTertiary}
                    value={subFaculty}
                    onChangeText={setSubFaculty}
                  />
                </View>
              </View>

              {/* 2-Hour Lab Option */}
              <TouchableOpacity
                style={styles.labToggleRow}
                onPress={() => setIsLab2x(!isLab2x)}
              >
                <View style={[styles.checkbox, isLab2x && styles.checkboxActive]}>
                  {isLab2x && (
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 11 }}>
                      ✓
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labToggleTitle}>
                    2-Hour Lab Practical (2x Units)
                  </Text>
                  <Text style={styles.labToggleSubtitle}>
                    Counts as 2 attendance units per practical session.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Save Course & Schedule Button */}
              <TouchableOpacity
                style={styles.createCourseBtn}
                activeOpacity={0.8}
                onPress={handleCreateSubject}
              >
                <Text style={styles.createCourseText}>
                  Save Course{' '}
                  {courseSlots.length > 0
                    ? `& ${courseSlots.length} Timetable Slot${courseSlots.length > 1 ? 's' : ''}`
                    : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  screenSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  pastLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
  },
  pastLogsBtnText: {
    color: THEME.colors.cyan,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.xs,
  },
  filterScroll: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    gap: 6,
  },
  filterPill: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderHighlight,
  },
  filterPillText: {
    color: THEME.colors.textTertiary,
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  filterPillTextActive: {
    color: THEME.colors.textPrimary,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.xl,
    marginTop: 30,
  },
  emptyTitle: {
    color: THEME.colors.textTertiary,
    fontSize: THEME.typography.sizes.xs,
    marginTop: 8,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    marginTop: 14,
  },
  emptyAddBtnText: {
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
    maxHeight: '92%',
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
  initialAttendanceBox: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    marginBottom: THEME.spacing.md,
  },
  initialBoxTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.cyan,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  initialBoxSub: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    marginBottom: 8,
  },
  initialPreviewBadge: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  initialPreviewText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  timetableSectionBox: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
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
    color: THEME.colors.cyan,
    letterSpacing: 0.8,
  },
  timetableSectionSub: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
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
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    position: 'relative',
  },
  dayToggleChipActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.cyan,
  },
  dayToggleText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textTertiary,
  },
  dayToggleTextActive: {
    color: THEME.colors.cyan,
  },
  dayDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: {
    fontSize: 8,
    color: THEME.colors.background,
    fontWeight: '800',
  },
  slotsConfigList: {
    gap: 8,
    marginTop: 4,
  },
  daySlotGroup: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
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
    color: THEME.colors.textPrimary,
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
    color: THEME.colors.cyan,
  },
  slotEditCard: {
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
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
    color: THEME.colors.textPrimary,
  },
  slotTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputSubLabel: {
    fontSize: 8,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeInputSmall: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.xs,
    fontFamily: 'monospace',
    fontWeight: THEME.typography.weights.bold,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    textAlign: 'center',
  },
  timeToDivider: {
    color: THEME.colors.textTertiary,
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    marginTop: 10,
  },
  presetChipSmall: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  presetChipSmallActive: {
    borderColor: THEME.colors.cyan,
    backgroundColor: THEME.colors.cyanSubtle,
  },
  presetChipTextSmall: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.bold,
  },
  removeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  removeSlotText: {
    fontSize: 9,
    color: THEME.colors.crimson,
    fontWeight: THEME.typography.weights.medium,
  },
  catPill: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  catPillActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
  },
  catPillText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
  },
  labToggleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginVertical: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: THEME.colors.cyan,
    borderColor: THEME.colors.cyan,
  },
  labToggleTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  labToggleSubtitle: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
  },
  createCourseBtn: {
    backgroundColor: THEME.colors.textPrimary,
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: 40,
  },
  createCourseText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
});
