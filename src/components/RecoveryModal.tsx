import React from 'react';
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
  classesNeeded,
  generateRecoveryRoadmap,
} from '../utils/ipuEngine';
import { X, ShieldAlert, CheckCircle2, Award, ArrowRight } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

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
  const { profile } = useAttendance();
  if (!subject) return null;

  const target = subject.targetRequirement || profile.targetAttendance || 75;
  const currentPct = attendancePercentage(subject.attended, subject.total);
  const needed = classesNeeded(subject.attended, subject.total, target);
  const roadmap = generateRecoveryRoadmap(subject.attended, subject.total, target);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.badge}>
                <ShieldAlert size={13} color={THEME.colors.crimson} />
                <Text style={styles.badgeText}>DETENTION ESCAPE PLAN</Text>
              </View>
              <Text style={styles.titleText}>{subject.name}</Text>
              <Text style={styles.subtitleText}>
                {subject.code} • Currently {currentPct.toFixed(1)}% • Target {target}%
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Rescue Summary Card */}
            <View style={styles.rescueCard}>
              <Text style={styles.rescueHeading}>RECOVERY REQUIREMENT</Text>
              <View style={styles.neededRow}>
                <Text style={styles.neededCount}>Attend Next {needed}</Text>
                <Text style={styles.neededSub}>consecutive lectures</Text>
              </View>
              <Text style={styles.rescueExplanation}>
                Attending the next {needed} consecutive classes without missing will elevate your
                attendance to{' '}
                <Text style={{ color: THEME.colors.emerald, fontWeight: '700' }}>
                  {roadmap[roadmap.length - 1]?.projectedPct.toFixed(1)}%
                </Text>
                , escaping the official GGSIPU detention list.
              </Text>
            </View>

            {/* Step by Step Timeline */}
            <Text style={styles.sectionHeading}>STEP-BY-STEP RECOVERY ROADMAP</Text>

            {roadmap.map((step, idx) => (
              <View key={`recovery_step_${step.step}`} style={styles.stepItem}>
                <View style={styles.stepPillar}>
                  <View
                    style={[
                      styles.stepCircle,
                      step.reachedTarget ? styles.stepCircleSuccess : styles.stepCircleActive,
                    ]}
                  >
                    {step.reachedTarget ? (
                      <CheckCircle2 size={16} color={THEME.colors.emerald} />
                    ) : (
                      <Text style={styles.stepNum}>{step.step}</Text>
                    )}
                  </View>
                  {idx < roadmap.length - 1 && <View style={styles.stepLine} />}
                </View>

                <View
                  style={[
                    styles.stepContentCard,
                    step.reachedTarget && styles.stepCardTargetReached,
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>Class +{step.step}</Text>
                    <View style={styles.pctShift}>
                      <Text style={styles.ratioText}>
                        {step.attendedCount} / {step.totalCount}
                      </Text>
                      <ArrowRight size={12} color={THEME.colors.textTertiary} />
                      <Text
                        style={[
                          styles.pctTarget,
                          {
                            color: step.reachedTarget ? THEME.colors.emerald : THEME.colors.gold,
                          },
                        ]}
                      >
                        {step.projectedPct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {step.reachedTarget ? (
                    <View style={styles.targetReachedBanner}>
                      <Text style={styles.targetReachedText}>
                        🎉 Safe Zone Reached! ({target}% Criteria Satisfied)
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.stepNote}>
                      Need {needed - step.step} more lecture{needed - step.step > 1 ? 's' : ''} after this.
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {/* IPU Medical / OD Note */}
            <View style={styles.odTipCard}>
              <Award size={18} color={THEME.colors.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={styles.odTipTitle}>On-Duty / Medical Condonation</Text>
                <Text style={styles.odTipDesc}>
                  If attending {needed} lectures is difficult due to college fest, sports, or medical
                  leave, claim On-Duty (OD) condonation under GGSIPU guidelines.
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
    backgroundColor: THEME.colors.crimsonSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 4,
  },
  badgeText: {
    color: THEME.colors.crimson,
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
  scrollContent: {
    padding: THEME.spacing.xl,
    paddingBottom: 40,
  },
  rescueCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginBottom: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  rescueHeading: {
    color: THEME.colors.crimson,
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
    color: THEME.colors.textPrimary,
  },
  neededSub: {
    fontSize: THEME.typography.sizes.md,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  rescueExplanation: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
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
  stepCircleActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.gold,
  },
  stepCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.emerald,
  },
  stepNum: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.gold,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 4,
  },
  stepContentCard: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  stepCardTargetReached: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  pctShift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratioText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textTertiary,
  },
  pctTarget: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  stepNote: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textTertiary,
    marginTop: 4,
  },
  targetReachedBanner: {
    marginTop: 6,
  },
  targetReachedText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.emerald,
  },
  odTipCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
    marginTop: THEME.spacing.md,
  },
  odTipTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.cyan,
  },
  odTipDesc: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
