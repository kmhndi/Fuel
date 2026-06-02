import type { ColorProp } from 'react-native-android-widget';
import { RING_COLORS } from '../config';
import type { WidgetSnapshot } from '../types';

/**
 * Per-widget color palette derived from the snapshot's theme + accent. Mirrors
 * the app's "indigo glass" look (see src/theme.ts) so the widgets read as an
 * extension of the app rather than stock Android chrome.
 *
 * `track` and the metric colors are kept as solid hex (no rgba / 8-digit hex):
 * they are injected into SVG strings rendered by AndroidSVG, which is picky
 * about color syntax. View backgrounds (borders, the "+" button) may use rgba
 * since those go through the library's own color converter.
 */
export interface WidgetPalette {
  gradientFrom: ColorProp;
  gradientTo: ColorProp;
  border: ColorProp;
  /** Solid hex for the ring track; paired with trackOpacity in the SVG. */
  track: string;
  trackOpacity: number;
  textPrimary: ColorProp;
  textSecondary: ColorProp;
  /** Solid hex (snapshot accent), used for the calorie ring + the "+" glyph. */
  accent: ColorProp;
  protein: ColorProp;
  water: ColorProp;
  over: ColorProp;
  plusBg: ColorProp;
}

function safeAccent(accent: string): ColorProp {
  return (/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#22D3A7') as ColorProp;
}

export function palette(snapshot: WidgetSnapshot): WidgetPalette {
  const accent = safeAccent(snapshot.accent);
  const dark = snapshot.theme !== 'light';
  return dark
    ? {
        gradientFrom: '#1E1B4B',
        gradientTo: '#0B0A1F',
        border: 'rgba(255, 255, 255, 0.12)',
        track: '#EDEBFF',
        trackOpacity: 0.14,
        textPrimary: '#EDEBFF',
        textSecondary: '#A6A2C9',
        accent,
        protein: RING_COLORS.protein,
        water: RING_COLORS.water,
        over: RING_COLORS.over,
        plusBg: 'rgba(255, 255, 255, 0.14)',
      }
    : {
        gradientFrom: '#F4F2FF',
        gradientTo: '#E8E9FB',
        border: '#DADCEC',
        track: '#11161F',
        trackOpacity: 0.1,
        textPrimary: '#11161F',
        textSecondary: '#667085',
        accent,
        protein: RING_COLORS.protein,
        water: RING_COLORS.water,
        over: RING_COLORS.over,
        plusBg: 'rgba(15, 23, 42, 0.06)',
      };
}
