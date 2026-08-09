import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

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
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const start = previousValueRef.current;
    const end = value;
    if (start === end) return;

    const duration = 450; // ms
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;

      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        previousValueRef.current = end;
        setDisplayValue(end);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <Text style={[styles.defaultStyle, style]}>
      {displayValue.toFixed(decimals)}
      {suffix}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultStyle: {
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: THEME.typography.weights.heavy,
  },
});
