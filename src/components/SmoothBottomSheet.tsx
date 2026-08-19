import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../constants/theme';
import { MOTION } from '../utils/motion';

interface SmoothBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string | number;
  height?: string | number;
  style?: any;
  showHandle?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SmoothBottomSheet: React.FC<SmoothBottomSheetProps> = ({
  visible,
  onClose,
  children,
  maxHeight = '88%',
  height,
  style,
  showHandle = true,
}) => {
  const { colors } = useTheme();
  const [isMounted, setIsMounted] = useState(visible);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.75)).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    if (visible) {
      setIsMounted(true);
      // Fluid entrance: backdrop fade + bottom sheet smooth easeOut
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 320,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else if (isMounted) {
      // Fluid exit: smooth slide down + fade out
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT * 0.75,
          duration: 220,
          easing: MOTION.easing.easeOut,
          useNativeDriver: useNative,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [visible]);

  const handleRequestClose = () => {
    onClose();
  };

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Animated Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={handleRequestClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: colors.modalOverlay,
                opacity: backdropAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated Bottom Sheet Content */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxHeight: maxHeight as any,
              ...(height ? { height: height as any } : {}),
              transform: [{ translateY: sheetTranslateY }],
            },
            style,
          ]}
        >
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: '#D4D3CC' }]} />
            </View>
          )}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    width: '100%',
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    width: '100%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
