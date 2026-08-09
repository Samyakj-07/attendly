import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import {
  predictInternalMarks,
  attendancePercentage,
} from '../utils/ipuEngine';
import { AcademicExam } from '../types';
import {
  Award,
  HeartPulse,
  TrendingUp,
  Calendar,
  Trash2,
  Plus,
  Edit3,
  X,
  History,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export const InsightsScreen: React.FC = () => {
  const {
    semesterHealth,
    overallPercentage,
    subjects,
    exams,
    records,
    deleteAttendanceRecord,
    addExam,
    updateExam,
    deleteExam,
    profile,
  } = useAttendance();

  const [forecastRate, setForecastRate] = useState<number>(90);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'CANCELLED' | 'OD'>('ALL');

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'Mid-Sem' | 'End-Sem' | 'Practical' | 'Internal' | 'Project'>('Mid-Sem');
  const [examDate, setExamDate] = useState('2026-09-15');

  const marks = predictInternalMarks(overallPercentage);
  const target = profile.targetAttendance || 75;

  // Projection math for ~50 remaining classes
  const remainingClassesEst = 50;
  const projectedAttended = Math.round(
    subjects.reduce((acc, s) => acc + s.attended, 0) + (forecastRate / 100) * remainingClassesEst
  );
  const projectedTotal =
    subjects.reduce((acc, s) => acc + s.total, 0) + remainingClassesEst;
  const projectedPct = attendancePercentage(projectedAttended, projectedTotal);

  // Filter history records
  const filteredRecords = records.filter(r => {
    if (historyFilter === 'ALL') return true;
    return r.status === historyFilter;
  });

  const getHealthColor = (score: number) => {
    if (score >= 85) return THEME.colors.emerald;
    if (score >= 70) return THEME.colors.cyan;
    if (score >= 50) return THEME.colors.amber;
    return THEME.colors.crimson;
  };

  const healthColor = getHealthColor(semesterHealth.score);

  const setQuickDateDaysFromNow = (days: number) => {
    AppHaptics.selection();
    const d = new Date(Date.now() + days * 86400000);
    setExamDate(d.toISOString().split('T')[0]);
  };

  const handleOpenAddExam = () => {
    AppHaptics.light();
    setEditingExamId(null);
    setExamName('');
    setExamType('Mid-Sem');
    const defaultDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setExamDate(defaultDate);
    setIsExamModalOpen(true);
  };

  const handleOpenEditExam = (exam: AcademicExam) => {
    AppHaptics.light();
    setEditingExamId(exam.id);
    setExamName(exam.name);
    setExamType(exam.type);
    setExamDate(exam.date);
    setIsExamModalOpen(true);
  };

  const handleSaveExam = async () => {
    if (!examName.trim() || !examDate.trim()) return;
    AppHaptics.success();

    if (editingExamId) {
      await updateExam({
        id: editingExamId,
        name: examName.trim(),
        type: examType,
        date: examDate.trim(),
      });
    } else {
      await addExam({
        name: examName.trim(),
        type: examType,
        date: examDate.trim(),
      });
    }

    setIsExamModalOpen(false);
  };

  const handleDeleteCurrentExam = async () => {
    if (!editingExamId) return;
    AppHaptics.warning();
    await deleteExam(editingExamId);
    setIsExamModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <Text style={styles.screenEyebrow}>ACADEMIC INTELLIGENCE</Text>
          <Text style={styles.screenTitle}>Analytics.</Text>
        </View>

        {/* 1. Financial-Grade Forecast Instrument */}
        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <TrendingUp size={14} color={THEME.colors.cyan} />
            <Text style={styles.forecastTitle}>SEMESTER ATTENDANCE FORECAST</Text>
          </View>

          <View style={styles.forecastResultBox}>
            <View>
              <Text style={styles.forecastResultPct}>
                {projectedPct.toFixed(1)}%
              </Text>
              <Text style={styles.forecastResultSub}>
                Projected Final Attendance if you maintain {forecastRate}% future pace
              </Text>
            </View>

            <View style={[styles.targetThresholdBadge, { borderColor: projectedPct >= target ? THEME.colors.emerald : THEME.colors.crimson }]}>
              <Text style={[styles.targetThresholdText, { color: projectedPct >= target ? THEME.colors.emerald : THEME.colors.crimson }]}>
                {projectedPct >= target ? 'ABOVE 75% TARGET' : 'BELOW 75% TARGET'}
              </Text>
            </View>
          </View>

          {/* Rate Selector Chips */}
          <View style={styles.ratesRow}>
            {[60, 70, 75, 80, 90, 100].map(r => (
              <TouchableOpacity
                key={`rate_${r}`}
                style={[
                  styles.rateChip,
                  forecastRate === r && styles.rateChipActive,
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setForecastRate(r);
                }}
              >
                <Text
                  style={[
                    styles.rateChipText,
                    forecastRate === r && styles.rateChipTextActive,
                  ]}
                >
                  {r}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. Semester Health Score */}
        <View style={styles.healthCard}>
          <View style={styles.healthTop}>
            <View style={styles.healthBadge}>
              <HeartPulse size={12} color={healthColor} />
              <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                {semesterHealth.status}
              </Text>
            </View>
            <Text style={styles.healthScoreText}>
              <Text style={{ color: healthColor, fontSize: 26, fontWeight: '800' }}>
                {semesterHealth.score}
              </Text>{' '}
              / 100
            </Text>
          </View>

          <Text style={styles.healthSummary}>"{semesterHealth.summary}"</Text>

          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownVal}>+{semesterHealth.attendanceScore}</Text>
              <Text style={styles.breakdownLbl}>ATTENDANCE</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownVal}>+{semesterHealth.bufferScore}</Text>
              <Text style={styles.breakdownLbl}>BUFFER</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownVal, { color: THEME.colors.crimson }]}>
                −{semesterHealth.riskPenalty}
              </Text>
              <Text style={styles.breakdownLbl}>PENALTY</Text>
            </View>
          </View>
        </View>

        {/* 3. IPU Internal Assessment Marks */}
        <View style={styles.marksCard}>
          <View style={styles.marksHeader}>
            <Award size={16} color={THEME.colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.marksTitle}>IPU Internal Assessment Marks</Text>
              <Text style={styles.marksSubtitle}>{marks.slab}</Text>
            </View>
            <Text style={styles.marksScoreText}>{marks.marks} / 5</Text>
          </View>

          <View style={styles.slabsBar}>
            {[
              { label: '≥90%', score: '5 Marks', active: overallPercentage >= 90 },
              { label: '85–89%', score: '4 Marks', active: overallPercentage >= 85 && overallPercentage < 90 },
              { label: '80–84%', score: '3 Marks', active: overallPercentage >= 80 && overallPercentage < 85 },
              { label: '75–79%', score: '2 Marks', active: overallPercentage >= 75 && overallPercentage < 80 },
              { label: '<75%', score: '0 Marks', active: overallPercentage < 75 },
            ].map((sl, idx) => (
              <View
                key={`slab_${idx}`}
                style={[
                  styles.slabBox,
                  sl.active && styles.slabBoxActive,
                ]}
              >
                <Text style={[styles.slabLabel, sl.active && styles.slabLabelActive]}>
                  {sl.label}
                </Text>
                <Text style={[styles.slabScore, sl.active && styles.slabScoreActive]}>
                  {sl.score}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Upcoming IPU Exams & Deadlines */}
        <View style={styles.examsCard}>
          <View style={styles.examHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Calendar size={14} color={THEME.colors.cyan} />
              <Text style={styles.examTitle}>EXAMINATIONS & DEADLINES</Text>
            </View>

            <TouchableOpacity
              style={styles.addExamBtn}
              activeOpacity={0.8}
              onPress={handleOpenAddExam}
            >
              <Plus size={12} color={THEME.colors.background} />
              <Text style={styles.addExamBtnText}>Add Exam</Text>
            </TouchableOpacity>
          </View>

          {exams.map(exam => {
            const examDateObj = new Date(exam.date);
            const diffDays = Math.ceil((examDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <TouchableOpacity
                key={exam.id}
                style={styles.examItem}
                activeOpacity={0.7}
                onPress={() => handleOpenEditExam(exam)}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.examItemName} numberOfLines={1}>
                    {exam.name}
                  </Text>
                  <Text style={styles.examItemDate}>
                    {exam.type} · {exam.date}
                  </Text>
                </View>

                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownNumber}>{diffDays > 0 ? diffDays : 0}</Text>
                  <Text style={styles.countdownLabel}>DAYS</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Attendance Ledger & History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <History size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.historyTitle}>ATTENDANCE LEDGER</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilters}>
            {(['ALL', 'PRESENT', 'ABSENT', 'CANCELLED', 'OD'] as const).map(hf => (
              <TouchableOpacity
                key={`hf_${hf}`}
                style={[
                  styles.historyPill,
                  historyFilter === hf && styles.historyPillActive,
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setHistoryFilter(hf);
                }}
              >
                <Text
                  style={[
                    styles.historyPillText,
                    historyFilter === hf && styles.historyPillTextActive,
                  ]}
                >
                  {hf}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredRecords.map(rec => {
            const statusColor =
              rec.status === 'PRESENT'
                ? THEME.colors.emerald
                : rec.status === 'ABSENT'
                ? THEME.colors.crimson
                : rec.status === 'OD'
                ? THEME.colors.cyan
                : THEME.colors.textTertiary;

            return (
              <View key={rec.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{rec.date}</Text>
                  <Text style={styles.historySubject}>{rec.subjectName}</Text>
                </View>

                <View style={styles.historyRight}>
                  <Text style={[styles.statusTagText, { color: statusColor }]}>{rec.status}</Text>
                  <TouchableOpacity
                    style={styles.deleteRecordBtn}
                    onPress={() => {
                      AppHaptics.light();
                      deleteAttendanceRecord(rec.id);
                    }}
                  >
                    <Trash2 size={12} color={THEME.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit / Add Exam Date Modal */}
      <Modal visible={isExamModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>
                {editingExamId ? 'Edit Exam Timeline' : 'Add IPU Exam'}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsExamModalOpen(false)}
              >
                <X size={18} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EXAM TITLE</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. IPU Mid-Term Examination (Theory)"
                  placeholderTextColor={THEME.colors.textTertiary}
                  value={examName}
                  onChangeText={setExamName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EXAM DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={THEME.colors.textTertiary}
                  value={examDate}
                  onChangeText={setExamDate}
                />
              </View>

              <View style={styles.shortcutsRow}>
                {[15, 30, 45, 60, 90].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={styles.shortcutBtn}
                    onPress={() => setQuickDateDaysFromNow(days)}
                  >
                    <Text style={styles.shortcutBtnText}>+{days}d</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveExamBtn}
                activeOpacity={0.8}
                onPress={handleSaveExam}
              >
                <Text style={styles.saveExamBtnText}>Save Exam</Text>
              </TouchableOpacity>

              {editingExamId && (
                <TouchableOpacity
                  style={styles.deleteExamBtn}
                  activeOpacity={0.7}
                  onPress={handleDeleteCurrentExam}
                >
                  <Trash2 size={14} color={THEME.colors.crimson} />
                  <Text style={styles.deleteExamBtnText}>Delete Exam</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerBox: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  screenEyebrow: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.headline,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 38,
  },
  forecastCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  forecastTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 1,
  },
  forecastResultBox: {
    marginVertical: 6,
  },
  forecastResultPct: {
    fontSize: 42,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: -1,
  },
  forecastResultSub: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
    lineHeight: 15,
  },
  targetThresholdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    marginTop: 8,
  },
  targetThresholdText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: THEME.spacing.md,
  },
  rateChip: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.pill,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  rateChipActive: {
    backgroundColor: THEME.colors.cyanSubtle,
    borderColor: THEME.colors.cyan,
  },
  rateChipText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  rateChipTextActive: {
    color: THEME.colors.cyan,
  },
  healthCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  healthBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  healthScoreText: {
    color: THEME.colors.textTertiary,
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
  },
  healthSummary: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 10,
  },
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.md,
    padding: 8,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  breakdownLbl: {
    fontSize: 8,
    color: THEME.colors.textTertiary,
    marginTop: 1,
    letterSpacing: 0.6,
  },
  breakdownDivider: {
    width: 1,
    height: 16,
    backgroundColor: THEME.colors.borderSubtle,
  },
  marksCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  marksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  marksTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  marksSubtitle: {
    fontSize: 10,
    color: THEME.colors.gold,
  },
  marksScoreText: {
    color: THEME.colors.gold,
    fontSize: 14,
    fontWeight: THEME.typography.weights.heavy,
  },
  slabsBar: {
    flexDirection: 'row',
    gap: 3,
  },
  slabBox: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 4,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  slabBoxActive: {
    borderColor: THEME.colors.gold,
    backgroundColor: THEME.colors.goldSubtle,
  },
  slabLabel: {
    fontSize: 8,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.bold,
  },
  slabLabelActive: {
    color: THEME.colors.gold,
  },
  slabScore: {
    fontSize: 7,
    color: THEME.colors.textTertiary,
    marginTop: 1,
  },
  slabScoreActive: {
    color: THEME.colors.gold,
    fontWeight: THEME.typography.weights.bold,
  },
  examsCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  examTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 1,
  },
  addExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  addExamBtnText: {
    color: THEME.colors.textInverse,
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
  },
  examItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  examItemName: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  examItemDate: {
    fontSize: 10,
    color: THEME.colors.textTertiary,
    marginTop: 1,
  },
  countdownBadge: {
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 38,
  },
  countdownNumber: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.cyan,
  },
  countdownLabel: {
    fontSize: 7,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.heavy,
  },
  historySection: {
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 1,
  },
  historyFilters: {
    gap: 4,
    paddingBottom: 8,
  },
  historyPill: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  historyPillActive: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.borderHighlight,
  },
  historyPillText: {
    color: THEME.colors.textTertiary,
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  historyPillTextActive: {
    color: THEME.colors.textPrimary,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 9,
    color: THEME.colors.textTertiary,
  },
  historySubject: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
  },
  deleteRecordBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  modalSheetTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  shortcutBtn: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  shortcutBtnText: {
    color: THEME.colors.cyan,
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  saveExamBtn: {
    backgroundColor: THEME.colors.textPrimary,
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  saveExamBtnText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.heavy,
  },
  deleteExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: THEME.spacing.md,
    paddingVertical: 8,
    marginBottom: 30,
  },
  deleteExamBtnText: {
    color: THEME.colors.crimson,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
});
