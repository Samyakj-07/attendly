// Attendly Design Tokens — Layout & Typography (theme-agnostic)
// Colors are provided dynamically via ThemeContext / useTheme()
// This file exports static layout tokens + a backward-compatible THEME object
// that defaults to dark colors for StyleSheet.create at module scope.

import { DARK_COLORS, DARK_SHADOWS } from './themes';

export const THEME = {
  // Backward-compatible colors — defaults to dark palette.
  // Components should prefer useTheme().colors for dynamic theming.
  colors: DARK_COLORS,
  shadows: DARK_SHADOWS,

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
      display: 60,
      hero: 68,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
    letterSpacing: {
      tighter: -1.2,
      tight: -0.5,
      normal: 0,
      wide: 0.8,
      widest: 1.6,
    },
  },
};
