import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { AnimatedNumber } from './AnimatedNumber';
import { predictInternalMarks } from '../utils/ipuEngine';
import { AppHaptics } from '../utils/haptics';
import { MOTION } from '../utils/motion';

interface AttendanceHeroProps {
  onOpenSimulator?: () => void;
  onOpenMarks?: () => void;
}

export const AttendanceHero: React.FC<AttendanceHeroProps> = ({
  onOpenSimulator,
  onOpenMarks,
}) => {
  const { colors } = useTheme();
  const { overallPercentage, overallBuffer, totalAttended, totalClasses, profile } =
    useAttendance();

  const target = profile.targetAttendance || 75;
  const isCritical = overallPercentage < target;
  const isWatch = overallPercentage >= target && overallBuffer <= 1;

  const marksInfo = predictInternalMarks(overallPercentage);

  let statusLabel = 'Healthy';
  let statusDotColor = colors.emerald;

  if (totalClasses === 0) {
    statusLabel = 'Initializing';
    statusDotColor = colors.accent;
  } else if (isCritical) {
    statusLabel = 'Critical';
    statusDotColor = colors.crimson;
  } else if (isWatch) {
    statusLabel = 'Watch List';
    statusDotColor = colors.amber;
  } else if (overallPercentage >= 88) {
    statusLabel = 'Safe';
    statusDotColor = colors.emerald;
  }

  const deltaFromTarget = (overallPercentage - target).toFixed(1);
  const deltaText =
    totalClasses === 0
      ? '0 classes logged'
      : overallPercentage >= target
      ? `+${deltaFromTarget}% above target`
      : `${deltaFromTarget}% below target`;

  const clampedPct = Math.min(100, Math.max(0, overallPercentage));

  // Animated progress width for smooth entrance & transition
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: clampedPct,
      duration: MOTION.duration.hero,
      easing: MOTION.easing.easeOut,
      useNativeDriver: false,
    }).start();
  }, [clampedPct]);

  const animatedWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.heroOuterWrapper}>
      <TouchableOpacity
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.92}
        onPress={() => {
          AppHaptics.light();
          onOpenSimulator?.();
        }}
      >
        {/* Eyebrow with subtle status dot */}
        <View style={styles.topRow}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>ATTENDANCE</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Asymmetrical Metric Display */}
        <View style={styles.asymmetryRow}>
          <View style={styles.leftNumBlock}>
            <View style={styles.numberRow}>
              <AnimatedNumber
                value={overallPercentage}
                decimals={1}
                style={[styles.displayNumber, { color: colors.textPrimary }]}
              />
              <Text style={[styles.percentSymbol, { color: colors.textTertiary }]}>%</Text>
            </View>
            <Text style={[styles.numLabel, { color: colors.textTertiary }]}>overall aggregate</Text>
          </View>

          <View style={styles.rightDeltaBlock}>
            <Text style={[styles.deltaText, { color: isCritical ? colors.crimson : colors.emerald }]}>
              {deltaText}
            </Text>
            <Text style={[styles.bufferSub, { color: colors.textTertiary }]}>
              {overallBuffer >= 0 ? `+${overallBuffer} safe classes` : `−${Math.abs(overallBuffer)} to clear`}
            </Text>
          </View>
        </View>

        {/* ── Signature "The Attenly Line" Dual-Marker Dynamic Track ── */}
        <View style={styles.trackContainer}>
          {/* Baseline Rail */}
          <View style={[styles.railTrack, { backgroundColor: colors.border }]}>
            {/* Animated Active Fill Track */}
            <Animated.View
              style={[
                styles.railFill,
                {
                  width: animatedWidth,
                  backgroundColor: statusDotColor,
                },
              ]}
            />
          </View>

          {/* Markers Scale Labels & Dots */}
          <View style={styles.markersLayer}>
            <Text style={[styles.railEndLabel, { color: colors.textTertiary }]}>0%</Text>

            {/* Target 75% Pin */}
            <View style={[styles.markerPinContainer, { left: `${target}%` }]}>
              <View style={[styles.targetPinLine, { backgroundColor: colors.textPrimary }]} />
              <View style={styles.markerLabelBox}>
                <Text style={[styles.markerValueText, { color: colors.textPrimary }]}>{target}%</Text>
                <Text style={[styles.markerSubText, { color: colors.textTertiary }]}>TARGET</Text>
              </View>
            </View>

            {/* You Pin */}
            <View style={[styles.markerPinContainer, { left: `${clampedPct}%` }]}>
              <View style={[styles.youDot, { backgroundColor: statusDotColor, borderColor: colors.surface }]} />
              <View style={styles.markerLabelBox}>
                <Text style={[styles.markerValueText, { color: statusDotColor }]}>{overallPercentage.toFixed(0)}%</Text>
                <Text style={[styles.markerSubText, { color: colors.textTertiary }]}>YOU</Text>
              </View>
            </View>

            <Text style={[styles.railEndLabel, { color: colors.textTertiary }]}>100%</Text>
          </View>
        </View>

        {/* 1px Fine Divider */}
        <View style={[styles.fineDivider, { backgroundColor: colors.border }]} />

        {/* Tri-Column Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>ATTENDED</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {totalAttended} <Text style={[styles.metricSub, { color: colors.textTertiary }]}>/ {totalClasses}</Text>
            </Text>
          </View>

          <View style={[styles.colDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.metricCol}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              onOpenMarks?.();
            }}
          >
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>INTERNAL MARKS</Text>
            <Text style={[styles.metricValue, { color: colors.gold }]}>
              {marksInfo.marks} <Text style={[styles.metricSub, { color: colors.textTertiary }]}>/ 5</Text>
            </Text>
          </TouchableOpacity>

          <View style={[styles.colDivider, { backgroundColor: colors.border }]} />

          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>MINIMUM</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{target}%</Text>
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
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: THEME.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.semibold,
  },
  asymmetryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  leftNumBlock: {
    alignItems: 'flex-start',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  displayNumber: {
    fontSize: 52,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -2.5,
    lineHeight: 56,
  },
  percentSymbol: {
    fontSize: 22,
    fontWeight: THEME.typography.weights.semibold,
    marginLeft: 2,
  },
  numLabel: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 1,
  },
  rightDeltaBlock: {
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  deltaText: {
    fontSize: 12.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  bufferSub: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 2,
  },
  trackContainer: {
    marginVertical: 14,
    position: 'relative',
    height: 38,
    justifyContent: 'flex-start',
  },
  railTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    borderRadius: 2,
  },
  markersLayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
    marginTop: 8,
  },
  railEndLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    fontFamily: 'monospace',
  },
  markerPinContainer: {
    position: 'absolute',
    top: -12,
    transform: [{ translateX: -12 }],
    alignItems: 'center',
    width: 24,
  },
  targetPinLine: {
    width: 1.5,
    height: 8,
    borderRadius: 1,
  },
  youDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  markerLabelBox: {
    alignItems: 'center',
    marginTop: 3,
  },
  markerValueText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    fontFamily: 'monospace',
  },
  markerSubText: {
    fontSize: 7.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.5,
  },
  fineDivider: {
    height: 1,
    marginTop: 10,
    marginBottom: THEME.spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.2,
  },
  metricSub: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.regular,
  },
  colDivider: {
    width: 1,
    height: 18,
  },
});

