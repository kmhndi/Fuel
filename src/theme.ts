/**
 * Fuel's visual language. A dark, calm palette with a single energetic accent
 * so the app feels focused rather than busy. Centralized here so every screen
 * stays consistent.
 */
export const colors = {
  bg: '#0B0E14',
  surface: '#151A23',
  surfaceAlt: '#1D232E',
  border: '#262E3A',
  text: '#E8ECF1',
  textMuted: '#8A94A6',
  accent: '#22D3A7',
  accentDim: '#143B33',
  danger: '#F87171',
  warning: '#FBBF24',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
