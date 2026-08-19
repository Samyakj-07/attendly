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
  const { colors } = useTheme();
  const { profile } = useAttendance();
  const handleOpenAI = onOpenAskAttendly;

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning,';
    if (hours < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

  const studentFirstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const collegeName = profile.collegeShort || 'GGSIPU';
  const branchSem = `${profile.programme || 'B.Tech'} ${profile.branch ? `· ${profile.branch}` : ''} · Sem ${profile.semester || 1}`;

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image
            source={APP_LOGO}
            style={[
              styles.brandLogo,
              { borderColor: colors.borderSubtle, backgroundColor: colors.surface },
            ]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.wordmark, { color: colors.textPrimary }]}>{BRAND.displayName}</Text>
            <View style={[styles.signalDot, { backgroundColor: colors.accent }]} />
          </View>
        </View>

        {handleOpenAI && (
          <TouchableOpacity
            style={[
              styles.askButton,
              {
                backgroundColor: '#E8F0FF',
                borderColor: 'rgba(59, 130, 246, 0.2)',
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Ask Attendly Intelligence Assistant"
            onPress={() => {
              AppHaptics.light();
              handleOpenAI();
            }}
          >
            <Sparkles size={13} color={colors.accent} />
            <Text style={[styles.askButtonText, { color: colors.navy }]}>Ask Attendly</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Editorial Magazine Greeting */}
      <View style={styles.greetingSection}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {dayName.toUpperCase()} · {dateStr.toUpperCase()}
        </Text>

        <Text style={[styles.greetingSalutation, { color: colors.textSecondary }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.greetingName, { color: colors.textPrimary }]}>
          {studentFirstName}.
        </Text>

        {/* Academic Identity Strip */}
        <View style={styles.academicMetaRow}>
          <View style={[styles.academicBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.academicBadgeText, { color: colors.navy }]}>{collegeName}</Text>
          </View>
          <Text style={[styles.academicMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
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
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  brandLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wordmark: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -0.3,
  },
  signalDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  askButtonText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    letterSpacing: 0.2,
  },
  greetingSection: {
    marginTop: 2,
    marginBottom: THEME.spacing.sm,
  },
  dateText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  greetingSalutation: {
    fontSize: 15,
    fontWeight: THEME.typography.weights.medium,
    marginTop: 8,
  },
  greetingName: {
    fontSize: 32,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: -1,
    lineHeight: 38,
    marginTop: 1,
  },
  academicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  academicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  academicBadgeText: {
    fontSize: 9.5,
    fontWeight: THEME.typography.weights.heavy,
    letterSpacing: 0.4,
  },
  academicMetaText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    flex: 1,
  },
});

