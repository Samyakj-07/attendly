// Attendly Theme Palettes — Dark & Light
// Dark: precision + technology | Light: clarity + calm + confidence

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AttendlyColors {
  // Foundation
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceGlassHover: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderLight: string;
  borderHighlight: string;

  // Attendly Accent (Electric Indigo / Blue-Violet)
  indigo: string;
  indigoGlow: string;
  indigoSubtle: string;
  accent: string;
  accentGlow: string;
  accentSubtle: string;
  accentSecondary: string;

  // Backward compat aliases
  cyan: string;
  cyanGlow: string;
  cyanSubtle: string;

  // Semantic Status
  emerald: string;
  emeraldGlow: string;
  emeraldSubtle: string;

  amber: string;
  amberGlow: string;
  amberSubtle: string;
  gold: string;
  goldGlow: string;
  goldSubtle: string;

  crimson: string;
  crimsonGlow: string;
  crimsonSubtle: string;

  purple: string;
  purpleGlow: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;

  // Status mapping
  present: string;
  absent: string;
  cancelled: string;
  od: string;

  // Ring-specific
  ringTrack: string;
  tickMajor: string;
  tickMinor: string;
  targetNotch: string;

  // Modal overlay
  modalOverlay: string;
}

export interface AttendlyShadows {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  floating: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  glowAccent: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  glowCyan: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  glowEmerald: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  soft: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface AttendlyTheme {
  colors: AttendlyColors;
  shadows: AttendlyShadows;
  isDark: boolean;
}

// ─── DARK PALETTE ─────────────────────────────────────────────
// Cyber-Minimal Precision + Ambient Neon Depth
export const DARK_COLORS: AttendlyColors = {
  // Foundation
  background: '#070709',
  backgroundSecondary: '#0B0B0F',
  surface: '#101015',
  surfaceSubtle: '#14141C',
  surfaceElevated: '#1A1A24',
  surfaceGlass: 'rgba(16, 16, 21, 0.88)',
  surfaceGlassHover: 'rgba(255, 255, 255, 0.05)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderLight: 'rgba(255, 255, 255, 0.14)',
  borderHighlight: 'rgba(99, 102, 241, 0.38)',

  // Accent (Electric Indigo & Cyber Violet)
  indigo: '#6366F1',
  indigoGlow: 'rgba(99, 102, 241, 0.22)',
  indigoSubtle: 'rgba(99, 102, 241, 0.10)',
  accent: '#6366F1',
  accentGlow: 'rgba(99, 102, 241, 0.22)',
  accentSubtle: 'rgba(99, 102, 241, 0.10)',
  accentSecondary: '#8B5CF6',

  // Backward compat
  cyan: '#06B6D4',
  cyanGlow: 'rgba(6, 182, 212, 0.22)',
  cyanSubtle: 'rgba(6, 182, 212, 0.10)',

  // Semantic
  emerald: '#10B981',
  emeraldGlow: 'rgba(16, 185, 129, 0.20)',
  emeraldSubtle: 'rgba(16, 185, 129, 0.10)',

  amber: '#F59E0B',
  amberGlow: 'rgba(245, 158, 11, 0.20)',
  amberSubtle: 'rgba(245, 158, 11, 0.10)',
  gold: '#F59E0B',
  goldGlow: 'rgba(245, 158, 11, 0.20)',
  goldSubtle: 'rgba(245, 158, 11, 0.10)',

  crimson: '#F43F5E',
  crimsonGlow: 'rgba(244, 63, 94, 0.20)',
  crimsonSubtle: 'rgba(244, 63, 94, 0.10)',

  purple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.20)',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#334155',
  textInverse: '#070709',

  // Status
  present: '#10B981',
  absent: '#F43F5E',
  cancelled: '#64748B',
  od: '#6366F1',

  // Ring
  ringTrack: 'rgba(255, 255, 255, 0.06)',
  tickMajor: 'rgba(255, 255, 255, 0.25)',
  tickMinor: 'rgba(255, 255, 255, 0.08)',
  targetNotch: '#FFFFFF',

