import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { Header } from '../components/Header';
import { AttendanceHero } from '../components/AttendanceHero';
import { TimetableItem } from '../components/TimetableItem';
import { CanISkipModal } from '../components/CanISkipModal';
import { SimulatorModal } from '../components/SimulatorModal';
import { RecoveryModal } from '../components/RecoveryModal';
import { AskIPUModal } from '../components/AskIPUModal';
import { Subject } from '../types';
import {
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
  RotateCcw,
  Zap,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';
import { attendancePercentage, attendanceBuffer } from '../utils/ipuEngine';

interface HomeScreenProps {
  onNavigateTab: (tab: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const {
    todaySlots,
    todayDay,
    subjects,
    records,
    undoLastAction,
    markAttendance,
    profile,
  } = useAttendance();

  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isAskIPUOpen, setIsAskIPUOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const target = profile.targetAttendance || 75;

  // Find most critical subject
  const criticalSubject = [...subjects]
    .filter(s => (s.attended / (s.total || 1)) * 100 < (s.targetRequirement || target))
    .sort((a, b) => (a.attended / (a.total || 1)) - (b.attended / (b.total || 1)))[0];

  const subjectMap = new Map<string, Subject>();
  subjects.forEach(s => subjectMap.set(s.id, s));

  const hasRecentAction = records.length > 0;
  const lastRecord = records[0];

  // 1-Tap Mark Full Day Present
  const handleMarkAllTodayPresent = () => {
    AppHaptics.success();
    todaySlots.forEach(slot => {
      markAttendance(slot.subjectId, 'PRESENT', {
        time: `${slot.startTime} - ${slot.endTime}`,
        room: slot.room,
        note: `Batch Present (${todayDay})`,
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Editorial Header */}
        <Header onOpenAskIPU={() => setIsAskIPUOpen(true)} />

        {/* 2. Kinetic Attendance Hero Instrument */}
        <AttendanceHero
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onOpenMarks={() => onNavigateTab('INSIGHTS')}
        />

        {/* 3. Magnetic Floating "CAN I SKIP TODAY?" Action Controller */}
        <TouchableOpacity
          style={styles.canISkipHero}
          activeOpacity={0.85}
          onPress={() => {
            AppHaptics.heavy();
            setIsSkipModalOpen(true);
          }}
        >
          <View style={styles.canISkipLeft}>
            <View style={styles.skipBadge}>
              <Sparkles size={10} color={THEME.colors.cyan} />
              <Text style={styles.skipBadgeText}>INTELLIGENCE ENGINE</Text>
            </View>
            <Text style={styles.skipTitle}>CAN I SKIP TODAY?</Text>
            <Text style={styles.skipSubtitle}>
              Check which classes are safe to miss vs detention risk
            </Text>
          </View>
          <View style={styles.skipCircleIcon}>
            <ChevronRight size={18} color={THEME.colors.textPrimary} />
          </View>
        </TouchableOpacity>

        {/* 4. Undo Toast if student just marked something */}
        {hasRecentAction && (
          <View style={styles.undoCard}>
            <View style={styles.undoLeft}>
              <CalendarCheck size={12} color={THEME.colors.cyan} />
              <Text style={styles.undoText} numberOfLines={1}>
                Marked <Text style={{ fontWeight: '700', color: THEME.colors.textPrimary }}>{lastRecord.subjectName}</Text> as{' '}
                <Text style={{ color: THEME.colors.cyan, fontWeight: '700' }}>
                  {lastRecord.status}
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.undoBtn}
              activeOpacity={0.7}
              onPress={() => undoLastAction()}
            >
              <RotateCcw size={10} color={THEME.colors.textSecondary} />
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Critical Attention Callout */}
        {criticalSubject && (
          <TouchableOpacity
            style={styles.attentionCard}
            activeOpacity={0.8}
            onPress={() => {
              AppHaptics.light();
              setSelectedSubject(criticalSubject);
              setIsRecoveryOpen(true);
            }}
          >
            <View style={styles.attentionTop}>
              <View style={styles.attentionBadge}>
                <ShieldAlert size={11} color={THEME.colors.crimson} />
                <Text style={styles.attentionBadgeText}>ATTENTION REQUIRED</Text>
              </View>
              <Text style={styles.attentionPct}>
                {attendancePercentage(criticalSubject.attended, criticalSubject.total).toFixed(1)}%
              </Text>
            </View>

            <Text style={styles.attentionSubjectName}>{criticalSubject.name}</Text>
            <Text style={styles.attentionReason}>
              Short by {Math.abs(attendanceBuffer(criticalSubject.attended, criticalSubject.total, target))} lectures.
              Missing next lecture triggers official IPU detention list.
            </Text>

            <Text style={styles.rescueBtnText}>View Step-by-Step Escape Plan →</Text>
          </TouchableOpacity>
        )}

        {/* 6. Today's Timeline Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
            <Text style={styles.sectionSubtitle}>
              {todayDay} · {todaySlots.length} Classes
            </Text>
          </View>

          {todaySlots.length > 0 && (
            <TouchableOpacity
              style={styles.quickMarkAllBtn}
              activeOpacity={0.75}
              onPress={handleMarkAllTodayPresent}
            >
              <Zap size={11} color={THEME.colors.emerald} />
              <Text style={styles.quickMarkAllText}>All Present</Text>
            </TouchableOpacity>
          )}
        </View>

        {todaySlots.length === 0 ? (
          <View style={styles.noClassesCard}>
            <Text style={styles.noClassesText}>No classes scheduled for {todayDay}.</Text>
            <TouchableOpacity
              style={styles.goToTimetableBtn}
              onPress={() => onNavigateTab('TIMETABLE')}
            >
              <Text style={styles.goToTimetableText}>View Weekly Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todaySlots.map(slot => {
            const sub = subjectMap.get(slot.subjectId);
            return (
              <TimetableItem
                key={slot.id}
                slot={slot}
                subject={sub}
                showActions={true}
              />
            );
          })
        )}
      </ScrollView>

      {/* Modals */}
      <CanISkipModal
        visible={isSkipModalOpen}
        onClose={() => setIsSkipModalOpen(false)}
      />

      <SimulatorModal
        visible={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      <RecoveryModal
        visible={isRecoveryOpen}
        subject={selectedSubject}
        onClose={() => {
          setIsRecoveryOpen(false);
          setSelectedSubject(null);
        }}
      />

      <AskIPUModal
        visible={isAskIPUOpen}
        onClose={() => setIsAskIPUOpen(false)}
      />
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
  canISkipHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
  },
  canISkipLeft: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  skipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cyanSubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    marginBottom: 6,
  },
  skipBadgeText: {
    color: THEME.colors.cyan,
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.8,
  },
  skipTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.2,
  },
  skipSubtitle: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.regular,
    marginTop: 2,
  },
  skipCircleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  undoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  undoText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flexShrink: 1,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  undoBtnText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.bold,
  },
  attentionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  attentionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.crimsonSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  attentionBadgeText: {
    color: THEME.colors.crimson,
    fontSize: 8,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.6,
  },
  attentionPct: {
    color: THEME.colors.crimson,
    fontSize: 13,
    fontWeight: THEME.typography.weights.heavy,
    fontFamily: 'monospace',
  },
  attentionSubjectName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  attentionReason: {
    fontSize: 11,
    color: THEME.colors.textTertiary,
    marginTop: 2,
    lineHeight: 15,
  },
  rescueBtnText: {
    fontSize: 10,
    color: THEME.colors.crimson,
    fontWeight: THEME.typography.weights.bold,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  quickMarkAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.emeraldSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  quickMarkAllText: {
    fontSize: 10,
    color: THEME.colors.emerald,
    fontWeight: THEME.typography.weights.bold,
  },
  noClassesCard: {
    padding: 24,
    marginHorizontal: THEME.spacing.xl,
    alignItems: 'center',
  },
  noClassesText: {
    color: THEME.colors.textTertiary,
    fontSize: THEME.typography.sizes.xs,
  },
  goToTimetableBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  goToTimetableText: {
    color: THEME.colors.cyan,
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
});
