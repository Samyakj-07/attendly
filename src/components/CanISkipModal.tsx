import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import {
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

interface CanISkipModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CanISkipModal: React.FC<CanISkipModalProps> = ({
  visible,
  onClose,
}) => {
  const { todaySkipReport, todayDay } = useAttendance();

  const isSafeOverall = todaySkipReport.overallIfSkipAllPct >= 75;
  const isDangerous = todaySkipReport.criticalSubjects.length > 0;

  const verdictColor = isDangerous
    ? THEME.colors.crimson
    : isSafeOverall
    ? THEME.colors.emerald
    : THEME.colors.amber;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.eyebrowRow}>
                <Sparkles size={11} color={THEME.colors.cyan} />
                <Text style={styles.eyebrow}>SKIP ANALYSIS · {todayDay}</Text>
              </View>
              <Text style={styles.modalTitle}>Daily Skip Intelligence</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={18} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Verdict Hero Card */}
            <View style={[styles.verdictCard, { borderColor: verdictColor }]}>
              <View style={styles.verdictTop}>
                <View style={[styles.verdictBadge, { borderColor: verdictColor }]}>
                  {isSafeOverall && !isDangerous ? (
                    <CheckCircle2 size={12} color={verdictColor} />
                  ) : (
                    <ShieldAlert size={12} color={verdictColor} />
                  )}
                  <Text style={[styles.verdictBadgeText, { color: verdictColor }]}>
                    {isDangerous ? 'HIGH RISK' : isSafeOverall ? 'SAFE TO SKIP' : 'MODERATE RISK'}
                  </Text>
                </View>
              </View>

              <Text style={styles.verdictSummary}>"{todaySkipReport.summaryAdvice}"</Text>
            </View>

            {/* 2. Safest Class to Miss Banner */}
            {todaySkipReport.safestSubject && (
              <View style={styles.safestBox}>
                <Text style={styles.safestLabel}>SAFEST TO MISS TODAY</Text>
                <View style={styles.safestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.safestName}>
                      {todaySkipReport.safestSubject.name}
                    </Text>
                    <Text style={styles.safestTime}>
                      {todaySkipReport.safestSubject.code} · {todaySkipReport.safestSubject.type}
                    </Text>
                  </View>

                  <View style={styles.safestStats}>
                    <Text style={styles.safestPct}>
                      {((todaySkipReport.safestSubject.attended / (todaySkipReport.safestSubject.total || 1)) * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.safestBuffer}>
                      +{Math.floor((todaySkipReport.safestSubject.attended - 0.75 * (todaySkipReport.safestSubject.total + 1)) / 0.75)} buffer
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 3. Class-by-Class Risk Breakdown */}
            <Text style={styles.sectionHeader}>SEQUENTIAL RISK ANALYSIS</Text>

            {todaySkipReport.analyzedSlots.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No classes scheduled for {todayDay}.</Text>
              </View>
            ) : (
              todaySkipReport.analyzedSlots.map((item, idx) => {
                const isItemSafe = item.category === 'SAFEST_TO_MISS';
                const isItemCritical = item.category === 'DO_NOT_MISS';
                const itemColor = isItemSafe
                  ? THEME.colors.emerald
                  : isItemCritical
                  ? THEME.colors.crimson
                  : THEME.colors.amber;

                return (
                  <View key={`skip_eval_${idx}`} style={styles.evalItem}>
                    <View style={styles.evalLeft}>
                      <View style={[styles.evalDot, { backgroundColor: itemColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.evalName}>{item.subject.name}</Text>
                        <Text style={styles.evalReason}>{item.advice}</Text>
                      </View>
                    </View>

                    <View style={styles.evalRight}>
                      <Text style={[styles.evalPct, { color: itemColor }]}>
                        {item.postSkipPercentage.toFixed(1)}%
                      </Text>
                      <Text style={styles.evalSub}>if skipped</Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* IPU Rule Note */}
            <View style={styles.ruleNotice}>
              <Text style={styles.ruleNoticeText}>
                <strong>Ordinance 11:</strong> Minimum 75% attendance in each course is required to sit for End-Term University examinations.
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.cyan,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  scrollContent: {
    padding: THEME.spacing.xl,
    paddingBottom: 40,
  },
  verdictCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    marginBottom: THEME.spacing.lg,
  },
  verdictTop: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  verdictBadgeText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  verdictSummary: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    fontWeight: THEME.typography.weights.medium,
  },
  safestBox: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: THEME.spacing.lg,
  },
  safestLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.emerald,
    letterSpacing: 1,
    marginBottom: 6,
  },
  safestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safestName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  safestTime: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  safestStats: {
    alignItems: 'flex-end',
  },
  safestPct: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.emerald,
  },
  safestBuffer: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: THEME.spacing.sm,
  },
  evalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  evalLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  evalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  evalName: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  evalReason: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  evalRight: {
    alignItems: 'flex-end',
  },
  evalPct: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    fontFamily: 'monospace',
  },
  evalSub: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
    marginTop: 1,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textTertiary,
    fontSize: THEME.typography.sizes.xs,
  },
  ruleNotice: {
    marginTop: THEME.spacing.lg,
    padding: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.md,
  },
  ruleNoticeText: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    lineHeight: 14,
  },
});
