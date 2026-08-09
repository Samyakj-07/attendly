export const THEME = {
  colors: {
    // Ultra-Luxury Dark-First Palette (Apple × Linear × Arc Studio)
    background: '#070707',
    backgroundSecondary: '#0C0C0D',
    surface: '#111113',
    surfaceSubtle: '#151517',
    surfaceElevated: '#1A1A1E',
    surfaceGlass: 'rgba(17, 17, 19, 0.82)',
    surfaceGlassHover: 'rgba(255, 255, 255, 0.04)',

    // Pure Precision Borders & Hairlines
    border: 'rgba(255, 255, 255, 0.07)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderLight: 'rgba(255, 255, 255, 0.12)',
    borderHighlight: 'rgba(56, 189, 248, 0.28)',

    // Restrained Semantic Accents
    emerald: '#10B981',
    emeraldGlow: 'rgba(16, 185, 129, 0.12)',
    emeraldSubtle: 'rgba(16, 185, 129, 0.08)',

    cyan: '#38BDF8',
    cyanGlow: 'rgba(56, 189, 248, 0.12)',
    cyanSubtle: 'rgba(56, 189, 248, 0.08)',

    amber: '#F59E0B',
    amberGlow: 'rgba(245, 158, 11, 0.12)',
    amberSubtle: 'rgba(245, 158, 11, 0.08)',
    gold: '#F59E0B',
    goldGlow: 'rgba(245, 158, 11, 0.12)',
    goldSubtle: 'rgba(245, 158, 11, 0.08)',

    crimson: '#EF4444',
    crimsonGlow: 'rgba(239, 68, 68, 0.12)',
    crimsonSubtle: 'rgba(239, 68, 68, 0.08)',

    purple: '#A855F7',
    purpleGlow: 'rgba(168, 85, 247, 0.12)',

    // Editorial Typography Colors
    textPrimary: '#F5F5F2',
    textSecondary: '#929297',
    textTertiary: '#5F6065',
    textMuted: '#3A3A3E',
    textInverse: '#070707',

    // Status mapping
    present: '#10B981',
    absent: '#EF4444',
    cancelled: '#5F6065',
    od: '#38BDF8',
  },
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
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    glowCyan: {
      shadowColor: '#38BDF8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    glowEmerald: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};
