import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  style?: TextStyle | TextStyle[];
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 1,
  suffix = '',
  style,
}) => {
  const { colors } = useTheme();
  const safeValue = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);
  const previousValueRef = useRef(safeValue);

  useEffect(() => {
    const start = Number.isFinite(previousValueRef.current) ? previousValueRef.current : 0;
    const end = Number.isFinite(value) ? value : 0;
    if (start === end) return;

    const duration = 400; // ms
    const startTime = Date.now();
    let latestValue = start;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      latestValue = Number.isFinite(current) ? current : end;

      setDisplayValue(latestValue);

      if (progress >= 1) {
        clearInterval(interval);
        previousValueRef.current = end;
        setDisplayValue(end);
      }
    }, 24); // ~40 FPS for efficient JS thread performance

    return () => {
      clearInterval(interval);
      previousValueRef.current = latestValue;
    };
  }, [value]);

  const outputNumber = Number.isFinite(displayValue) ? displayValue.toFixed(decimals) : '0';

  return (
    <Text style={[styles.defaultStyle, { color: colors.textPrimary }, style]}>
      {outputNumber}
      {suffix}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultStyle: {
    fontFamily: THEME.typography.fontFamily,
    fontWeight: THEME.typography.weights.heavy,
  },
});
