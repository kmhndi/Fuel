import { toDayKey } from '../db/dates';
import { WIDGET_SCHEMA_VERSION } from './config';
import type { WidgetSnapshot } from './types';

/**
 * A zeroed snapshot for the Android headless task to render before the app has
 * written real data (keeps a freshly-added widget from showing blank). Uses no
 * SQLite, so it is safe in a cold headless JS context.
 */
export function defaultSnapshot(): WidgetSnapshot {
  return {
    schemaVersion: WIDGET_SCHEMA_VERSION,
    day: toDayKey(),
    updatedAt: Date.now(),
    calories: { consumed: 0, goal: 2000, left: 2000, pct: 0, over: false },
    protein: { consumed: 0, goal: 140, left: 140, pct: 0 },
    water: { glasses: 0, goal: 8, glassMl: 250, pendingDelta: 0 },
    theme: 'dark',
    accent: '#22D3A7',
  };
}
