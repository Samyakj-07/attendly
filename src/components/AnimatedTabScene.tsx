import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';
import { MOTION } from '../utils/motion';

interface AnimatedTabSceneProps {
  isActive: boolean;
  direction?: number; // +1 if moving rightwards in tab bar, -1 if moving leftwards
  isInitialMount?: boolean;
  children: React.ReactNode;
}

export const AnimatedTabScene: React.FC<AnimatedTabSceneProps> = ({
  isActive,
  direction = 1,
  isInitialMount = false,
  children,
}) => {
  const hasEverBeenActive = useRef(isActive || isInitialMount);
  if (isActive && !hasEverBeenActive.current) {
    hasEverBeenActive.current = true;
  }

  const opacity = useRef(new Animated.Value(isInitialMount && isActive ? 1 : 0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isFirstRun = useRef(true);

  useEffect(() => {
    const useNative = Platform.OS !== 'web';

    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (isInitialMount && isActive) {
        opacity.setValue(1);
        translateX.setValue(0);
        return;
      }
    }

    if (isActive) {
      const startOffset = direction * 32;
      translateX.setValue(startOffset);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
        Animated.timing(translateX, {
          toValue: -direction * 20,
          duration: 180,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
      ]).start();
    }
  }, [isActive, direction]);

  if (!hasEverBeenActive.current) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.scene,
        {
          opacity,
          transform: [{ translateX }],
          zIndex: isActive ? 1 : 0,
        },
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scene: {
    ...StyleSheet.absoluteFillObject,
  },
});
