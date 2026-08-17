import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import {
  X,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { Analytics } from '../utils/analytics';

interface CanISkipModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CanISkipModal: React.FC<CanISkipModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { todaySkipReport, todayDay } = useAttendance();

  useEffect(() => {
    if (visible) {
      Analytics.track('feature_used', {
        feature: 'can_i_skip',
        total_classes_today: todaySkipReport.totalClassesToday,
        is_safe: todaySkipReport.overallIfSkipAllPct >= 75,
      });
    }
  }, [visible]);

  const isSafeOverall = todaySkipReport.overallIfSkipAllPct >= 75;
  const isDangerous = todaySkipReport.criticalSubjects.length > 0;

  const verdictColor = isDangerous
    ? colors.crimson
    : isSafeOverall
    ? colors.emerald
    : colors.amber;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <View style={styles.eyebrowRow}>
                <Sparkles size={11} color={colors.indigo} />
                <Text style={[styles.eyebrow, { color: colors.indigo }]}>ATTENDLY FORECAST · {todayDay}</Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Can I skip today?</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => {
                AppHaptics.light();
                onClose();
              }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Verdict Hero Card */}
            <View style={[styles.verdictCard, { backgroundColor: colors.surface, borderColor: verdictColor }]}>
              <View style={styles.verdictTop}>
                <View style={[styles.verdictBadge, { borderColor: verdictColor, backgroundColor: colors.surfaceSubtle }]}>
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

              <Text style={[styles.verdictSummary, { color: colors.textPrimary }]}>"{todaySkipReport.summaryAdvice}"</Text>
            </View>

            {/* 2. Safest Class to Miss Banner */}
            {todaySkipReport.safestSubject && (
              <View style={[styles.safestBox, { backgroundColor: colors.surfaceSubtle, borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(46, 139, 99, 0.3)' }]}>
                <Text style={[styles.safestLabel, { color: colors.emerald }]}>SAFEST TO MISS TODAY</Text>
                <View style={styles.safestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.safestName, { color: colors.textPrimary }]}>
                      {todaySkipReport.safestSubject.name}
                    </Text>
                    <Text style={[styles.safestTime, { color: colors.textTertiary }]}>
                      {todaySkipReport.safestSubject.code} · {todaySkipReport.safestSubject.type}
                    </Text>
                  </View>

                  <View style={styles.safestStats}>
                    <Text style={[styles.safestPct, { color: colors.emerald }]}>
                      {((todaySkipReport.safestSubject.attended / (todaySkipReport.safestSubject.total || 1)) * 100).toFixed(1)}%
                    </Text>
                    <Text style={[styles.safestBuffer, { color: colors.textTertiary }]}>
                      +{Math.floor((todaySkipReport.safestSubject.attended - 0.75 * (todaySkipReport.safestSubject.total + 1)) / 0.75)} buffer
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 3. Class-by-Class Risk Breakdown */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>SEQUENTIAL RISK ANALYSIS</Text>

            {todaySkipReport.analyzedSlots.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No classes scheduled for {todayDay}.</Text>
              </View>
            ) : (
              todaySkipReport.analyzedSlots.map((item, idx) => {
                const isItemSafe = item.category === 'SAFEST_TO_MISS';
                const isItemCritical = item.category === 'DO_NOT_MISS';
                const itemColor = isItemSafe
                  ? colors.emerald
                  : isItemCritical
                  ? colors.crimson
                  : colors.amber;

                return (
                  <View key={`skip_eval_${idx}`} style={[styles.evalItem, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.evalLeft}>
                      <View style={[styles.evalDot, { backgroundColor: itemColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.evalName, { color: colors.textPrimary }]}>{item.subject.name}</Text>
                        <Text style={[styles.evalReason, { color: colors.textTertiary }]}>{item.advice}</Text>
                      </View>
                    </View>

                    <View style={styles.evalRight}>
                      <Text style={[styles.evalPct, { color: itemColor }]}>
                        {item.postSkipPercentage.toFixed(1)}%
                      </Text>
                      <Text style={[styles.evalSub, { color: colors.textTertiary }]}>if skipped</Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Attendance Rule Note */}
            <View style={[styles.ruleNotice, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.ruleNoticeText, { color: colors.textTertiary }]}>
                Minimum 75% attendance in each course is required to sit for End-Term University examinations.
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
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '88%',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
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
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  scrollContent: {
    padding: THEME.spacing.xl,
    paddingBottom: 40,
  },
  verdictCard: {
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
  },
  verdictBadgeText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  verdictSummary: {
    fontSize: THEME.typography.sizes.sm,
    lineHeight: 20,
    fontWeight: THEME.typography.weights.medium,
  },
  safestBox: {
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    marginBottom: THEME.spacing.lg,
  },
  safestLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
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
  },
  safestTime: {
    fontSize: 11,
    marginTop: 2,
  },
  safestStats: {
    alignItems: 'flex-end',
  },
  safestPct: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  safestBuffer: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1,
    marginBottom: THEME.spacing.sm,
  },
  evalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
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
  },
  evalReason: {
    fontSize: 11,
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
    marginTop: 1,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: THEME.typography.sizes.xs,
  },
  ruleNotice: {
    marginTop: THEME.spacing.lg,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
  },
  ruleNoticeText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
