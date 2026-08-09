import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Subject } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  attendancePercentage,
  simulateMissClasses,
  simulateAttendClasses,
} from '../utils/ipuEngine';
import { X, Sliders, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

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
  const { totalAttended, totalClasses, profile } = useAttendance();
  const [mode, setMode] = useState<'MISS' | 'ATTEND'>('MISS');
  const [selectedCount, setSelectedCount] = useState<number>(3);

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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.badge}>
                <Sliders size={13} color={THEME.colors.cyan} />
                <Text style={styles.badgeText}>EXACT CLASS SIMULATOR</Text>
              </View>
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.subtitleText}>
                Current: <Text style={{ color: THEME.colors.textPrimary, fontWeight: '700' }}>{currentPct}%</Text> • Target: {target}%
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={20} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'MISS' && { backgroundColor: THEME.colors.crimsonSubtle, borderColor: THEME.colors.crimson },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setMode('MISS');
              }}
            >
              <TrendingDown
                size={16}
                color={mode === 'MISS' ? THEME.colors.crimson : THEME.colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === 'MISS' ? THEME.colors.crimson : THEME.colors.textTertiary },
                ]}
              >
                If I Miss Classes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'ATTEND' && { backgroundColor: THEME.colors.emeraldSubtle, borderColor: THEME.colors.emerald },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.light();
                setMode('ATTEND');
              }}
            >
              <TrendingUp
                size={16}
                color={mode === 'ATTEND' ? THEME.colors.emerald : THEME.colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: mode === 'ATTEND' ? THEME.colors.emerald : THEME.colors.textTertiary },
                ]}
              >
                If I Attend Consecutively
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ladder Simulation List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeading}>
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
                    <View style={styles.thresholdMarker}>
                      <AlertTriangle size={14} color={THEME.colors.crimson} />
                      <Text style={styles.thresholdText}>
                        ⚠️ {target}% IPU Minimum Threshold Crossed Here
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.ladderCard,
                      step.isBelow && mode === 'MISS' && styles.cardDanger,
                    ]}
                  >
                    <View style={styles.ladderLeft}>
                      <View
                        style={[
                          styles.stepBubble,
                          {
                            backgroundColor:
                              mode === 'MISS' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepBubbleText,
                            { color: mode === 'MISS' ? THEME.colors.crimson : THEME.colors.emerald },
                          ]}
                        >
                          {step.count}
                        </Text>
                      </View>

                      <View>
                        <Text style={styles.stepTitle}>
                          {mode === 'MISS'
                            ? `If you miss ${step.count} class${step.count > 1 ? 'es' : ''}`
                            : `If you attend ${step.count} class${step.count > 1 ? 'es' : ''}`}
                        </Text>
                        <Text style={styles.stepDelta}>
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
                                ? THEME.colors.emerald
                                : step.pct >= 65
                                ? THEME.colors.gold
                                : THEME.colors.crimson,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingTop: THEME.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cyanSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 4,
  },
  badgeText: {
    color: THEME.colors.cyan,
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  subtitleText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceElevated,
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
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
    color: THEME.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: THEME.spacing.md,
  },
  thresholdMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginVertical: THEME.spacing.sm,
  },
  thresholdText: {
    color: THEME.colors.crimson,
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.heavy,
  },
  ladderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  cardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
    color: THEME.colors.textPrimary,
  },
  stepDelta: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textTertiary,
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
