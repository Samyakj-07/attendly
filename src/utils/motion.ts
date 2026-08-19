import { Animated, Easing } from 'react-native';

export const MOTION = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 500,
    hero: 750,
  },
  easing: {
    easeOut: Easing.bezier(0.16, 1, 0.3, 1),
    easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
    springSoft: Easing.bezier(0.25, 1, 0.5, 1),
  },
};

/**
 * Creates an animated entrance controller (fade in + slight translate Y up).
 */
export const createEntranceAnimation = (
  opacity: Animated.Value,
  translateY: Animated.Value,
  delay: number = 0
) => {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.duration.normal,
      delay,
      easing: MOTION.easing.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: MOTION.duration.normal,
      delay,
      easing: MOTION.easing.easeOut,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Tactile scale press feedback animator.
 */
export const pressInScale = (scaleAnim: Animated.Value, toValue = 0.98) => {
  Animated.timing(scaleAnim, {
    toValue,
    duration: MOTION.duration.fast,
    easing: MOTION.easing.easeOut,
    useNativeDriver: true,
  }).start();
};

export const pressOutScale = (scaleAnim: Animated.Value) => {
  Animated.timing(scaleAnim, {
    toValue: 1,
    duration: MOTION.duration.fast,
    easing: MOTION.easing.easeOut,
    useNativeDriver: true,
  }).start();
};
