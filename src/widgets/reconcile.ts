import { Platform } from 'react-native';
import { adjustWater } from '../db/water';
import { readSnapshot } from './storage';
import { updateWidgetSnapshot } from './snapshot';

/**
 * Apply water glasses added from a widget tap (while the app was backgrounded)
 * to SQLite, then rewrite the snapshot so the optimistic value and the DB
 * agree. The widget only ever holds an additive `pendingDelta`; SQLite stays
 * the source of truth. Applied against the snapshot's `day` so a tap near
 * midnight lands on the day the user actually saw.
 */
export async function drainPendingWater(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const snapshot = await readSnapshot();
    const delta = snapshot?.water.pendingDelta ?? 0;
    if (!snapshot || delta === 0) return;
    await adjustWater(snapshot.day, delta);
    await updateWidgetSnapshot();
  } catch (err) {
    if (__DEV__) console.warn('[widgets] drainPendingWater failed', err);
  }
}
