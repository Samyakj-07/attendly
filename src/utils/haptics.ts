import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const triggerWebVibrate = (pattern: number | number[]) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && 'vibrate' in window.navigator) {
    try {
      window.navigator.vibrate(pattern);
    } catch (_) {}
  }
};

export const AppHaptics = {
  light() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    } else {
      triggerWebVibrate(10);
    }
  },

  medium() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    } else {
      triggerWebVibrate(20);
    }
  },

  heavy() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (e) {}
    } else {
      triggerWebVibrate(35);
    }
  },

  success() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } else {
      triggerWebVibrate([15, 50, 25]);
    }
  },

  warning() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {}
    } else {
      triggerWebVibrate([30, 40, 30]);
    }
  },

  error() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } else {
      triggerWebVibrate([50, 60, 50]);
    }
  },

  selection() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (e) {}
    } else {
      triggerWebVibrate(8);
    }
  },
};

