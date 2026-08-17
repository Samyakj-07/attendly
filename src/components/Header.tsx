import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { BRAND } from '../constants/brand';
import { useAttendance } from '../context/AttendanceContext';
import { Sparkles } from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

const APP_LOGO = require('../../assets/icon.png');

interface HeaderProps {
  onOpenAskAttendly?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAskAttendly }) => {
  const { colors, isDark } = useTheme();
  const { profile } = useAttendance();
  const handleOpenAI = onOpenAskAttendly;

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${day} · ${month}`;
  };

  const studentFirstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const collegeName = profile.collegeShort || 'GGSIPU';
  const branchSem = `${profile.programme || 'B.Tech'} ${profile.branch ? `· ${profile.branch}` : ''} · Sem ${profile.semester || 1}`;

  return (
    <View style={styles.container}>
      {/* Top Glass Navigation Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={[styles.logoContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <Image source={APP_LOGO} style={styles.brandLogo} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[styles.wordmark, { color: colors.textPrimary }]}>{BRAND.displayName}</Text>
              <View style={[styles.livePulseDot, { backgroundColor: colors.emerald }]} />
            </View>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>{getFormattedDate()}</Text>
          </View>
        </View>

        {handleOpenAI && (
          <TouchableOpacity
            style={[
              styles.askButton,
              {
                backgroundColor: colors.accentSubtle,
                borderColor: colors.borderHighlight,
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.1,
                shadowRadius: 8,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              AppHaptics.light();
              handleOpenAI();
            }}
          >
            <Sparkles size={12} color={colors.accent} />
            <Text style={[styles.askButtonText, { color: colors.accent }]}>Ask Attendly</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Greeting & Academic Capsule */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greetingSubtitle, { color: colors.textTertiary }]}>
          {getGreeting().toUpperCase()}
        </Text>
        <Text style={[styles.greetingName, { color: colors.textPrimary }]}>
          {studentFirstName}.
        </Text>

        <View style={[styles.academicPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={[styles.academicTag, { backgroundColor: colors.accentSubtle }]}>
            <Text style={[styles.academicTagText, { color: colors.accent }]}>{collegeName}</Text>
          </View>
          <Text style={[styles.academicText, { color: colors.textSecondary }]} numberOfLines={1}>
            {branchSem}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.xl,
    paddingTop: THEME.spacing.xs,
    paddingBottom: THEME.spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  brandLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  wordmark: {
    fontSize: 14.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.4,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dateText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 1,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  askButtonText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.2,
  },
  greetingSection: {
    marginBottom: THEME.spacing.xs,
  },
  greetingSubtitle: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.5,
  },
  greetingName: {
    fontSize: 32,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -1.2,
    lineHeight: 38,
    marginTop: 1,
  },
  academicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    marginTop: 8,
  },
  academicTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  academicTagText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.3,
  },
  academicText: {
    fontSize: 10.5,
    fontWeight: THEME.typography.weights.medium,
    paddingRight: 4,
  },
});
