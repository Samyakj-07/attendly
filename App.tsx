import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AttendanceProvider, useAttendance } from './src/context/AttendanceContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BottomNav, NavTab } from './src/components/BottomNav';
import { Analytics } from './src/utils/analytics';

const MainAppContent: React.FC = () => {
  const { profile, isLoading } = useAttendance();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0
  );

  // Initialize Telemetry on mount
  useEffect(() => {
    Analytics.init().then(() => {
      Analytics.track('app_opened', {
        theme_mode: isDark ? 'dark' : 'light',
        is_onboarded: profile.isOnboarded,
      });
    });
  }, []);

  // Update academic identity traits when profile is ready
  useEffect(() => {
    if (profile.isOnboarded) {
      Analytics.identify({
        college: profile.college,
        collegeShort: profile.collegeShort,
        programme: profile.programme,
        branch: profile.branch,
        semester: profile.semester,
        targetAttendance: profile.targetAttendance,
      });
    }
  }, [profile.isOnboarded, profile.collegeShort, profile.branch, profile.semester]);

  // Track tab screen navigation
  useEffect(() => {
    if (profile.isOnboarded) {
      const tabNames: Record<NavTab, string> = {
        HOME: 'Command',
        ATTENDANCE: 'Courses',
        TIMETABLE: 'Timetable',
        INSIGHTS: 'Analytics',
        PROFILE: 'Profile',
      };
      Analytics.screen(tabNames[activeTab] || activeTab, { tab_key: activeTab });
    }
  }, [activeTab, profile.isOnboarded]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profile.isOnboarded) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={true} />
      <View style={styles.screenContainer}>
        {activeTab === 'HOME' && <HomeScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'ATTENDANCE' && <AttendanceScreen />}
        {activeTab === 'TIMETABLE' && <TimetableScreen />}
        {activeTab === 'INSIGHTS' && <InsightsScreen />}
        {activeTab === 'PROFILE' && <ProfileScreen />}
      </View>

      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AttendanceProvider>
          <MainAppContent />
        </AttendanceProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
