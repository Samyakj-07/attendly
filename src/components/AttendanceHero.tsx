import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { KineticAttendanceRing } from './KineticAttendanceRing';
import { AnimatedNumber } from './AnimatedNumber';
import { predictInternalMarks } from '../utils/ipuEngine';
import { AppHaptics } from '../utils/haptics';

interface AttendanceHeroProps {
  onOpenSimulator?: () => void;
  onOpenMarks?: () => void;
}

export const AttendanceHero: React.FC<AttendanceHeroProps> = ({
  onOpenSimulator,
  onOpenMarks,
}) => {
  const { overallPercentage, overallBuffer, totalAttended, totalClasses, profile } =
    useAttendance();

  const target = profile.targetAttendance || 75;
  const isHealthy = overallPercentage >= target;
  const isWatch = overallPercentage >= target && overallBuffer <= 1;
  const isCritical = overallPercentage < target;

  const marksInfo = predictInternalMarks(overallPercentage);

  let statusLabel = 'HEALTHY';
  let statusColor = THEME.colors.emerald;

  if (isCritical) {
    statusLabel = 'CRITICAL';
    statusColor = THEME.colors.crimson;
  } else if (isWatch) {
    statusLabel = 'WATCH LIST';
    statusColor = THEME.colors.amber;
  } else if (overallPercentage >= 88) {
    statusLabel = 'SAFE';
    statusColor = THEME.colors.emerald;
  }

  const bufferText =
    overallBuffer >= 0
      ? `+${overallBuffer} classes of buffer`
      : `−${Math.abs(overallBuffer)} classes needed to pass`;

  return (
    <TouchableOpacity
      style={styles.heroContainer}
      activeOpacity={0.9}
      onPress={() => {
        AppHaptics.light();
        onOpenSimulator?.();
      }}
    >
      {/* Central Kinetic Ring & Massive Display Number */}
      <View style={styles.ringCenterWrapper}>
        <KineticAttendanceRing
          percentage={overallPercentage}
          target={target}
          size={230}
          strokeWidth={3.5}
          statusColor={statusColor}
        />

        <View style={styles.numberOverlay}>
          <View style={styles.percentRow}>
            <AnimatedNumber
              value={overallPercentage}
              decimals={1}
              style={styles.displayPercentage}
            />
            <Text style={styles.percentSymbol}>%</Text>
          </View>

          <View style={[styles.statusChip, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <Text style={styles.bufferText}>{bufferText}</Text>
        </View>
      </View>

      {/* Minimal Open-Space Data Signals */}
      <View style={styles.signalsRow}>
        <View style={styles.signalItem}>
          <Text style={styles.signalValue}>
            {totalAttended} <Text style={styles.signalTotal}>/ {totalClasses}</Text>
          </Text>
          <Text style={styles.signalLabel}>ATTENDED</Text>
        </View>

        <View style={styles.signalDivider} />

        <TouchableOpacity
          style={styles.signalItem}
          activeOpacity={0.7}
          onPress={() => {
            AppHaptics.light();
            onOpenMarks?.();
          }}
        >
          <Text style={[styles.signalValue, { color: THEME.colors.gold }]}>
            {marksInfo.marks} <Text style={styles.signalTotal}>/ 5</Text>
          </Text>
          <Text style={styles.signalLabel}>INTERNAL MARKS</Text>
        </TouchableOpacity>

        <View style={styles.signalDivider} />

        <View style={styles.signalItem}>
          <Text style={styles.signalValue}>{target}%</Text>
          <Text style={styles.signalLabel}>IPU TARGET</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    alignItems: 'center',
  },
  ringCenterWrapper: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  numberOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  displayPercentage: {
    fontSize: 54,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  percentSymbol: {
    fontSize: 22,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.textTertiary,
    marginLeft: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  bufferText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  signalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: THEME.spacing.sm,
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  signalItem: {
    flex: 1,
    alignItems: 'center',
  },
  signalValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  signalTotal: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.regular,
  },
  signalLabel: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  signalDivider: {
    width: 1,
    height: 18,
    backgroundColor: THEME.colors.borderSubtle,
  },
});
