// Attendly Theme Palette — Warm Ivory & Deep Ink Aesthetic
// Warm Ivory: #F7F6F1 | Primary Ink: #111318 | Deep Navy: #172554 | Electric Blue: #3B82F6

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

  // Primary Brand & Electric Signal
  navy: string;
  navySubtle: string;
  indigo: string;
  indigoGlow: string;
  indigoSubtle: string;
  accent: string;
  accentGlow: string;
  accentSubtle: string;
  accentSecondary: string;
  softBlue: string;

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

  // Ring & Signal specific
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
}

// ─── LIGHT PALETTE (Quiet Luxury: Warm Ivory + Carbon Ink + Cobalt Signal) ───
export const LIGHT_COLORS: AttendlyColors = {
  // Main canvas: #F7F6F1, Secondary: #F1F0EA
  background: '#F7F6F1',
  backgroundSecondary: '#F1F0EA',
  surface: '#FFFFFF',
  surfaceSubtle: '#FAF9F5',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.96)',
  surfaceGlassHover: 'rgba(20, 21, 24, 0.02)',

  // Borders: Minimal hairline definition
  border: '#E8E6DF',
  borderSubtle: '#EFEFEA',
  borderLight: '#E8E6DF',
  borderHighlight: '#3B82F6',

  // Primary Editorial Brand & Cobalt Electric Signal
  navy: '#172554',
  navySubtle: '#EFF6FF',
  indigo: '#1E3A8A',
  indigoGlow: 'rgba(30, 58, 138, 0.12)',
  indigoSubtle: '#EFF6FF',
  accent: '#3B82F6',
  accentGlow: 'rgba(59, 130, 246, 0.15)',
  accentSubtle: '#EFF6FF',
  accentSecondary: '#1D4ED8',
  softBlue: '#F0F5FF',

  // Backward compat aliases
  cyan: '#3B82F6',
  cyanGlow: 'rgba(59, 130, 246, 0.15)',
  cyanSubtle: '#EFF6FF',

  // Semantic Status: Refined Academic Pigments
  emerald: '#166534',
  emeraldGlow: 'rgba(22, 101, 52, 0.12)',
  emeraldSubtle: '#F0FDF4',

  amber: '#D97706',
  amberGlow: 'rgba(217, 119, 6, 0.12)',
  amberSubtle: '#FFFBEB',
  gold: '#B45309',
  goldGlow: 'rgba(180, 83, 9, 0.12)',
  goldSubtle: '#FFFBEB',

  crimson: '#991B1B',
  crimsonGlow: 'rgba(153, 27, 27, 0.12)',
  crimsonSubtle: '#FEF2F2',

  purple: '#6B21A8',
  purpleGlow: 'rgba(107, 33, 168, 0.12)',

  // High-Contrast Magazine Ink Hierarchy
  textPrimary: '#111318',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Attendance Specific Status Colors
  present: '#166534',
  absent: '#991B1B',
  cancelled: '#64748B',
  od: '#1E3A8A',

  // Ring & Gauge Geometry
  ringTrack: '#E8E6DF',
  tickMajor: '#64748B',
  tickMinor: '#E8E6DF',
  targetNotch: '#111318',

  // Modal Backdrop
  modalOverlay: 'rgba(17, 19, 24, 0.45)',
};

export const LIGHT_SHADOWS: AttendlyShadows = {
  card: {
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  glowAccent: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
  glowCyan: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
  glowEmerald: {
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  soft: {
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 1,
  },
};

export const LIGHT_THEME: AttendlyTheme = {
  colors: LIGHT_COLORS,
  shadows: LIGHT_SHADOWS,
};

export const THEME_PALETTE = LIGHT_THEME;
