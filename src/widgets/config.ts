/** Shared constants for the home/lock-screen widgets. */

/**
 * iOS App Group id. The app and the widget extension both read/write the
 * snapshot here; mirrored in app.json under `ios.entitlements`.
 */
export const APP_GROUP = 'group.com.khalidalmohannadi.fuel';

/** Key the JSON snapshot is stored under (App Group UserDefaults / file). */
export const SNAPSHOT_KEY = 'snapshot';

export const WIDGET_SCHEMA_VERSION = 1;

/** Android widget names — must match app.json plugin config + the task handler. */
export const ANDROID_WIDGET_NAMES = [
  'Calories',
  'Protein',
  'Water',
  'Summary',
] as const;
export type AndroidWidgetName = (typeof ANDROID_WIDGET_NAMES)[number];

/** clickAction emitted when the water "+" is tapped on Android. */
export const ADD_WATER_ACTION = 'ADD_WATER';

/**
 * Ring colors per metric (calories uses the user's accent at runtime). Aligned
 * with the app palette in src/theme.ts: violet, blue, and the danger red.
 */
export const RING_COLORS = {
  protein: '#A78BFA',
  water: '#60A5FA',
  over: '#F87171',
} as const;
