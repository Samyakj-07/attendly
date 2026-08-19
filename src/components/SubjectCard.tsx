import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Animated,
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
  getLocalDateString,
  normalizeTimeString,
  isSlotMatchingRecord,
} from '../utils/ipuEngine';
import { MOTION } from '../utils/motion';
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

import { TIME_PRESETS } from '../constants/timetableConfig';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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
  const { colors } = useTheme();
  const {
    markAttendance,
    deleteSubject,
    updateSubject,
    timetable,
    records,
    addTimetableSlot,
    deleteTimetableSlot,
    profile,
    todayDay,
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
  const isUnstarted = subject.total === 0;
  const pct = attendancePercentage(subject.attended, subject.total);
  const buffer = attendanceBuffer(subject.attended, subject.total, target);
  const risk = subjectRiskLevel(subject.attended, subject.total, target);
  const isBelow = !isUnstarted && pct < target;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: isUnstarted ? 0 : Math.min(100, pct),
      duration: 650,
      easing: MOTION.easing.easeOut,
      useNativeDriver: false,
    }).start();
  }, [pct, isUnstarted]);

  const animatedProgressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const formattedIndex = (index + 1).toString().padStart(2, '0');
  const bufferDisplay = isUnstarted ? 'New' : buffer >= 0 ? `+${buffer}` : `${buffer}`;

  // Subject's timetable slots
  const subjectSlots = timetable
    .filter(t => t.subjectId === subject.id)
    .sort((a, b) => a.day.localeCompare(b.day) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const scheduledDays = Array.from(new Set(subjectSlots.map(s => s.day))).join(', ');

  const handleMark = (status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD') => {
    const todaySlotsForSub = subjectSlots.filter(s => s.day === todayDay);
    const todayDateStr = getLocalDateString();

    // Find first slot for today that doesn't have an attendance record logged yet
    const unmarkedSlot = todaySlotsForSub.find(slot => {
      const normStart = normalizeTimeString(slot.startTime);
      const normEnd = normalizeTimeString(slot.endTime);
      return !records.some(
        r =>
          r.subjectId === subject.id &&
          r.date === todayDateStr &&
          isSlotMatchingRecord(r.slotTime, r.note, normStart, normEnd, slot.day)
      );
    });

    const targetSlot = unmarkedSlot;

    if (targetSlot) {
      markAttendance(subject.id, status, {
        time: `${targetSlot.startTime} - ${targetSlot.endTime}`,
        room: targetSlot.room || subject.room,
        note: `Timetable: ${targetSlot.day} (${targetSlot.startTime})`,
      });
    } else if (todaySlotsForSub.length > 0) {
      // All scheduled slots for today are already marked
      AppHaptics.warning();
      Alert.alert(
        'All Scheduled Classes Marked',
        `All scheduled classes for "${subject.name}" today (${todayDay}) are already marked.\n\nTo log an additional unscheduled session, use "+ Extra Class" on the Home tab.`,
        [{ text: 'OK' }]
      );
    } else {
      markAttendance(subject.id, status, {
        time: 'Quick Mark',
        room: subject.room,
      });
    }
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
      room: editRoom.trim() || subject.room || 'A-204',
      faculty: editFaculty.trim() || subject.faculty || '',
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
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: isExpanded ? colors.navy : colors.border,
          shadowColor: '#141820',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardHeaderArea}
        activeOpacity={0.8}
        onPress={() => {
          AppHaptics.light();
          setIsExpanded(!isExpanded);
          onPressCard?.();
        }}
      >
        {/* Top Header Row: Index + Name vs Percentage */}
        <View style={styles.topIdentityRow}>
          <View style={styles.leftIdentityBlock}>
            <View style={styles.indexCodeRow}>
              <Text style={[styles.indexNumberText, { color: colors.textTertiary }]}>{formattedIndex}</Text>
              <View style={[styles.codeBadge, { backgroundColor: colors.softBlue, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.codeBadgeText, { color: colors.navy }]}>{subject.code}</Text>
              </View>
              {subject.isLab2x && (
                <View style={[styles.labBadge, { backgroundColor: colors.amberSubtle, borderColor: colors.amber }]}>
                  <Text style={[styles.labBadgeText, { color: colors.amber }]}>LAB 2X</Text>
                </View>
              )}
            </View>

            <Text style={[styles.subjectNameText, { color: colors.textPrimary }]} numberOfLines={1}>
              {subject.name}
            </Text>

            <Text style={[styles.subjectMetaText, { color: colors.textSecondary }]}>
              {subject.type} · Room {subject.room || 'A-204'}{subject.faculty ? ` · ${subject.faculty}` : ''}{scheduledDays ? ` · ${scheduledDays}` : ''}
            </Text>
          </View>

          {/* Right Metrics Block */}
          <View style={styles.rightMetricsBlock}>
            <Text style={[styles.pctNumberText, { color: isUnstarted ? colors.textTertiary : isBelow ? colors.crimson : colors.textPrimary }]}>
              {isUnstarted ? '—' : `${pct.toFixed(1)}%`}
            </Text>
            <View
              style={[
                styles.bufferBadgeCapsule,
                {
                  backgroundColor: isUnstarted
                    ? colors.backgroundSecondary
                    : buffer >= 0
                    ? colors.emeraldSubtle
                    : colors.crimsonSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.bufferBadgeText,
                  {
                    color: isUnstarted
                      ? colors.textTertiary
                      : buffer >= 0
                      ? colors.emerald
                      : colors.crimson,
                  },
                ]}
              >
                {isUnstarted ? 'New' : buffer >= 0 ? `+${buffer} safe` : `${buffer} deficit`}
              </Text>
            </View>
          </View>
        </View>

        {/* Full-Width "The Attenly Line" Progress Track */}
        <View style={styles.trackSection}>
          <View style={[styles.trackBase, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.trackFill,
                {
                  width: animatedProgressWidth,
                  backgroundColor: isUnstarted ? colors.border : risk.color,
                },
              ]}
            />
            {/* Target 75% Notch */}
            <View
              style={[
                styles.trackTargetPin,
                {
                  left: `${target}%`,
                  backgroundColor: colors.navy,
                },
              ]}
            />
          </View>

          <View style={styles.trackLabelsRow}>
            <Text style={[styles.trackSubLabel, { color: colors.textTertiary }]}>
              {subject.attended} / {subject.total} attended
            </Text>
            <Text style={[styles.trackSubLabel, { color: colors.textSecondary }]}>
              {target}% Target
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 1-Tap Attendance & Quick Action Controls */}
      <View style={[styles.actionSection, { borderTopColor: colors.border }]}>
        {/* Row 1: Direct Attendance Logging */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.emeraldSubtle,
                borderColor: 'rgba(22, 115, 74, 0.25)',
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${subject.name} present`}
            onPress={() => handleMark('PRESENT')}
          >
            <Check size={13} color={colors.emerald} strokeWidth={2.5} />
            <Text style={[styles.actionBtnText, { color: colors.emerald }]}>+ Attended</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.crimsonSubtle,
                borderColor: 'rgba(180, 35, 24, 0.25)',
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${subject.name} absent`}
            onPress={() => handleMark('ABSENT')}
          >
            <X size={13} color={colors.crimson} strokeWidth={2.5} />
            <Text style={[styles.actionBtnText, { color: colors.crimson }]}>− Missed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                flex: 0.75,
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${subject.name} class cancelled`}
            onPress={() => handleMark('CANCELLED')}
          >
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>No Class</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtnIconOnly,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={isBelow ? "Open Attendance Recovery Roadmap" : "Open What-If Simulator"}
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

        {/* Row 2: Secondary Course Management Strip */}
        {isExpanded && (
          <View style={[styles.expandedDrawer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.utilityBtn, { backgroundColor: colors.softBlue, borderColor: colors.borderSubtle }]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Edit course and schedule for ${subject.name}`}
              onPress={handleOpenEdit}
            >
              <Edit3 size={12} color={colors.navy} />
              <Text style={[styles.utilityBtnText, { color: colors.navy }]}>
                Edit Course & Schedule ({subjectSlots.length})
              </Text>
            </TouchableOpacity>

            {onOpenPastHistory && (
              <TouchableOpacity
                style={[styles.utilityBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, flex: 0.4 }]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`View attendance logs for ${subject.name}`}
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
                  borderColor: 'rgba(180, 35, 24, 0.2)',
                  flex: 0.4,
                },
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Remove course ${subject.name}`}
              onPress={handleDelete}
            >
              <Trash2 size={12} color={colors.crimson} />
              <Text style={[styles.utilityBtnText, { color: colors.crimson }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── FULL COURSE & TIMETABLE EDIT MODAL ──────────────────────── */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
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
                accessibilityRole="button"
                accessibilityLabel="Close edit modal"
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
                        borderColor: 'rgba(200, 92, 92, 0.25)',
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
                          accessibilityRole="button"
                          accessibilityLabel={`Delete timetable slot for ${slot.day} at ${slot.startTime}`}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.md,
    overflow: 'hidden',
  },
  cardHeaderArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftIdentityBlock: {
    flex: 1,
  },
  indexCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  indexNumberText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: THEME.typography.weights.heavy,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
  },
  codeBadgeText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  labBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
  },
  labBadgeText: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
  },
  subjectNameText: {
    fontSize: 16,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  subjectMetaText: {
    fontSize: 11.5,
    fontWeight: THEME.typography.weights.medium,
    lineHeight: 16,
  },
  rightMetricsBlock: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  pctNumberText: {
    fontSize: 20,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.5,
  },
  bufferBadgeCapsule: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginTop: 3,
  },
  bufferBadgeText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.1,
  },
  trackSection: {
    marginTop: 12,
  },
  trackBase: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  trackTargetPin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  trackLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  trackSubLabel: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.medium,
  },
  actionSection: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  actionBtnIconOnly: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  expandedDrawer: {
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
