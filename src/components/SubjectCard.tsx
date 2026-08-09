import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { THEME } from '../constants/theme';
import { Subject } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  attendanceBuffer,
  subjectRiskLevel,
} from '../utils/ipuEngine';
import {
  Check,
  X,
  SlidersHorizontal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

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
  const { markAttendance, profile } = useAttendance();
  const [isExpanded, setIsExpanded] = useState(false);

  const target = subject.targetRequirement || profile.targetAttendance || 75;
  const pct = attendancePercentage(subject.attended, subject.total);
  const buffer = attendanceBuffer(subject.attended, subject.total, target);
  const risk = subjectRiskLevel(subject.attended, subject.total, target);
  const isBelow = pct < target;

  const formattedIndex = (index + 1).toString().padStart(2, '0');
  const bufferDisplay = buffer >= 0 ? `+${buffer}` : `${buffer}`;

  const handleMark = (status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD') => {
    markAttendance(subject.id, status, {
      time: 'Quick Mark',
      room: subject.room,
    });
  };

  return (
    <View style={styles.rowContainer}>
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
        <Text style={styles.indexNumber}>{formattedIndex}</Text>

        {/* Course Info & Micro-Bar */}
        <View style={styles.centerInfo}>
          <View style={styles.titleLine}>
            <Text style={styles.subjectName} numberOfLines={1}>
              {subject.name.toUpperCase()}
            </Text>
            {subject.isLab2x && <Text style={styles.labTag}>LAB</Text>}
          </View>

          <Text style={styles.facultySub} numberOfLines={1}>
            {subject.code} · {subject.attended}/{subject.total} Classes {subject.room ? `· ${subject.room}` : ''}
          </Text>

          {/* Precision Micro-Bar */}
          <View style={styles.microTrack}>
            <View
              style={[
                styles.microFill,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: risk.color,
                },
              ]}
            />
            <View style={[styles.targetTick, { left: `${target}%` }]} />
          </View>
        </View>

        {/* Percentage & Buffer Number */}
        <View style={styles.rightStats}>
          <Text style={[styles.pctNumber, { color: isBelow ? THEME.colors.crimson : THEME.colors.textPrimary }]}>
            {pct.toFixed(1)}%
          </Text>
          <Text style={[styles.bufferBadge, { color: buffer >= 0 ? THEME.colors.emerald : THEME.colors.crimson }]}>
            {bufferDisplay}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Quick Controls */}
      {isExpanded && (
        <View style={styles.expandedDrawer}>
          <View style={styles.drawerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnPresent]}
              activeOpacity={0.75}
              onPress={() => handleMark('PRESENT')}
            >
              <Check size={14} color={THEME.colors.emerald} />
              <Text style={[styles.actionBtnText, { color: THEME.colors.emerald }]}>+ Attended</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnAbsent]}
              activeOpacity={0.75}
              onPress={() => handleMark('ABSENT')}
            >
              <X size={14} color={THEME.colors.crimson} />
              <Text style={[styles.actionBtnText, { color: THEME.colors.crimson }]}>− Missed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnOD]}
              activeOpacity={0.75}
              onPress={() => handleMark('OD')}
            >
              <Text style={[styles.actionBtnText, { color: THEME.colors.cyan }]}>OD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnSimulate]}
              activeOpacity={0.75}
              onPress={() => {
                AppHaptics.light();
                if (onOpenPastHistory) {
                  onOpenPastHistory(subject);
                } else if (isBelow && onOpenRecovery) {
                  onOpenRecovery(subject);
                } else if (onOpenSimulator) {
                  onOpenSimulator(subject);
                }
              }}
            >
              {isBelow ? (
                <ShieldAlert size={14} color={THEME.colors.crimson} />
              ) : (
                <SlidersHorizontal size={14} color={THEME.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    marginHorizontal: THEME.spacing.xl,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  indexNumber: {
    fontSize: THEME.typography.sizes.xs,
    fontFamily: 'monospace',
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.heavy,
    width: 26,
  },
  centerInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  labTag: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.gold,
    backgroundColor: THEME.colors.goldSubtle,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  facultySub: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  microTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  rightStats: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  pctNumber: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.3,
  },
  bufferBadge: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    fontFamily: 'monospace',
    marginTop: 2,
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
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
  },
  btnPresent: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: THEME.colors.emeraldSubtle,
  },
  btnAbsent: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: THEME.colors.crimsonSubtle,
  },
  btnOD: {
    borderColor: 'rgba(56, 189, 248, 0.25)',
    backgroundColor: THEME.colors.cyanSubtle,
    flex: 0.5,
  },
  btnSimulate: {
    borderColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.surfaceElevated,
    flex: 0.5,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
});
