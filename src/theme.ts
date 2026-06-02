import { openDatabaseSync } from 'expo-sqlite';

/**
 * Fuel's visual language. Centralized so every screen stays consistent.
 *
 * The active theme (dark/light) and accent are read synchronously from the
 * settings row at startup, so the palette is fixed for the session. Changing
 * the theme in Settings persists it and takes effect on the next app launch
 * (StyleSheets capture their colors at module load, so a live swap would need
 * the whole tree to re-mount).
 */
export const ACCENT_CHOICES = [
  '#22D3A7', // mint (default)
  '#60A5FA', // blue
  '#FB923C', // orange
  '#F472B6', // pink
  '#A78BFA', // violet
  '#FACC15', // yellow
] as const;

/**
 * Maps each accent to its alternate app-icon name (matching app.json). The
 * default mint accent uses the primary icon, hence null.
 */
export const ACCENT_ICON_NAME: Record<string, string | null> = {
  '#22D3A7': null,
  '#60A5FA': 'Blue',
  '#FB923C': 'Orange',
  '#F472B6': 'Pink',
  '#A78BFA': 'Violet',
  '#FACC15': 'Yellow',
};

interface Prefs {
  theme: 'dark' | 'light';
  accent: string;
}

function loadPrefs(): Prefs {
  try {
    const db = openDatabaseSync('fuel.db');
    const row = db.getFirstSync<{ theme: string; accent: string }>(
      'SELECT theme, accent FROM settings WHERE id = 1',
    );
    if (row) {
      return {
        theme: row.theme === 'light' ? 'light' : 'dark',
        accent: row.accent || '#22D3A7',
      };
    }
  } catch {
    // Settings table not migrated yet (first launch) — use defaults.
  }
  return { theme: 'dark', accent: '#22D3A7' };
}

const prefs = loadPrefs();

export const themeMode = prefs.theme;

// Deep-indigo "glass" dark theme: translucent surfaces sit over a gradient
// backdrop (see ScreenBackground), so cards read as frosted glass.
const dark = {
  bg: '#0B0A1F',
  surface: 'rgba(255,255,255,0.06)',
  surfaceAlt: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.12)',
  text: '#EDEBFF',
  textMuted: '#A6A2C9',
  gradient: ['#1E1B4B', '#312E81', '#0B0A1F'] as const,
  header: '#16142E',
};

const light = {
  bg: '#EEF0FB',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EDF3',
  border: '#DADCEC',
  text: '#11161F',
  textMuted: '#667085',
  gradient: ['#F4F2FF', '#E8E9FB', '#EEF0FB'] as const,
  header: '#FFFFFF',
};

const base = prefs.theme === 'light' ? light : dark;

export const colors = {
  ...base,
  accent: prefs.accent,
  // Faint accent tint via 8-digit hex alpha (~17%).
  accentDim: `${prefs.accent}2B`,
  // Accent glow for shadows (~33% alpha).
  glow: prefs.accent,
  glowDim: `${prefs.accent}55`,
  danger: '#F87171',
  warning: '#FBBF24',
};

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
  md: 14,
  lg: 20,
  xl: 28,
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
    heavy: '800',
  },
} as const;
