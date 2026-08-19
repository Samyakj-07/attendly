import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import {
  predictInternalMarks,
  attendancePercentage,
  getLocalDateString,
} from '../utils/ipuEngine';
import { AcademicExam } from '../types';
import {
  Award,
  HeartPulse,
  TrendingUp,
  Calendar,
  Trash2,
  Plus,
  X,
  History,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export const InsightsScreen: React.FC = React.memo(() => {
  const { colors } = useTheme();
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
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'CANCELLED'>('ALL');
  const [visibleRecordCount, setVisibleRecordCount] = useState<number>(30);

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'Mid-Sem' | 'End-Sem' | 'Practical' | 'Internal' | 'Project'>('Mid-Sem');
  const [examDate, setExamDate] = useState(() =>
    getLocalDateString(new Date(Date.now() + 30 * 86400000))
  );

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
    if (score >= 85) return colors.emerald;
    if (score >= 70) return colors.accent;
    if (score >= 50) return colors.amber;
    return colors.crimson;
  };

  const healthColor = getHealthColor(semesterHealth.score);

  const setQuickDateDaysFromNow = (days: number) => {
    AppHaptics.selection();
    const d = new Date(Date.now() + days * 86400000);
    setExamDate(getLocalDateString(d));
  };

  const handleOpenAddExam = () => {
    AppHaptics.light();
    setEditingExamId(null);
    setExamName('');
    setExamType('Mid-Sem');
    const defaultDate = getLocalDateString(new Date(Date.now() + 30 * 86400000));
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
    Alert.alert(
      'Delete Exam?',
      `Are you sure you want to delete "${examName}" from your schedule?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            AppHaptics.warning();
            await deleteExam(editingExamId);
            setIsExamModalOpen(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editorial Header */}
        <View style={styles.headerBox}>
          <Text style={[styles.screenEyebrow, { color: colors.textTertiary }]}>ACADEMIC OBSERVATORY</Text>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Analytics.</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Your semester trajectory · {overallPercentage.toFixed(1)}% current aggregate
          </Text>
        </View>

        {subjects.length === 0 ? (
          <View style={[styles.emptyAnalyticsCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <TrendingUp size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyAnalyticsTitle, { color: colors.textPrimary }]}>No Courses Registered Yet</Text>
            <Text style={[styles.emptyAnalyticsSub, { color: colors.textTertiary }]}>
              Add your registered academic courses on the Courses tab to activate your semester attendance forecast, health score, and internal marks projection.
            </Text>
          </View>
        ) : (
          <>
            {/* 1. Financial-Grade Forecast Instrument */}
            <View style={[styles.forecastCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.forecastHeader}>
                <TrendingUp size={14} color={colors.accent} />
                <Text style={[styles.forecastTitle, { color: colors.textTertiary }]}>SEMESTER ATTENDANCE FORECAST</Text>
              </View>

              <View style={styles.forecastResultBox}>
                <View>
                  <Text style={[styles.forecastResultPct, { color: colors.textPrimary }]}>
                    {projectedPct.toFixed(1)}%
                  </Text>
                  <Text style={[styles.forecastResultSub, { color: colors.textTertiary }]}>
                    Projected Final Attendance if you maintain {forecastRate}% future pace
                  </Text>
                </View>

                <View style={[styles.targetThresholdBadge, { borderColor: projectedPct >= target ? colors.emerald : colors.crimson }]}>
                  <Text style={[styles.targetThresholdText, { color: projectedPct >= target ? colors.emerald : colors.crimson }]}>
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
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      forecastRate === r && { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      AppHaptics.selection();
                      setForecastRate(r);
                    }}
                  >
                    <Text
                      style={[
                        styles.rateChipText,
                        { color: colors.textSecondary },
                        forecastRate === r && { color: colors.accent },
                      ]}
                    >
                      {r}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 2. Semester Health Score */}
            <View style={[styles.healthCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.healthTop}>
                <View style={[styles.healthBadge, { backgroundColor: colors.surfaceSubtle }]}>
                  <HeartPulse size={12} color={healthColor} />
                  <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                    {semesterHealth.status}
                  </Text>
                </View>
                <Text style={[styles.healthScoreText, { color: colors.textTertiary }]}>
                  <Text style={{ color: healthColor, fontSize: 26, fontWeight: '800' }}>
                    {semesterHealth.score}
                  </Text>{' '}
                  / 100
                </Text>
              </View>

              <Text style={[styles.healthSummary, { color: colors.textSecondary }]}>"{semesterHealth.summary}"</Text>

              <View style={[styles.breakdownGrid, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownVal, { color: colors.textPrimary }]}>+{semesterHealth.attendanceScore}</Text>
                  <Text style={[styles.breakdownLbl, { color: colors.textTertiary }]}>ATTENDANCE</Text>
                </View>
                <View style={[styles.breakdownDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownVal, { color: colors.textPrimary }]}>+{semesterHealth.bufferScore}</Text>
                  <Text style={[styles.breakdownLbl, { color: colors.textTertiary }]}>BUFFER</Text>
                </View>
                <View style={[styles.breakdownDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownVal, { color: colors.crimson }]}>
                    −{semesterHealth.riskPenalty}
                  </Text>
                  <Text style={[styles.breakdownLbl, { color: colors.textTertiary }]}>PENALTY</Text>
                </View>
              </View>
            </View>

            {/* 3. Internal Assessment Marks */}
            <View style={[styles.marksCard, { backgroundColor: colors.surface, borderColor: 'rgba(183, 121, 31, 0.25)' }]}>
              <View style={styles.marksHeader}>
                <Award size={16} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.marksTitle, { color: colors.textPrimary }]}>Internal Assessment Marks</Text>
                  <Text style={[styles.marksSubtitle, { color: colors.gold }]}>{marks.slab}</Text>
                </View>
                <Text style={[styles.marksScoreText, { color: colors.gold }]}>{marks.marks} / 5</Text>
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
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      sl.active && { borderColor: colors.gold, backgroundColor: colors.goldSubtle },
                    ]}
                  >
                    <Text style={[styles.slabLabel, { color: colors.textTertiary }, sl.active && { color: colors.gold }]}>
                      {sl.label}
                    </Text>
                    <Text style={[styles.slabScore, { color: colors.textTertiary }, sl.active && { color: colors.gold, fontWeight: 'bold' }]}>
                      {sl.score}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* 4. Upcoming Exams & Deadlines */}
        <View style={[styles.examsCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.examHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Calendar size={14} color={colors.accent} />
              <Text style={[styles.examTitle, { color: colors.textTertiary }]}>EXAMINATIONS & DEADLINES</Text>
            </View>

            <TouchableOpacity
              style={[styles.addExamBtn, { backgroundColor: colors.textPrimary }]}
              activeOpacity={0.8}
              onPress={handleOpenAddExam}
            >
              <Plus size={12} color={colors.textInverse} />
              <Text style={[styles.addExamBtnText, { color: colors.textInverse }]}>Add Exam</Text>
            </TouchableOpacity>
          </View>

          {exams.map(exam => {
            const [ey, em, ed] = exam.date.split('-').map(Number);
            const examLocalDate = new Date(ey, (em || 1) - 1, ed || 1, 0, 0, 0, 0);
            const now = new Date();
            const todayLocalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const diffDays = Math.round((examLocalDate.getTime() - todayLocalDate.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <TouchableOpacity
                key={exam.id}
                style={[styles.examItem, { borderBottomColor: colors.borderSubtle }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${exam.name}, ${exam.type}, ${exam.date}, ${diffDays >= 0 ? diffDays : 0} days remaining`}
                onPress={() => handleOpenEditExam(exam)}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.examItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {exam.name}
                  </Text>
                  <Text style={[styles.examItemDate, { color: colors.textTertiary }]}>
                    {exam.type} · {exam.date}
                  </Text>
                </View>

                <View style={[styles.countdownBadge, { backgroundColor: diffDays === 0 ? colors.amberSubtle : colors.surfaceSubtle }]}>
                  <Text style={[styles.countdownNumber, { color: diffDays === 0 ? colors.amber : diffDays > 0 ? colors.accent : colors.textTertiary }]}>
                    {diffDays === 0 ? 'TODAY' : diffDays > 0 ? diffDays : 'DONE'}
                  </Text>
                  {diffDays > 0 && <Text style={[styles.countdownLabel, { color: colors.textTertiary }]}>DAYS</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Attendance Ledger & History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <History size={14} color={colors.textSecondary} />
            <Text style={[styles.historyTitle, { color: colors.textTertiary }]}>ATTENDANCE LEDGER</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilters}>
            {(['ALL', 'PRESENT', 'ABSENT', 'CANCELLED'] as const).map(hf => (
              <TouchableOpacity
                key={`hf_${hf}`}
                style={[
                  styles.historyPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  historyFilter === hf && { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight },
                ]}
                onPress={() => {
                  AppHaptics.selection();
                  setHistoryFilter(hf);
                }}
              >
                <Text
                  style={[
                    styles.historyPillText,
                    { color: colors.textTertiary },
                    historyFilter === hf && { color: colors.textPrimary },
                  ]}
                >
                  {hf === 'CANCELLED' ? 'NO CLASS' : hf}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredRecords.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                No {historyFilter !== 'ALL' ? historyFilter.toLowerCase() : ''} records logged yet.
              </Text>
            </View>
          ) : (
            filteredRecords.slice(0, visibleRecordCount).map(rec => {
              const isBaseline = rec.slotTime === 'Initial Baseline';
              const statusColor =
                rec.status === 'PRESENT'
                  ? colors.emerald
                  : rec.status === 'ABSENT'
                  ? colors.crimson
                  : rec.status === 'OD'
                  ? colors.accent
                  : colors.textTertiary;

              return (
                <View key={rec.id} style={[styles.historyCard, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.historyLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.historyDate, { color: colors.textTertiary }]}>{rec.date}</Text>
                      {rec.slotTime && (
                        <Text style={[styles.historySlotTime, { color: isBaseline ? colors.accent : colors.textTertiary }]}>
                          · {rec.slotTime}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.historySubject, { color: colors.textPrimary }]}>{rec.subjectName}</Text>
                    {rec.note && isBaseline && (
                      <Text style={[styles.historyNote, { color: colors.textTertiary }]}>{rec.note}</Text>
                    )}
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={[styles.statusTagText, { color: statusColor }]}>{rec.status}</Text>
                    <TouchableOpacity
                      style={styles.deleteRecordBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${rec.status} record for ${rec.subjectName} on ${rec.date}`}
                      onPress={() => {
                        Alert.alert(
                          'Delete Attendance Record?',
                          `Delete ${rec.status} record for ${rec.subjectName} on ${rec.date}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                AppHaptics.light();
                                deleteAttendanceRecord(rec.id);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={12} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {filteredRecords.length > visibleRecordCount && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
              onPress={() => {
                AppHaptics.light();
                setVisibleRecordCount(prev => prev + 30);
              }}
            >
              <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>
                + Load More Records ({filteredRecords.length - visibleRecordCount} remaining)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit / Add Exam Date Modal */}
      <Modal
        visible={isExamModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsExamModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {editingExamId ? 'Edit Exam Timeline' : 'Add Exam'}
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsExamModalOpen(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: THEME.spacing.xl }}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXAM TITLE</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="e.g. Mid-Term Examination (Theory)"
                  placeholderTextColor={colors.textTertiary}
                  value={examName}
                  onChangeText={setExamName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXAM DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={examDate}
                  onChangeText={setExamDate}
                />
              </View>

              <View style={styles.shortcutsRow}>
                {[15, 30, 45, 60, 90].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[styles.shortcutBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                    onPress={() => setQuickDateDaysFromNow(days)}
                  >
                    <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>+{days}d</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveExamBtn, { backgroundColor: colors.textPrimary }]}
                activeOpacity={0.8}
                onPress={handleSaveExam}
              >
                <Text style={[styles.saveExamBtnText, { color: colors.textInverse }]}>Save Exam</Text>
              </TouchableOpacity>

              {editingExamId && (
                <TouchableOpacity
                  style={styles.deleteExamBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this academic exam"
                  onPress={handleDeleteCurrentExam}
                >
                  <Trash2 size={14} color={colors.crimson} />
                  <Text style={[styles.deleteExamBtnText, { color: colors.crimson }]}>Delete Exam</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
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
    letterSpacing: THEME.typography.letterSpacing.widest,
  },
  screenTitle: {
    fontSize: THEME.typography.sizes.headline,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 38,
  },
  screenSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    marginTop: 2,
    fontWeight: THEME.typography.weights.medium,
  },
  forecastCard: {
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
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
    letterSpacing: 1,
  },
  forecastResultBox: {
    marginVertical: 6,
  },
  forecastResultPct: {
    fontSize: 42,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -1,
  },
  forecastResultSub: {
    fontSize: 11,
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
    borderRadius: THEME.borderRadius.pill,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  rateChipActive: {},
  rateChipText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  rateChipTextActive: {},
  healthCard: {
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
  },
  healthSummary: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 10,
  },
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  breakdownLbl: {
    fontSize: 9.5,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  breakdownDivider: {
    width: 1,
    height: 16,
  },
  marksCard: {
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
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
  },
  marksSubtitle: {
    fontSize: 10,
  },
  marksScoreText: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.heavy,
  },
  slabsBar: {
    flexDirection: 'row',
    gap: 4,
  },
  slabBox: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  slabBoxActive: {},
  slabLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  slabLabelActive: {},
  slabScore: {
    fontSize: 8.5,
    marginTop: 1,
  },
  slabScoreActive: {},
  examsCard: {
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
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
    letterSpacing: 1,
  },
  addExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  addExamBtnText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
  },
  examItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  examItemName: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  examItemDate: {
    fontSize: 10,
    marginTop: 1,
  },
  countdownBadge: {
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 38,
  },
  countdownNumber: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.heavy,
  },
  countdownLabel: {
    fontSize: 7,
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
    letterSpacing: 1,
  },
  historyFilters: {
    gap: 4,
    paddingBottom: 8,
  },
  historyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  historyPillActive: {},
  historyPillText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
  },
  historyPillTextActive: {},
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 9,
  },
  historySubject: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    marginTop: 1,
  },
  historySlotTime: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.medium,
  },
  historyNote: {
    fontSize: 9.5,
    fontStyle: 'italic',
    marginTop: 2,
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
  loadMoreBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  loadMoreText: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
  },
  modalSheetTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  textInput: {
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: THEME.typography.sizes.sm,
    borderWidth: 1,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  shortcutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
  },
  shortcutBtnText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
  },
  saveExamBtn: {
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  saveExamBtnText: {
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
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  emptyAnalyticsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xxl,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.xl,
    borderWidth: 1,
    gap: 8,
  },
  emptyAnalyticsTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    marginTop: 4,
  },
  emptyAnalyticsSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
});
