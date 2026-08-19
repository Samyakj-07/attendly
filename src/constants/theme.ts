// Attendly Design Tokens — Layout & Editorial Typography (theme-agnostic)
// Colors are provided dynamically via ThemeContext / useTheme()

import { LIGHT_COLORS, LIGHT_SHADOWS } from './themes';

export const THEME = {
  colors: LIGHT_COLORS,
  shadows: LIGHT_SHADOWS,

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    hero: 36,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 26,
    pill: 9999,
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xxs: 10,
      xs: 11,
      sm: 13,
      md: 14,
      lg: 16,
      xl: 19,
      xxl: 22,
      title: 26,
      headline: 34,
      display: 48,
      hero: 64,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
      black: '900' as const,
    },
    letterSpacing: {
      tighter: -1.2,
      tight: -0.5,
      normal: 0,
      wide: 0.8,
      widest: 1.6,
      editorial: 2.0,
    },
  },
};

