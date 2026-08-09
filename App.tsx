import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from './src/constants/theme';
import { AttendanceProvider, useAttendance } from './src/context/AttendanceContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BottomNav, NavTab } from './src/components/BottomNav';

const MainAppContent: React.FC = () => {
  const { profile, isLoading } = useAttendance();
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={THEME.colors.cyan} />
      </View>
    );
  }

  if (!profile.isOnboarded) {
    return (
      <View style={[styles.mainContainer, { paddingTop: topInset }]}>
        <StatusBar style="light" />
        <OnboardingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { paddingTop: topInset }]}>
      <StatusBar style="light" translucent={true} />
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
      <AttendanceProvider>
        <MainAppContent />
      </AttendanceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
