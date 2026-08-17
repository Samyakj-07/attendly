import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Subject } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  simulateMissClasses,
  simulateAttendClasses,
} from '../utils/ipuEngine';
import { X, Sliders, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

interface SimulatorModalProps {
  visible: boolean;
  onClose: () => void;
  subject?: Subject;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  visible,
  onClose,
  subject,
}) => {
  const { colors, isDark } = useTheme();
  const { totalAttended, totalClasses, profile } = useAttendance();
  const [mode, setMode] = useState<'MISS' | 'ATTEND'>('MISS');
  const [selectedCount, setSelectedCount] = useState<number>(3);

  useEffect(() => {
    if (visible) {
      Analytics.track('feature_used', {
        feature: 'what_if_simulator',
        mode,
        is_subject_specific: !!subject,
      });
    }
  }, [visible, mode]);

  const baseAttended = subject ? subject.attended : totalAttended;
  const baseTotal = subject ? subject.total : totalClasses;
  const target = subject?.targetRequirement || profile.targetAttendance || 75;
  const title = subject ? subject.name : 'Overall College Attendance';

  const currentPct = attendancePercentage(baseAttended, baseTotal);

  // Generate 1 to 6 steps ladder
  const ladderSteps = [1, 2, 3, 4, 5, 6].map(count => {
    if (mode === 'MISS') {
      const res = simulateMissClasses(baseAttended, baseTotal, count);
      return {
        count,
        pct: res.postPct,
        drop: (currentPct - res.postPct).toFixed(1),
        isCrossedBelow: res.postPct < target && currentPct >= target,
        isBelow: res.postPct < target,
      };
    } else {
      const res = simulateAttendClasses(baseAttended, baseTotal, count);
      return {
        count,
        pct: res.postPct,
        gain: (res.postPct - currentPct).toFixed(1),
        isCrossedAbove: res.postPct >= target && currentPct < target,
        isAbove: res.postPct >= target,
      };
    }
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={[styles.badge, { backgroundColor: colors.accentSubtle }]}>
                <Sliders size={13} color={colors.accent} />
                <Text style={[styles.badgeText, { color: colors.accent }]}>EXACT CLASS SIMULATOR</Text>
              </View>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                Current: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{currentPct}%</Text> • Target: {target}%
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                { backgroundColor: colors.surface, borderColor: colors.border },
                mode === 'MISS' && { backgroundColor: colors.crimsonSubtle, borderColor: colors.crimson },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setMode('MISS');
              }}
            >
              <TrendingDown
                size={16}
                color={mode === 'MISS' ? colors.crimson : colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === 'MISS' ? colors.crimson : colors.textTertiary },
                ]}
              >
                If I Miss Classes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                { backgroundColor: colors.surface, borderColor: colors.border },
                mode === 'ATTEND' && { backgroundColor: colors.emeraldSubtle, borderColor: colors.emerald },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setMode('ATTEND');
              }}
            >
              <TrendingUp
                size={16}
                color={mode === 'ATTEND' ? colors.emerald : colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === 'ATTEND' ? colors.emerald : colors.textTertiary },
                ]}
              >
                If I Attend Consecutively
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ladder Simulation List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>
              {mode === 'MISS' ? 'PROJECTED ATTENDANCE DROP LADDER' : 'PROJECTED RECOVERY TRAJECTORY'}
            </Text>

            {ladderSteps.map((step, idx) => {
              const showThresholdLine =
                mode === 'MISS' &&
                step.isBelow &&
                (idx === 0 || !ladderSteps[idx - 1].isBelow);

              return (
                <React.Fragment key={`step_${step.count}`}>
                  {showThresholdLine && (
                    <View style={[styles.thresholdMarker, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(200, 92, 92, 0.15)', borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(200, 92, 92, 0.4)' }]}>
                      <AlertTriangle size={14} color={colors.crimson} />
                      <Text style={[styles.thresholdText, { color: colors.crimson }]}>
                        ⚠️ {target}% Minimum Threshold Crossed Here
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.ladderCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      step.isBelow && mode === 'MISS' && { borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(200, 92, 92, 0.3)' },
                    ]}
                  >
                    <View style={styles.ladderLeft}>
                      <View
                        style={[
                          styles.stepBubble,
                          {
                            backgroundColor:
                              mode === 'MISS'
                                ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(200, 92, 92, 0.15)')
                                : (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(46, 139, 99, 0.15)'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepBubbleText,
                            { color: mode === 'MISS' ? colors.crimson : colors.emerald },
                          ]}
                        >
                          {step.count}
                        </Text>
                      </View>

                      <View>
                        <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                          {mode === 'MISS'
                            ? `If you miss ${step.count} class${step.count > 1 ? 'es' : ''}`
                            : `If you attend ${step.count} class${step.count > 1 ? 'es' : ''}`}
                        </Text>
                        <Text style={[styles.stepDelta, { color: colors.textTertiary }]}>
                          {mode === 'MISS' ? `−${step.drop}% drop` : `+${step.gain}% gain`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ladderRight}>
                      <Text
                        style={[
                          styles.ladderPct,
                          {
                            color:
                              step.pct >= target
                                ? colors.emerald
                                : step.pct >= 65
                                ? colors.gold
                                : colors.crimson,
                          },
                        ]}
                      >
                        {step.pct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
    paddingTop: THEME.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
  },
  subtitleText: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
  },
  modeTabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  scrollContent: {
    padding: THEME.spacing.xl,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1,
    marginBottom: THEME.spacing.md,
  },
  thresholdMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    marginVertical: THEME.spacing.sm,
  },
  thresholdText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.heavy,
  },
  ladderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    marginBottom: THEME.spacing.sm,
  },
  ladderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
  stepTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  stepDelta: {
    fontSize: THEME.typography.sizes.xxs,
    marginTop: 2,
  },
  ladderRight: {
    alignItems: 'flex-end',
  },
  ladderPct: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
  },
});
