import React, { useEffect } from 'react';
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
  classesNeeded,
  generateRecoveryRoadmap,
} from '../utils/ipuEngine';
import { X, ShieldAlert, CheckCircle2, Award, ArrowRight } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

interface RecoveryModalProps {
  visible: boolean;
  onClose: () => void;
  subject: Subject | null;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  visible,
  onClose,
  subject,
}) => {
  const { colors, shadows, isDark } = useTheme();
  const { profile } = useAttendance();

  useEffect(() => {
    if (visible && subject) {
      Analytics.track('feature_used', {
        feature: 'recovery_plan',
        subject_code: subject.code,
        current_pct: attendancePercentage(subject.attended, subject.total),
      });
    }
  }, [visible, subject?.id]);

  if (!subject) return null;

  const target = subject.targetRequirement || profile.targetAttendance || 75;
  const currentPct = attendancePercentage(subject.attended, subject.total);
  const needed = classesNeeded(subject.attended, subject.total, target);
  const roadmap = generateRecoveryRoadmap(subject.attended, subject.total, target);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={[styles.badge, { backgroundColor: colors.crimsonSubtle }]}>
                <ShieldAlert size={13} color={colors.crimson} />
                <Text style={[styles.badgeText, { color: colors.crimson }]}>DETENTION ESCAPE PLAN</Text>
              </View>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>{subject.name}</Text>
              <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                {subject.code} • Currently {currentPct.toFixed(1)}% • Target {target}%
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Rescue Summary Card */}
            <View style={[
              styles.rescueCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(200, 92, 92, 0.4)',
                ...shadows.card,
              },
            ]}>
              <Text style={[styles.rescueHeading, { color: colors.crimson }]}>RECOVERY REQUIREMENT</Text>
              <View style={styles.neededRow}>
                <Text style={[styles.neededCount, { color: colors.textPrimary }]}>Attend Next {needed}</Text>
                <Text style={[styles.neededSub, { color: colors.textSecondary }]}>consecutive lectures</Text>
              </View>
              <Text style={[styles.rescueExplanation, { color: colors.textSecondary }]}>
                Attending the next {needed} consecutive classes without missing will elevate your
                attendance to{' '}
                <Text style={{ color: colors.emerald, fontWeight: '700' }}>
                  {roadmap[roadmap.length - 1]?.projectedPct.toFixed(1)}%
                </Text>
                , clearing the minimum attendance threshold.
              </Text>
            </View>

            {/* Step by Step Timeline */}
            <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>STEP-BY-STEP RECOVERY ROADMAP</Text>

            {roadmap.map((step, idx) => (
              <View key={`recovery_step_${step.step}`} style={styles.stepItem}>
                <View style={styles.stepPillar}>
                  <View
                    style={[
                      styles.stepCircle,
                      step.reachedTarget
                        ? [styles.stepCircleSuccess, { backgroundColor: colors.emeraldSubtle, borderColor: colors.emerald }]
                        : [styles.stepCircleActive, { backgroundColor: colors.surfaceElevated, borderColor: colors.gold }],
                    ]}
                  >
                    {step.reachedTarget ? (
                      <CheckCircle2 size={16} color={colors.emerald} />
                    ) : (
                      <Text style={[styles.stepNum, { color: colors.gold }]}>{step.step}</Text>
                    )}
                  </View>
                  {idx < roadmap.length - 1 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                </View>

                <View
                  style={[
                    styles.stepContentCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    step.reachedTarget && [
                      styles.stepCardTargetReached,
                      {
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(46, 139, 99, 0.4)',
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(46, 139, 99, 0.05)',
                      },
                    ],
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Class +{step.step}</Text>
                    <View style={styles.pctShift}>
                      <Text style={[styles.ratioText, { color: colors.textTertiary }]}>
                        {step.attendedCount} / {step.totalCount}
                      </Text>
                      <ArrowRight size={12} color={colors.textTertiary} />
                      <Text
                        style={[
                          styles.pctTarget,
                          {
                            color: step.reachedTarget ? colors.emerald : colors.gold,
                          },
                        ]}
                      >
                        {step.projectedPct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {step.reachedTarget ? (
                    <View style={styles.targetReachedBanner}>
                      <Text style={[styles.targetReachedText, { color: colors.emerald }]}>
                        🎉 Safe Zone Reached! ({target}% Criteria Satisfied)
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.stepNote, { color: colors.textTertiary }]}>
                      Need {needed - step.step} more lecture{needed - step.step > 1 ? 's' : ''} after this.
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {/* Medical / OD Note */}
            <View style={[styles.odTipCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderHighlight }]}>
              <Award size={18} color={colors.indigo} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.odTipTitle, { color: colors.indigo }]}>On-Duty / Medical Condonation</Text>
                <Text style={[styles.odTipDesc, { color: colors.textSecondary }]}>
                  If attending {needed} classes is difficult due to college fest, sports, or medical
                  leave, claim On-Duty (OD) condonation per your university guidelines.
                </Text>
              </View>
            </View>
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
  scrollContent: {
    padding: THEME.spacing.xl,
    paddingBottom: 40,
  },
  rescueCard: {
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    marginBottom: THEME.spacing.xl,
  },
  rescueHeading: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1,
    marginBottom: 6,
  },
  neededRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  neededCount: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.heavy,
  },
  neededSub: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.medium,
  },
  rescueExplanation: {
    fontSize: THEME.typography.sizes.sm,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1,
    marginBottom: THEME.spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  stepPillar: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepCircleActive: {},
  stepCircleSuccess: {},
  stepNum: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContentCard: {
    flex: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    marginBottom: THEME.spacing.sm,
  },
  stepCardTargetReached: {},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  pctShift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratioText: {
    fontSize: THEME.typography.sizes.xs,
  },
  pctTarget: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  stepNote: {
    fontSize: THEME.typography.sizes.xxs,
    marginTop: 4,
  },
  targetReachedBanner: {
    marginTop: 6,
  },
  targetReachedText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  odTipCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    marginTop: THEME.spacing.md,
  },
  odTipTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  odTipDesc: {
    fontSize: THEME.typography.sizes.xxs,
    marginTop: 2,
    lineHeight: 16,
  },
});
