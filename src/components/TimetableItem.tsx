import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { TimetableSlot, Subject } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import { attendancePercentage, subjectRiskLevel } from '../utils/ipuEngine';
import { Check, X, ShieldAlert } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

interface TimetableItemProps {
  slot: TimetableSlot;
  subject?: Subject;
  showActions?: boolean;
}

export const TimetableItem: React.FC<TimetableItemProps> = ({
  slot,
  subject,
  showActions = true,
}) => {
  const { markAttendance, profile } = useAttendance();

  // Determine if this class is happening right NOW
  const isOngoingNow = (() => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMins;

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const startTotal = (startH || 0) * 60 + (startM || 0);
    const endTotal = (endH || 0) * 60 + (endM || 0);

    return currentTotalMins >= startTotal && currentTotalMins <= endTotal;
  })();

  const target = subject?.targetRequirement || profile.targetAttendance || 75;
  const pct = subject ? attendancePercentage(subject.attended, subject.total) : 100;
  const risk = subject ? subjectRiskLevel(subject.attended, subject.total, target) : null;
  const isCritical = pct < target;

  const handleMark = (status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD') => {
    markAttendance(slot.subjectId, status, {
      time: `${slot.startTime} - ${slot.endTime}`,
      room: slot.room,
      note: `Timetable: ${slot.day}`,
    });
  };

  return (
    <View style={styles.timelineRow}>
      {/* 1. Left Time Column */}
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, isOngoingNow && styles.timeTextActive]}>
          {slot.startTime}
        </Text>
        <Text style={styles.endTimeSub}>{slot.endTime}</Text>
      </View>

      {/* 2. Timeline Line & Status Indicator Dot */}
      <View style={styles.lineTrackColumn}>
        <View
          style={[
            styles.timelineDot,
            isOngoingNow && styles.timelineDotNow,
            isCritical && styles.timelineDotCritical,
          ]}
        />
        <View style={styles.verticalLine} />
      </View>

      {/* 3. Class Card / Information Box */}
      <View
        style={[
          styles.classContentBox,
          isOngoingNow && styles.classContentBoxNow,
          isCritical && styles.classContentBoxCritical,
        ]}
      >
        {isOngoingNow && (
          <View style={styles.nowBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.nowBadgeText}>NOW</Text>
          </View>
        )}

        <View style={styles.classHeader}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={styles.courseName} numberOfLines={1}>
              {slot.subjectName}
            </Text>
            <Text style={styles.roomFacultyText}>
              Room {slot.room || 'A-204'} · {slot.faculty || subject?.faculty || 'Faculty'}
            </Text>
          </View>

          {subject && (
            <View style={styles.pctBox}>
              <Text
                style={[
                  styles.pctText,
                  { color: isCritical ? THEME.colors.crimson : THEME.colors.textPrimary },
                ]}
              >
                {pct.toFixed(1)}%
              </Text>
              {isCritical && <ShieldAlert size={11} color={THEME.colors.crimson} />}
            </View>
          )}
        </View>

        {/* 1-Tap Attendance Buttons */}
        {showActions && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnMark, styles.btnPresent]}
              activeOpacity={0.7}
              onPress={() => handleMark('PRESENT')}
            >
              <Check size={13} color={THEME.colors.emerald} />
              <Text style={[styles.btnText, { color: THEME.colors.emerald }]}>Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnMark, styles.btnAbsent]}
              activeOpacity={0.7}
              onPress={() => handleMark('ABSENT')}
            >
              <X size={13} color={THEME.colors.crimson} />
              <Text style={[styles.btnText, { color: THEME.colors.crimson }]}>Absent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnMark, styles.btnOD]}
              activeOpacity={0.7}
              onPress={() => handleMark('OD')}
            >
              <Text style={[styles.btnText, { color: THEME.colors.cyan }]}>OD</Text>
            </TouchableOpacity>
          </View>
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
    color: THEME.colors.textSecondary,
  },
  timeTextActive: {
    color: THEME.colors.cyan,
    fontWeight: THEME.typography.weights.heavy,
  },
  endTimeSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: THEME.colors.textTertiary,
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
    backgroundColor: THEME.colors.textTertiary,
    marginTop: 5,
    zIndex: 2,
  },
  timelineDotNow: {
    backgroundColor: THEME.colors.cyan,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  timelineDotCritical: {
    backgroundColor: THEME.colors.crimson,
  },
  verticalLine: {
    flex: 1,
    width: 1,
    backgroundColor: THEME.colors.borderSubtle,
    marginTop: 4,
    marginBottom: -4,
  },
  classContentBox: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  classContentBoxNow: {
    borderColor: THEME.colors.borderHighlight,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  classContentBoxCritical: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cyanSubtle,
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
    backgroundColor: THEME.colors.cyan,
  },
  nowBadgeText: {
    color: THEME.colors.cyan,
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
    color: THEME.colors.textPrimary,
  },
  roomFacultyText: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  pctBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pctText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  btnMark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  btnPresent: {
    backgroundColor: THEME.colors.emeraldSubtle,
  },
  btnAbsent: {
    backgroundColor: THEME.colors.crimsonSubtle,
  },
  btnOD: {
    backgroundColor: THEME.colors.cyanSubtle,
    flex: 0.6,
  },
  btnText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
});
