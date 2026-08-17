import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Subject, DayOfWeek, SubjectType } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  attendanceBuffer,
  subjectRiskLevel,
  timeToMinutes,
} from '../utils/ipuEngine';
import {
  Check,
  X,
  SlidersHorizontal,
  ShieldAlert,
  Trash2,
  Calendar,
  Plus,
  History,
  Edit3,
  BookOpen,
} from 'lucide-react-native';
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
  { label: '11:30 – 01:30 (Lab)', start: '11:30', end: '01:30' },
  { label: '01:30 – 03:30 (Lab)', start: '01:30', end: '03:30' },
];

interface SubjectCardProps {
  subject: Subject;
  index?: number;
  onPressCard?: () => void;
  onOpenSimulator?: (subject: Subject) => void;
  onOpenRecovery?: (subject: Subject) => void;
  onOpenPastHistory?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  index = 0,
  onPressCard,
  onOpenSimulator,
  onOpenRecovery,
  onOpenPastHistory,
}) => {
  const { colors, isDark } = useTheme();
  const {
    markAttendance,
    deleteSubject,
    updateSubject,
    timetable,
    addTimetableSlot,
    deleteTimetableSlot,
    profile,
  } = useAttendance();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'DETAILS' | 'TIMETABLE'>('DETAILS');

  // Edit Course State
  const [editName, setEditName] = useState(subject.name);
  const [editCode, setEditCode] = useState(subject.code);
  const [editType, setEditType] = useState<SubjectType>(subject.type);
  const [editRoom, setEditRoom] = useState(subject.room || 'A-204');
  const [editFaculty, setEditFaculty] = useState(subject.faculty || '');
  const [editTarget, setEditTarget] = useState(
    (subject.targetRequirement || profile.targetAttendance || 75).toString()
  );
  const [editAttended, setEditAttended] = useState(subject.attended.toString());
  const [editTotal, setEditTotal] = useState(subject.total.toString());

  // Add Slot State
  const [newSlotDay, setNewSlotDay] = useState<DayOfWeek>('MON');
  const [newSlotStart, setNewSlotStart] = useState('09:30');
  const [newSlotEnd, setNewSlotEnd] = useState('10:30');

  const target = subject.targetRequirement || profile.targetAttendance || 75;
  const pct = attendancePercentage(subject.attended, subject.total);
  const buffer = attendanceBuffer(subject.attended, subject.total, target);
  const risk = subjectRiskLevel(subject.attended, subject.total, target);
  const isBelow = pct < target;

  const formattedIndex = (index + 1).toString().padStart(2, '0');
  const bufferDisplay = buffer >= 0 ? `+${buffer}` : `${buffer}`;

  // Subject's timetable slots
  const subjectSlots = timetable
    .filter(t => t.subjectId === subject.id)
    .sort((a, b) => a.day.localeCompare(b.day) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const scheduledDays = Array.from(new Set(subjectSlots.map(s => s.day))).join(', ');

  const handleMark = (status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD') => {
    markAttendance(subject.id, status, {
      time: 'Quick Mark',
      room: subject.room,
    });
  };

  const handleDelete = () => {
    AppHaptics.warning();
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`Are you sure you want to remove "${subject.name}"? This will delete its timetable schedule and attendance records.`)
        : true;
      if (ok) {
        deleteSubject(subject.id);
        setIsEditModalOpen(false);
      }
      return;
    }

    Alert.alert(
      'Remove Course',
      `Are you sure you want to remove "${subject.name}"? This will delete its timetable schedule and attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteSubject(subject.id);
            setIsEditModalOpen(false);
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    AppHaptics.light();
    setEditName(subject.name);
    setEditCode(subject.code);
    setEditType(subject.type);
    setEditRoom(subject.room || 'A-204');
    setEditFaculty(subject.faculty || '');
    setEditTarget((subject.targetRequirement || profile.targetAttendance || 75).toString());
    setEditAttended(subject.attended.toString());
    setEditTotal(subject.total.toString());
    setIsEditModalOpen(true);
  };

  const handleSaveCourseDetails = async () => {
    if (!editName.trim()) return;
    AppHaptics.success();

    const attNum = parseInt(editAttended) || 0;
    const totNum = parseInt(editTotal) || 0;

    await updateSubject({
      ...subject,
      name: editName.trim(),
      code: editCode.trim().toUpperCase() || subject.code,
      type: editType,
      room: editRoom.trim() || undefined,
      faculty: editFaculty.trim() || undefined,
      targetRequirement: parseInt(editTarget) || 75,
      attended: Math.max(0, attNum),
      total: Math.max(attNum, totNum),
      isLab2x: editType === 'Lab',
    });

    setIsEditModalOpen(false);
  };

  const handleAddNewSlot = async () => {
    AppHaptics.success();
    await addTimetableSlot({
      day: newSlotDay,
      startTime: newSlotStart.trim() || '09:30',
      endTime: newSlotEnd.trim() || '10:30',
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      type: subject.type,
      room: editRoom.trim() || subject.room || 'A-204',
      faculty: subject.faculty || '',
    });
  };

  const handleDeleteSlot = async (slotId: string) => {
    AppHaptics.light();
    await deleteTimetableSlot(slotId);
  };

  return (
    <View
      style={[
        styles.rowContainer,
        {
          backgroundColor: colors.surface,
          borderColor: isExpanded ? colors.borderHighlight : colors.borderSubtle,
          shadowColor: isDark ? '#000000' : colors.accent,
          shadowOffset: { width: 0, height: isExpanded ? 6 : 2 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: isExpanded ? 16 : 8,
          elevation: isExpanded ? 5 : 2,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.mainRow}
        activeOpacity={0.7}
        onPress={() => {
          AppHaptics.light();
          setIsExpanded(!isExpanded);
          onPressCard?.();
        }}
      >
        {/* Index Number */}
        <Text style={[styles.indexNumber, { color: colors.textTertiary }]}>{formattedIndex}</Text>

        {/* Course Info & Micro-Bar */}
        <View style={styles.centerInfo}>
          <View style={styles.titleLine}>
            <Text style={[styles.subjectName, { color: colors.textPrimary }]} numberOfLines={1}>
              {subject.name.toUpperCase()}
            </Text>
            {subject.isLab2x && (
              <Text style={[styles.labTag, { color: colors.gold, backgroundColor: colors.goldSubtle }]}>
                LAB
              </Text>
            )}
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.codeBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.codeBadgeText, { color: colors.accent }]}>{subject.code}</Text>
            </View>
            <Text style={[styles.facultySub, { color: colors.textTertiary }]} numberOfLines={1}>
              {subject.attended}/{subject.total} Classes {subject.room ? `· ${subject.room}` : ''}
              {scheduledDays ? ` · ${scheduledDays}` : ''}
            </Text>
          </View>

          {/* Precision Micro-Bar */}
          <View style={[styles.microTrack, { backgroundColor: colors.ringTrack }]}>
            <View
              style={[
                styles.microFill,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: risk.color,
                },
              ]}
            />
            <View
              style={[
                styles.targetTick,
                {
                  left: `${target}%`,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(17, 17, 19, 0.3)',
                },
              ]}
            />
          </View>
        </View>

        {/* Percentage & Buffer Number */}
        <View style={styles.rightStats}>
          <Text style={[styles.pctNumber, { color: isBelow ? colors.crimson : colors.textPrimary }]}>
            {pct.toFixed(1)}%
          </Text>
          <View style={[styles.bufferBadgeCapsule, { backgroundColor: buffer >= 0 ? colors.emeraldSubtle : colors.crimsonSubtle }]}>
            <Text style={[styles.bufferBadge, { color: buffer >= 0 ? colors.emerald : colors.crimson }]}>
              {bufferDisplay}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Quick Controls */}
      {isExpanded && (
        <View style={styles.expandedDrawer}>
          {/* Row 1: Quick Mark Attendance */}
          <View style={styles.drawerActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(46, 139, 99, 0.25)',
                  backgroundColor: colors.emeraldSubtle,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => handleMark('PRESENT')}
            >
              <Check size={14} color={colors.emerald} />
              <Text style={[styles.actionBtnText, { color: colors.emerald }]}>+ Attended</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(200, 92, 92, 0.25)',
                  backgroundColor: colors.crimsonSubtle,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => handleMark('ABSENT')}
            >
              <X size={14} color={colors.crimson} />
              <Text style={[styles.actionBtnText, { color: colors.crimson }]}>− Missed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.surfaceSubtle,
                  flex: 0.8,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => handleMark('CANCELLED')}
            >
              <Text style={[styles.actionBtnText, { color: colors.textTertiary }]}>No Class</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.surfaceElevated,
                  flex: 0.5,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                AppHaptics.light();
                if (isBelow && onOpenRecovery) {
                  onOpenRecovery(subject);
                } else if (onOpenSimulator) {
                  onOpenSimulator(subject);
                }
              }}
            >
              {isBelow ? (
                <ShieldAlert size={14} color={colors.crimson} />
              ) : (
                <SlidersHorizontal size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Row 2: Edit Course & Timetable / Logs / Delete */}
          <View style={[styles.secondaryDrawerActions, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.utilityBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
              activeOpacity={0.75}
              onPress={handleOpenEdit}
            >
              <Edit3 size={12} color={colors.accent} />
              <Text style={[styles.utilityBtnText, { color: colors.accent }]}>
                Edit Course & Schedule ({subjectSlots.length})
              </Text>
            </TouchableOpacity>

            {onOpenPastHistory && (
              <TouchableOpacity
                style={[styles.utilityBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, flex: 0.45 }]}
                activeOpacity={0.75}
                onPress={() => {
                  AppHaptics.light();
                  onOpenPastHistory(subject);
                }}
              >
                <History size={12} color={colors.textSecondary} />
                <Text style={[styles.utilityBtnText, { color: colors.textSecondary }]}>Logs</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.utilityBtn,
                {
                  backgroundColor: colors.crimsonSubtle,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(200, 92, 92, 0.2)',
                  flex: 0.45,
                },
              ]}
              activeOpacity={0.75}
              onPress={handleDelete}
            >
              <Trash2 size={12} color={colors.crimson} />
              <Text style={[styles.utilityBtnText, { color: colors.crimson }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── FULL COURSE & TIMETABLE EDIT MODAL ──────────────────────── */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Edit {subject.code}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textTertiary }]} numberOfLines={1}>
                  {subject.name}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsEditModalOpen(false)}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={[styles.tabSwitcher, { backgroundColor: colors.surfaceSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.tabSwitcherBtn,
                  activeEditTab === 'DETAILS' && [
                    styles.tabSwitcherBtnActive,
                    { backgroundColor: colors.surfaceElevated },
                  ],
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setActiveEditTab('DETAILS');
                }}
              >
                <BookOpen size={12} color={activeEditTab === 'DETAILS' ? colors.accent : colors.textTertiary} />
                <Text
                  style={[
                    styles.tabSwitcherText,
                    { color: colors.textTertiary },
                    activeEditTab === 'DETAILS' && { color: colors.textPrimary, fontWeight: 'bold' },
                  ]}
                >
                  Course Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabSwitcherBtn,
                  activeEditTab === 'TIMETABLE' && [
                    styles.tabSwitcherBtnActive,
                    { backgroundColor: colors.surfaceElevated },
                  ],
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setActiveEditTab('TIMETABLE');
                }}
              >
                <Calendar size={12} color={activeEditTab === 'TIMETABLE' ? colors.accent : colors.textTertiary} />
                <Text
                  style={[
                    styles.tabSwitcherText,
                    { color: colors.textTertiary },
                    activeEditTab === 'TIMETABLE' && { color: colors.textPrimary, fontWeight: 'bold' },
                  ]}
                >
                  Schedule ({subjectSlots.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: THEME.spacing.lg }} showsVerticalScrollIndicator={false}>
              {activeEditTab === 'DETAILS' ? (
                /* TAB 1: COURSE DETAILS */
                <View>
                  {/* Course Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE NAME</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="e.g. Operating Systems"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  {/* Course Code & Target % */}
                  <View style={styles.twoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COURSE CODE</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={editCode}
                        onChangeText={setEditCode}
                        autoCapitalize="characters"
                        placeholder="e.g. BCS-301"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TARGET ATTENDANCE %</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={editTarget}
                        onChangeText={setEditTarget}
                        keyboardType="numeric"
                        placeholder="75"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Category Pills */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(['Theory', 'Lab', 'Practical', 'Tutorial', 'Elective'] as SubjectType[]).map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.catPill,
                            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                            editType === t && [styles.catPillActive, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }],
                          ]}
                          onPress={() => setEditType(t)}
                        >
                          <Text style={[styles.catPillText, { color: colors.textSecondary }, editType === t && { color: colors.accent }]}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Room & Faculty */}
                  <View style={styles.twoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ROOM NO.</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={editRoom}
                        onChangeText={setEditRoom}
                        placeholder="A-204"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>FACULTY (OPTIONAL)</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={editFaculty}
                        onChangeText={setEditFaculty}
                        placeholder="Dr. / Prof."
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Attendance Counts */}
                  <View style={[styles.countsBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.countsBoxTitle, { color: colors.textPrimary }]}>Attendance Numbers</Text>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CLASSES ATTENDED</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                          value={editAttended}
                          onChangeText={setEditAttended}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TOTAL HELD</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                          value={editTotal}
                          onChangeText={setEditTotal}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Save Details Button */}
                  <TouchableOpacity
                    style={[styles.saveSlotBtn, { backgroundColor: colors.textPrimary }]}
                    activeOpacity={0.85}
                    onPress={handleSaveCourseDetails}
                  >
                    <Text style={[styles.saveSlotBtnText, { color: colors.textInverse }]}>Save Course Details</Text>
                  </TouchableOpacity>

                  {/* Remove Course Option */}
                  <TouchableOpacity
                    style={[
                      styles.removeCourseModalBtn,
                      {
                        backgroundColor: colors.crimsonSubtle,
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(200, 92, 92, 0.25)',
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={handleDelete}
                  >
                    <Trash2 size={14} color={colors.crimson} />
                    <Text style={[styles.removeCourseModalText, { color: colors.crimson }]}>
                      Remove This Course
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* TAB 2: COURSE TIMETABLE SCHEDULE */
                <View>
                  {/* Current Assigned Slots */}
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                    CURRENTLY SCHEDULED PERIODS ({subjectSlots.length})
                  </Text>

                  {subjectSlots.length === 0 ? (
                    <View style={[styles.emptySlotsNotice, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                      <Calendar size={18} color={colors.textTertiary} />
                      <Text style={[styles.emptySlotsText, { color: colors.textTertiary }]}>
                        No timetable slots assigned yet. Add days and periods below:
                      </Text>
                    </View>
                  ) : (
                    subjectSlots.map(slot => (
                      <View
                        key={slot.id}
                        style={[styles.slotItemRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.slotDayBadge, { color: colors.accent }]}>{slot.day}</Text>
                            <Text style={[styles.slotTimeText, { color: colors.textPrimary }]}>
                              {slot.startTime} – {slot.endTime}
                            </Text>
                          </View>
                          <Text style={[styles.slotRoomText, { color: colors.textTertiary }]}>
                            {slot.room ? `Room ${slot.room}` : 'No room specified'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteSlotBtn}
                          onPress={() => handleDeleteSlot(slot.id)}
                        >
                          <Trash2 size={13} color={colors.crimson} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  {/* Divider */}
                  <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

                  {/* + Add New Period */}
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>+ ADD CLASS PERIOD</Text>

                  {/* Day Picker */}
                  <View style={styles.daySelectorRow}>
                    {DAYS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayChip,
                          { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                          newSlotDay === d && { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
                        ]}
                        onPress={() => {
                          AppHaptics.selection();
                          setNewSlotDay(d);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            { color: colors.textSecondary },
                            newSlotDay === d && { color: colors.accent, fontWeight: 'bold' },
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quick Time Presets */}
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 10 }]}>QUICK TIME SLOTS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {TIME_PRESETS.map(preset => (
                      <TouchableOpacity
                        key={preset.label}
                        style={[
                          styles.presetChip,
                          { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                          newSlotStart === preset.start &&
                            newSlotEnd === preset.end && {
                              backgroundColor: colors.surfaceElevated,
                              borderColor: colors.borderHighlight,
                            },
                        ]}
                        onPress={() => {
                          AppHaptics.selection();
                          setNewSlotStart(preset.start);
                          setNewSlotEnd(preset.end);
                        }}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            { color: colors.textTertiary },
                            newSlotStart === preset.start &&
                              newSlotEnd === preset.end && { color: colors.accent },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Custom Time */}
                  <View style={styles.twoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>START TIME</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={newSlotStart}
                        onChangeText={setNewSlotStart}
                        placeholder="09:30"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>END TIME</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                        value={newSlotEnd}
                        onChangeText={setNewSlotEnd}
                        placeholder="10:30"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Add Slot Button */}
                  <TouchableOpacity
                    style={[styles.addSlotBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight }]}
                    activeOpacity={0.8}
                    onPress={handleAddNewSlot}
                  >
                    <Plus size={13} color={colors.accent} />
                    <Text style={[styles.addSlotBtnText, { color: colors.accent }]}>
                      + Add Period to {newSlotDay}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  indexNumber: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    fontWeight: THEME.typography.weights.heavy,
    width: 22,
  },
  centerInfo: {
    flex: 1,
    paddingHorizontal: 6,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  labTag: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: THEME.borderRadius.pill,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  codeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
  },
  codeBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  facultySub: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.medium,
    flex: 1,
  },
  microTrack: {
    height: 3.5,
    borderRadius: 2,
    marginTop: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  microFill: {
    height: '100%',
    borderRadius: 2,
  },
  targetTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  rightStats: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  pctNumber: {
    fontSize: 13.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.4,
  },
  bufferBadgeCapsule: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: THEME.borderRadius.pill,
    marginTop: 2,
  },
  bufferBadge: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.1,
  },
  expandedDrawer: {
    paddingBottom: THEME.spacing.sm,
    paddingTop: THEME.spacing.xs,
  },
  drawerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  secondaryDrawerActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  utilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  utilityBtnText: {
    fontSize: 10,
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
  tabSwitcher: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.pill,
  },
  tabSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  tabSwitcherBtnActive: {},
  tabSwitcherText: {
    fontSize: 11,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  catPillActive: {},
  catPillText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
  },
  countsBox: {
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  countsBoxTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    marginBottom: 6,
  },
  saveSlotBtn: {
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  saveSlotBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
  emptySlotsNotice: {
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  emptySlotsText: {
    fontSize: 11,
    textAlign: 'center',
  },
  slotItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  slotDayBadge: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
  },
  slotTimeText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  slotRoomText: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteSlotBtn: {
    padding: 6,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 12,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
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
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 30,
  },
  addSlotBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  removeCourseModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.xl,
    borderWidth: 1,
    marginTop: -18,
    marginBottom: 30,
  },
  removeCourseModalText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
});
