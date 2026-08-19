import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  Compass,
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs: Array<{ id: NavTab; label: string; icon: React.FC<any> }> = [
    { id: 'HOME', label: 'Command', icon: Compass },
    { id: 'ATTENDANCE', label: 'Courses', icon: BookOpen },
    { id: 'TIMETABLE', label: 'Schedule', icon: Calendar },
    { id: 'INSIGHTS', label: 'Analytics', icon: BarChart3 },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 16);

  return (
    <View style={[styles.floatingWrapper, { bottom: bottomInset }]} pointerEvents="box-none">
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#111827',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 4,
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
                    backgroundColor: colors.softBlue,
                  },
                ],
              ]}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${t.label} tab`}
              onPress={() => {
                AppHaptics.selection();
                onSelectTab(t.id);
              }}
            >
              <IconComponent
                size={19}
                color={isActive ? colors.navy : colors.textTertiary}
                strokeWidth={isActive ? 2.2 : 1.75}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.navy : colors.textTertiary },
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
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: THEME.borderRadius.xxl,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    minHeight: 64,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: THEME.borderRadius.xl,
  },
  tabButtonActive: {
    borderRadius: THEME.borderRadius.xl,
  },
  tabLabel: {
    fontSize: 9.5,
    marginTop: 3,
    fontWeight: THEME.typography.weights.medium,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: THEME.typography.weights.bold,
  },
});
