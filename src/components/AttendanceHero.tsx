import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
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
  const { colors, isDark } = useTheme();
  const { overallPercentage, overallBuffer, totalAttended, totalClasses, profile } =
    useAttendance();

  const target = profile.targetAttendance || 75;
  const isHealthy = overallPercentage >= target;
  const isWatch = overallPercentage >= target && overallBuffer <= 1;
  const isCritical = overallPercentage < target;

  const marksInfo = predictInternalMarks(overallPercentage);

  let statusLabel = 'HEALTHY';
  let statusColor = colors.emerald;

  if (totalClasses === 0) {
    statusLabel = 'READY';
    statusColor = colors.accent;
  } else if (isCritical) {
    statusLabel = 'CRITICAL';
    statusColor = colors.crimson;
  } else if (isWatch) {
    statusLabel = 'WATCH LIST';
    statusColor = colors.amber;
  } else if (overallPercentage >= 88) {
    statusLabel = 'SAFE';
    statusColor = colors.emerald;
  }

  const bufferText =
    totalClasses === 0
      ? '0 Classes Logged · On Track'
      : overallBuffer >= 0
      ? `+${overallBuffer} classes of buffer`
      : `−${Math.abs(overallBuffer)} classes needed to pass`;

  return (
    <View style={styles.heroOuterWrapper}>
      <TouchableOpacity
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            shadowColor: statusColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 24,
            elevation: 8,
          },
        ]}
        activeOpacity={0.92}
        onPress={() => {
          AppHaptics.light();
          onOpenSimulator?.();
        }}
      >
        {/* Ambient Aura Background Glow */}
        <View
          style={[
            styles.ambientAura,
            {
              backgroundColor: statusColor,
              opacity: isDark ? 0.07 : 0.04,
            },
          ]}
        />

        {/* Central Kinetic Ring & Display Number */}
        <View style={styles.ringCenterWrapper}>
          <KineticAttendanceRing
            percentage={overallPercentage}
            target={target}
            size={220}
            strokeWidth={4.5}
            statusColor={statusColor}
          />

          <View style={styles.numberOverlay}>
            <View style={styles.percentRow}>
              <AnimatedNumber
                value={overallPercentage}
                decimals={1}
                style={[styles.displayPercentage, { color: colors.textPrimary }]}
              />
              <Text style={[styles.percentSymbol, { color: colors.textTertiary }]}>%</Text>
            </View>

            <View style={[styles.statusChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : colors.surfaceSubtle, borderColor: statusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <Text style={[styles.bufferText, { color: colors.textSecondary }]}>{bufferText}</Text>
          </View>
        </View>

        {/* Tri-Pillar Bento Glass Bar */}
        <View style={[styles.signalsRow, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.signalItem}>
            <Text style={[styles.signalValue, { color: colors.textPrimary }]}>
              {totalAttended} <Text style={[styles.signalTotal, { color: colors.textTertiary }]}>/ {totalClasses}</Text>
            </Text>
            <Text style={[styles.signalLabel, { color: colors.textTertiary }]}>ATTENDED</Text>
          </View>

          <View style={[styles.signalDivider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity
            style={styles.signalItem}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              onOpenMarks?.();
            }}
          >
            <Text style={[styles.signalValue, { color: colors.gold }]}>
              {marksInfo.marks} <Text style={[styles.signalTotal, { color: colors.textTertiary }]}>/ 5</Text>
            </Text>
            <Text style={[styles.signalLabel, { color: colors.textTertiary }]}>INTERNAL MARKS</Text>
          </TouchableOpacity>

          <View style={[styles.signalDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.signalItem}>
            <Text style={[styles.signalValue, { color: colors.textPrimary }]}>{target}%</Text>
            <Text style={[styles.signalLabel, { color: colors.textTertiary }]}>TARGET</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  heroOuterWrapper: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.xs,
    paddingBottom: THEME.spacing.sm,
  },
  heroCard: {
    borderRadius: THEME.borderRadius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    paddingTop: THEME.spacing.md,
  },
  ambientAura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 20,
    alignSelf: 'center',
  },
  ringCenterWrapper: {
    width: 220,
    height: 220,
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
    fontSize: 50,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -1.8,
    lineHeight: 54,
  },
  percentSymbol: {
    fontSize: 20,
    fontWeight: THEME.typography.weights.semibold,
    marginLeft: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    marginTop: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  bufferText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.semibold,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  signalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
  },
  signalItem: {
    flex: 1,
    alignItems: 'center',
  },
  signalValue: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.3,
  },
  signalTotal: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.regular,
  },
  signalLabel: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  signalDivider: {
    width: 1,
    height: 18,
  },
});
