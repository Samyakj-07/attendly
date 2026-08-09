import { Animated, Easing } from 'react-native';

export const MOTION = {
  // Springs
  spring: {
    gentle: {
      tension: 180,
      friction: 24,
      useNativeDriver: true,
    },
    responsive: {
      tension: 280,
      friction: 26,
      useNativeDriver: true,
    },
    snappy: {
      tension: 380,
      friction: 28,
      useNativeDriver: true,
    },
    bouncy: {
      tension: 240,
      friction: 16,
      useNativeDriver: true,
    },
  },

  // Timing
  timing: {
    micro: 140,
    fast: 220,
    standard: 320,
    deliberate: 440,
  },

  // Easings
  easing: {
    easeOut: Easing.bezier(0.16, 1, 0.3, 1),
    easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  },
};
