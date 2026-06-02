import type { ThemeMode } from '../types';

/** A goal-vs-consumed metric shown as a ring (calories, protein). */
export interface WidgetMetric {
  /** Remaining toward the goal (goal − consumed); may go negative. */
  left: number;
  goal: number;
  consumed: number;
  /** Progress 0..1, clamped. */
  pct: number;
}

export interface WidgetCalories extends WidgetMetric {
  /** Whether consumed has passed the goal. */
  over: boolean;
}

export interface WidgetWater {
  glasses: number;
  goal: number;
  glassMl: number;
  /**
   * Glasses added from a widget tap that haven't yet been written to SQLite.
   * The app drains this on foreground (see reconcile.ts). Always 0 in a
   * snapshot freshly built by the app.
   */
  pendingDelta: number;
}

/** The full payload widgets read from shared storage. */
export interface WidgetSnapshot {
  schemaVersion: number;
  /** The day (YYYY-MM-DD) this snapshot describes. */
  day: string;
  /** Epoch millis the snapshot was written, for staleness checks. */
  updatedAt: number;
  calories: WidgetCalories;
  protein: WidgetMetric;
  water: WidgetWater;
  theme: ThemeMode;
  /** Accent hex used to tint rings and the water "+". */
  accent: string;
}
