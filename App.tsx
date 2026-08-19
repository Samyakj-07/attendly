import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, StatusBar as RNStatusBar, BackHandler } from 'react-native';
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
import { AnimatedTabScene } from './src/components/AnimatedTabScene';
import { Analytics } from './src/utils/analytics';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const TAB_ORDER: Record<NavTab, number> = {
  HOME: 0,
  ATTENDANCE: 1,
  TIMETABLE: 2,
  INSIGHTS: 3,
  PROFILE: 4,
};

const MainAppContent: React.FC = () => {
  const { profile, isLoading } = useAttendance();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [navDirection, setNavDirection] = useState<number>(1);
  const [tabHistory, setTabHistory] = useState<NavTab[]>(['HOME']);

  // On Android, apply status bar offset if translucent; on iOS, screen SafeAreaViews handle top inset cleanly
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0;

  const handleSelectTab = (newTab: NavTab) => {
    if (newTab === activeTab) return;
    const currentIdx = TAB_ORDER[activeTab];
    const nextIdx = TAB_ORDER[newTab];
    setNavDirection(nextIdx >= currentIdx ? 1 : -1);
    setActiveTab(newTab);
    setTabHistory(prev => {
      const filtered = prev.filter(t => t !== newTab);
      return [...filtered, newTab].slice(-5);
    });
  };

  // Handle Android hardware back press to step through tab history before exiting
  useEffect(() => {
    const onBackPress = () => {
      if (tabHistory.length > 1) {
        const nextHistory = [...tabHistory];
        nextHistory.pop(); // Pop current tab
        const previousTab = nextHistory[nextHistory.length - 1] || 'HOME';
        setNavDirection(TAB_ORDER[previousTab] >= TAB_ORDER[activeTab] ? 1 : -1);
        setTabHistory(nextHistory);
        setActiveTab(previousTab);
        return true;
      }
      if (activeTab !== 'HOME') {
        setNavDirection(-1);
        setActiveTab('HOME');
        setTabHistory(['HOME']);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [tabHistory, activeTab]);

  // Initialize Telemetry on mount
  useEffect(() => {
    Analytics.init().then(() => {
      Analytics.track('app_opened', {
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
        <StatusBar style="dark" />
        <OnboardingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <StatusBar style="dark" translucent={true} />
      <View style={styles.screenContainer}>
        <AnimatedTabScene isActive={activeTab === 'HOME'} direction={navDirection} isInitialMount={true}>
          <HomeScreen onNavigateTab={handleSelectTab} />
        </AnimatedTabScene>
        <AnimatedTabScene isActive={activeTab === 'ATTENDANCE'} direction={navDirection}>
          <AttendanceScreen />
        </AnimatedTabScene>
        <AnimatedTabScene isActive={activeTab === 'TIMETABLE'} direction={navDirection}>
          <TimetableScreen />
        </AnimatedTabScene>
        <AnimatedTabScene isActive={activeTab === 'INSIGHTS'} direction={navDirection}>
          <InsightsScreen />
        </AnimatedTabScene>
        <AnimatedTabScene isActive={activeTab === 'PROFILE'} direction={navDirection}>
          <ProfileScreen />
        </AnimatedTabScene>
      </View>

      <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
    </View>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AttendanceProvider>
            <MainAppContent />
          </AttendanceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