  // Modal
  modalOverlay: 'rgba(0, 0, 0, 0.90)',
};

export const DARK_SHADOWS: AttendlyShadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.60,
    shadowRadius: 24,
    elevation: 12,
  },
  glowAccent: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glowCyan: {
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glowEmerald: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
};

// ─── LIGHT PALETTE ────────────────────────────────────────────
// Clarity + Calm + Confidence
// Apple × Linear × premium fintech × editorial
export const LIGHT_COLORS: AttendlyColors = {
  // Warm off-white foundation
  background: '#F7F7F5',
  backgroundSecondary: '#F2F2EF',
  surface: '#FFFFFF',
  surfaceSubtle: '#FAFAF8',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.72)',
  surfaceGlassHover: 'rgba(0, 0, 0, 0.03)',

  // Subtle warm borders
  border: 'rgba(17, 17, 19, 0.08)',
  borderSubtle: 'rgba(17, 17, 19, 0.05)',
  borderLight: 'rgba(17, 17, 19, 0.12)',
  borderHighlight: 'rgba(102, 125, 255, 0.22)',

  // Refined blue-violet accent
  indigo: '#667DFF',
  indigoGlow: 'rgba(102, 125, 255, 0.10)',
  indigoSubtle: 'rgba(102, 125, 255, 0.06)',
  accent: '#667DFF',
  accentGlow: 'rgba(102, 125, 255, 0.10)',
  accentSubtle: 'rgba(102, 125, 255, 0.06)',
  accentSecondary: '#8B72FF',

  // Backward compat
  cyan: '#667DFF',
  cyanGlow: 'rgba(102, 125, 255, 0.10)',
  cyanSubtle: 'rgba(102, 125, 255, 0.06)',

  // Muted semantic — premium-appropriate saturation
  emerald: '#2E8B63',
  emeraldGlow: 'rgba(46, 139, 99, 0.10)',
  emeraldSubtle: 'rgba(46, 139, 99, 0.06)',

  amber: '#B7791F',
  amberGlow: 'rgba(183, 121, 31, 0.10)',
  amberSubtle: 'rgba(183, 121, 31, 0.06)',
  gold: '#B7791F',
  goldGlow: 'rgba(183, 121, 31, 0.10)',
  goldSubtle: 'rgba(183, 121, 31, 0.06)',

  crimson: '#C85C5C',
  crimsonGlow: 'rgba(200, 92, 92, 0.10)',
  crimsonSubtle: 'rgba(200, 92, 92, 0.06)',

  purple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.10)',

  // Strong editorial typography
  textPrimary: '#111113',
  textSecondary: '#6F7075',
  textTertiary: '#9A9A9F',
  textMuted: '#C5C5CA',
  textInverse: '#F5F5F3',

  // Status
  present: '#2E8B63',
  absent: '#C85C5C',
  cancelled: '#9A9A9F',
  od: '#667DFF',

  // Ring — precision instrument on warm white
  ringTrack: 'rgba(17, 17, 19, 0.06)',
  tickMajor: 'rgba(17, 17, 19, 0.18)',
  tickMinor: 'rgba(17, 17, 19, 0.06)',
  targetNotch: '#111113',

  // Modal — softer dim for light
  modalOverlay: 'rgba(0, 0, 0, 0.25)',
};

export const LIGHT_SHADOWS: AttendlyShadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 6,
  },
  glowAccent: {
    shadowColor: '#667DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  glowCyan: {
    shadowColor: '#667DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  glowEmerald: {
    shadowColor: '#2E8B63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
};

// Pre-composed theme objects
export const DARK_THEME: AttendlyTheme = {
  colors: DARK_COLORS,
  shadows: DARK_SHADOWS,
  isDark: true,
};

export const LIGHT_THEME: AttendlyTheme = {
  colors: LIGHT_COLORS,
  shadows: LIGHT_SHADOWS,
  isDark: false,
};
