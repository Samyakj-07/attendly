import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TimetableSlot, Subject, AttendanceStatus } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  subjectRiskLevel,
  timeToMinutes,
  isSlotMatchingRecord,
  getLocalDateString,
} from '../utils/ipuEngine';
import { Check, X, ShieldAlert, Sparkles, Clock, Calendar } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { MOTION } from '../utils/motion';

interface TimetableItemProps {
  slot: TimetableSlot;
  subject?: Subject;
  showActions?: boolean;
  targetDateStr?: string;
  isPastDay?: boolean;
  isToday?: boolean;
  isFutureDay?: boolean;
}

export const TimetableItem: React.FC<TimetableItemProps> = ({
  slot,
  subject,
  showActions = true,
  targetDateStr,
  isPastDay,
  isToday,
  isFutureDay,
}) => {
  const { colors } = useTheme();
  const { markAttendance, editAttendanceRecord, records, profile } = useAttendance();

  const todayIso = getLocalDateString();
  const activeDateStr = targetDateStr || todayIso;
  const isCurrentDay = isToday !== undefined ? isToday : activeDateStr === todayIso;
  const isFuture = isFutureDay !== undefined ? isFutureDay : activeDateStr > todayIso;

  // Pulse animation for ongoing class
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Determine if this class is happening right NOW (only applicable if viewing today)
  const isOngoingNow = (() => {
    if (!isCurrentDay) return false;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMins;

    const startTotal = timeToMinutes(slot.startTime);
    const endTotal = timeToMinutes(slot.endTime);

    return currentTotalMins >= startTotal && currentTotalMins <= endTotal;
  })();

  useEffect(() => {
    if (isOngoingNow) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 900,
            easing: MOTION.easing.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: MOTION.easing.easeInOut,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isOngoingNow]);

  // Check if this slot was already marked for this specific active date and time
  const slotRecord = records.find(
    r =>
      r.subjectId === slot.subjectId &&
      r.date === activeDateStr &&
      isSlotMatchingRecord(r.slotTime, r.note, slot.startTime, slot.endTime, slot.day)
  );

  const target = subject?.targetRequirement || profile.targetAttendance || 75;
  const pct = subject ? attendancePercentage(subject.attended, subject.total) : 100;
  const risk = subject ? subjectRiskLevel(subject.attended, subject.total, target) : null;
  const isCritical = pct < target;

  const handleMark = (status: AttendanceStatus) => {
    if (isFuture) {
      AppHaptics.warning();
      return;
    }
    if (slotRecord) {
      if (slotRecord.status === status) {
        AppHaptics.light();
        return; // Already marked with this status
      }
      AppHaptics.selection();
      editAttendanceRecord(slotRecord.id, status);
    } else {
      markAttendance(slot.subjectId, status, {
        date: activeDateStr,
        time: `${slot.startTime} - ${slot.endTime}`,
        room: slot.room,
        note: `Timetable: ${slot.day} (${slot.startTime})`,
      });
    }
  };

  const isMarkedPresent = slotRecord?.status === 'PRESENT';
  const isMarkedAbsent = slotRecord?.status === 'ABSENT';
  const isMarkedCancelled = slotRecord?.status === 'CANCELLED';

  return (
    <View style={styles.timelineRow}>
      {/* 1. Left Time Column */}
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: isOngoingNow ? colors.accent : colors.textSecondary }]}>
          {slot.startTime}
        </Text>
        <Text style={[styles.endTimeSub, { color: colors.textTertiary }]}>{slot.endTime}</Text>
      </View>

      {/* 2. Timeline Line & Status Indicator Dot */}
      <View style={styles.lineTrackColumn}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: colors.textTertiary },
            isOngoingNow && [styles.timelineDotNow, { backgroundColor: colors.accent }],
            isMarkedPresent && { backgroundColor: colors.emerald },
            isMarkedAbsent && { backgroundColor: colors.crimson },
            isMarkedCancelled && { backgroundColor: colors.textSecondary },
            isCritical && !slotRecord && { backgroundColor: colors.crimson },
          ]}
        />
        <View style={[styles.verticalLine, { backgroundColor: colors.borderSubtle }]} />
      </View>

      {/* 3. Class Card / Information Box */}
      <View
        style={[
          styles.classContentBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          isOngoingNow && {
            borderColor: colors.borderHighlight,
            backgroundColor: colors.softBlue,
          },
          isMarkedPresent && {
            borderColor: 'rgba(22, 115, 74, 0.25)',
          },
          isMarkedAbsent && {
            borderColor: 'rgba(180, 35, 24, 0.25)',
          },
          isMarkedCancelled && {
            borderColor: colors.borderSubtle,
            opacity: 0.85,
          },
        ]}
      >
        {isOngoingNow && (
          <View style={[styles.nowBadge, { backgroundColor: colors.softBlue }]}>
            <Animated.View style={[styles.pulseDot, { backgroundColor: colors.accent, transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.nowBadgeText, { color: colors.navy }]}>NOW</Text>
          </View>
        )}

        <View style={styles.classHeader}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                {slot.subjectName}
              </Text>
              {slot.subjectCode ? (
                <View style={[styles.slotCodeBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.slotCodeText, { color: colors.accent }]}>{slot.subjectCode}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.roomFacultyText, { color: colors.textTertiary }]}>
              Room {slot.room || 'A-204'}{slot.faculty || subject?.faculty ? ` · ${slot.faculty || subject?.faculty}` : ''}
            </Text>
          </View>

          {subject && (
            <View style={[styles.pctBox, { backgroundColor: isCritical ? colors.crimsonSubtle : colors.surfaceSubtle }]}>
              <Text
                style={[
                  styles.pctText,
                  { color: isCritical ? colors.crimson : colors.textPrimary },
                ]}
              >
                {pct.toFixed(1)}%
              </Text>
              {isCritical && <ShieldAlert size={11} color={colors.crimson} />}
            </View>
          )}
        </View>

        {/* 1-Tap Attendance Buttons (State-Aware to prevent duplicate marks, or Upcoming Banner for future days) */}
        {showActions && (
          isFuture ? (
            <View style={[styles.futureRow, { borderTopColor: colors.borderSubtle }]}>
              <Clock size={11} color={colors.accent} />
              <Text style={[styles.futureText, { color: colors.textTertiary }]}>
                Upcoming · Scheduled for {slot.day}
              </Text>
            </View>
          ) : (
            <View style={[styles.actionRow, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.btnMark,
                  { backgroundColor: colors.emeraldSubtle, borderColor: 'rgba(22, 163, 74, 0.2)', borderWidth: 1 },
                  isMarkedPresent && {
                    backgroundColor: colors.emerald,
                    borderColor: colors.emerald,
                  },
                ]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${slot.subjectName} as present`}
                onPress={() => handleMark('PRESENT')}
              >
                <Check size={12} color={isMarkedPresent ? colors.textInverse : colors.emerald} />
                <Text
                  style={[
                    styles.btnText,
                    { color: isMarkedPresent ? colors.textInverse : colors.emerald },
                    isMarkedPresent && { fontWeight: '900' },
                  ]}
                >
                  {isMarkedPresent ? 'Present ✓' : 'Present'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnMark,
                  { backgroundColor: colors.crimsonSubtle, borderColor: 'rgba(220, 38, 38, 0.2)', borderWidth: 1 },
                  isMarkedAbsent && {
                    backgroundColor: colors.crimson,
                    borderColor: colors.crimson,
                  },
                ]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${slot.subjectName} as absent`}
                onPress={() => handleMark('ABSENT')}
              >
                <X size={12} color={isMarkedAbsent ? colors.textInverse : colors.crimson} />
                <Text
                  style={[
                    styles.btnText,
                    { color: isMarkedAbsent ? colors.textInverse : colors.crimson },
                    isMarkedAbsent && { fontWeight: '900' },
                  ]}
                >
                  {isMarkedAbsent ? 'Absent ✗' : 'Absent'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnMark,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderWidth: 1, flex: 0.8 },
                  isMarkedCancelled && {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.textPrimary,
                  },
                ]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${slot.subjectName} as cancelled or no class`}
                onPress={() => handleMark('CANCELLED')}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: isMarkedCancelled ? colors.textPrimary : colors.textTertiary },
                    isMarkedCancelled && { fontWeight: '900' },
                  ]}
                >
                  {isMarkedCancelled ? 'No Class ✓' : 'No Class'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.xl,
    minHeight: 88,
  },
  timeColumn: {
    width: 48,
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  timeText: {
    fontSize: THEME.typography.sizes.xs,
    fontFamily: 'monospace',
    fontWeight: THEME.typography.weights.bold,
  },
  endTimeSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  lineTrackColumn: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
    zIndex: 2,
  },
  timelineDotNow: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  verticalLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  classContentBox: {
    flex: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 6,
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nowBadgeText: {
    fontSize: 8,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  courseName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  roomFacultyText: {
    fontSize: 11,
    marginTop: 2,
  },
  slotCodeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
  },
  slotCodeText: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  pctBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  pctText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  btnMark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.xs,
  },
  btnText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  futureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  futureText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.medium,
  },
});
