import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { THEME } from '../constants/theme';
import {
  Home,
  BookOpen,
  Calendar,
  BarChart3,
  User,
} from 'lucide-react-native';
import { AppHaptics } from '../utils/haptics';

export type NavTab = 'HOME' | 'ATTENDANCE' | 'TIMETABLE' | 'INSIGHTS' | 'PROFILE';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs: Array<{ id: NavTab; label: string; icon: React.FC<any> }> = [
    { id: 'HOME', label: 'Command', icon: Home },
    { id: 'ATTENDANCE', label: 'Courses', icon: BookOpen },
    { id: 'TIMETABLE', label: 'Schedule', icon: Calendar },
    { id: 'INSIGHTS', label: 'Analytics', icon: BarChart3 },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.navBar}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          const IconComponent = t.icon;

          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => {
                AppHaptics.selection();
                onSelectTab(t.id);
              }}
            >
              <IconComponent
                size={18}
                color={isActive ? THEME.colors.textPrimary : THEME.colors.textTertiary}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {t.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.borderRadius.xxl,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    width: '100%',
    maxWidth: 420,
    ...THEME.shadows.floating,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.lg,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.surfaceGlassHover,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 3,
    fontWeight: THEME.typography.weights.semibold,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: THEME.colors.textPrimary,
    fontWeight: THEME.typography.weights.heavy,
  },
  tabLabelInactive: {
    color: THEME.colors.textTertiary,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.cyan,
  },
});
