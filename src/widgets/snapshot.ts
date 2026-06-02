import { Platform } from 'react-native';
import { getDaySummary } from '../db/meals';
import { getWater } from '../db/water';
import { getGoals } from '../db/settings';
import { toDayKey } from '../db/dates';
import { effectiveCalorieGoal } from '../health';
import { WIDGET_SCHEMA_VERSION } from './config';
import { reloadIosWidgets, writeSnapshot } from './storage';
import type { WidgetSnapshot } from './types';

function clampPct(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, consumed / goal));
}

/** Read today's totals + goals from SQLite and shape them into a snapshot. */
export async function buildSnapshot(): Promise<WidgetSnapshot> {
  const day = toDayKey();
  const [summary, glasses, goals] = await Promise.all([
    getDaySummary(day),
    getWater(day),
    getGoals(),
  ]);

  const calorieGoal = effectiveCalorieGoal(goals, day);
  const calConsumed = Math.round(summary.calories);
  const proteinConsumed = Math.round(summary.protein);

  return {
    schemaVersion: WIDGET_SCHEMA_VERSION,
    day,
    updatedAt: Date.now(),
    calories: {
      consumed: calConsumed,
      goal: calorieGoal,
      left: calorieGoal - calConsumed,
      pct: clampPct(calConsumed, calorieGoal),
      over: calConsumed > calorieGoal,
    },
    protein: {
      consumed: proteinConsumed,
      goal: goals.proteinGoal,
      left: goals.proteinGoal - proteinConsumed,
      pct: clampPct(proteinConsumed, goals.proteinGoal),
    },
    water: {
      glasses,
      goal: goals.waterGoal,
      glassMl: goals.glassMl,
      pendingDelta: 0,
    },
    theme: goals.theme,
    accent: goals.accent,
  };
}

/**
 * Rebuild the snapshot from SQLite and push it to the native widgets. Call
 * after any mutation that affects today's totals/goals. No-op on web, and safe
 * when no widgets are installed.
 */
export async function updateWidgetSnapshot(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const snapshot = await buildSnapshot();
    await writeSnapshot(snapshot);
    if (Platform.OS === 'ios') {
      reloadIosWidgets();
    } else if (Platform.OS === 'android') {
      const { renderAllAndroidWidgets } =
        require('./android/render') as typeof import('./android/render');
      await renderAllAndroidWidgets(snapshot);
    }
  } catch (err) {
    // Widgets are best-effort; never let a refresh failure break app flow.
    if (__DEV__) console.warn('[widgets] updateWidgetSnapshot failed', err);
  }
}
