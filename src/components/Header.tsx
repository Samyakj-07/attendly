import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { useAttendance } from '../context/AttendanceContext';
import { Sparkles } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

interface HeaderProps {
  onOpenAskIPU?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAskIPU }) => {
  const { profile } = useAttendance();

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const month = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
    return `${day} · ${month}`;
  };

  const studentFirstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const collegeMeta = `${profile.collegeShort || 'IPU'} · ${profile.programme || 'B.Tech'} ${profile.branch || 'Course'} · Semester ${profile.semester || 1}`;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{getFormattedDate()}</Text>

        {onOpenAskIPU && (
          <TouchableOpacity
            style={styles.askButton}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              onOpenAskIPU();
            }}
          >
            <Sparkles size={11} color={THEME.colors.textSecondary} />
            <Text style={styles.askButtonText}>Ask IPU</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headlineBlock}>
        <Text style={styles.greetingLine}>{getGreeting()},</Text>
        <Text style={styles.nameLine}>{studentFirstName}.</Text>
      </View>

      <Text style={styles.metaLine}>{collegeMeta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.xs,
    paddingBottom: THEME.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  eyebrow: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textTertiary,
    letterSpacing: THEME.typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  askButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    letterSpacing: 0.3,
  },
  headlineBlock: {
    marginTop: 2,
  },
  greetingLine: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.regular,
    color: THEME.colors.textSecondary,
    letterSpacing: THEME.typography.letterSpacing.tight,
    lineHeight: 32,
  },
  nameLine: {
    fontSize: THEME.typography.sizes.headline,
    fontWeight: THEME.typography.weights.heavy,
    color: THEME.colors.textPrimary,
    letterSpacing: THEME.typography.letterSpacing.tighter,
    lineHeight: 38,
  },
  metaLine: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textTertiary,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
