import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
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
  const { colors, isDark } = useTheme();

  const tabs: Array<{ id: NavTab; label: string; icon: React.FC<any> }> = [
    { id: 'HOME', label: 'Command', icon: Home },
    { id: 'ATTENDANCE', label: 'Courses', icon: BookOpen },
    { id: 'TIMETABLE', label: 'Schedule', icon: Calendar },
    { id: 'INSIGHTS', label: 'Analytics', icon: BarChart3 },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: isDark ? 'rgba(16, 16, 22, 0.94)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 17, 19, 0.08)',
            shadowColor: isDark ? '#000000' : '#6366F1',
            shadowOffset: { width: 0, height: isDark ? 10 : 6 },
            shadowOpacity: isDark ? 0.6 : 0.12,
            shadowRadius: isDark ? 28 : 20,
            elevation: isDark ? 14 : 10,
          },
        ]}
      >
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          const IconComponent = t.icon;

          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tabButton,
                isActive && [
                  styles.tabButtonActive,
                  {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.10)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.20)',
                    borderWidth: 1,
                  },
                ],
              ]}
              activeOpacity={0.75}
              onPress={() => {
                AppHaptics.selection();
                onSelectTab(t.id);
              }}
            >
              <IconComponent
                size={18}
                color={isActive ? colors.accent : colors.textTertiary}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? (isDark ? colors.textPrimary : colors.accent) : colors.textTertiary },
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
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
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: THEME.borderRadius.xxl,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderRadius: THEME.borderRadius.pill,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2.5,
    fontWeight: THEME.typography.weights.semibold,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: THEME.typography.weights.heavy,
  },
});
