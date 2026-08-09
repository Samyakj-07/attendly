import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { THEME } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface KineticAttendanceRingProps {
  percentage: number;
  target?: number;
  size?: number;
  strokeWidth?: number;
  statusColor?: string;
}

export const KineticAttendanceRing: React.FC<KineticAttendanceRingProps> = ({
  percentage,
  target = 75,
  size = 230,
  strokeWidth = 4,
  statusColor = THEME.colors.emerald,
}) => {
  const animatedProgress = useRef(new Animated.Value(percentage)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: Math.min(100, Math.max(0, percentage)),
      tension: 180,
      friction: 24,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const center = size / 2;
  const radius = center - strokeWidth - 10;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  // Calculate target notch coordinates (75% mark is 3/4 circle = 270 deg from top -90deg = 180deg)
  const targetAngle = ((target / 100) * 360 - 90) * (Math.PI / 180);
  const notchX1 = center + (radius - 7) * Math.cos(targetAngle);
  const notchY1 = center + (radius - 7) * Math.sin(targetAngle);
  const notchX2 = center + (radius + 7) * Math.cos(targetAngle);
  const notchY2 = center + (radius + 7) * Math.sin(targetAngle);

  // Generate subtle geometric tick marks around the ring
  const ticks = [];
  const totalTicks = 36;
  for (let i = 0; i < totalTicks; i++) {
    const angle = ((i / totalTicks) * 360 - 90) * (Math.PI / 180);
    const isMajor = i % 9 === 0;
    const r1 = radius + (isMajor ? 12 : 10);
    const r2 = radius + (isMajor ? 17 : 13);
    const x1 = center + r1 * Math.cos(angle);
    const y1 = center + r1 * Math.sin(angle);
    const x2 = center + r2 * Math.cos(angle);
    const y2 = center + r2 * Math.sin(angle);

    ticks.push(
      <Line
        key={`tick_${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isMajor ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.07)'}
        strokeWidth={isMajor ? 1.5 : 0.75}
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={statusColor} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={statusColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Geometric Precision Ticks */}
        {ticks}

        {/* Background Track Ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Kinetic Progress Ring */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* 75% Target Notch Line */}
        <Line
          x1={notchX1}
          y1={notchY1}
          x2={notchX2}
          y2={notchY2}
          stroke="#FFFFFF"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
