import type { CheckIn, Goals } from './types';
import { effectiveCalorieGoal } from './health';

/**
 * Trailing moving average. For each index, averages up to `window` values
 * ending at that index (fewer near the start). Zero/blank days are skipped so
 * a non-logged day doesn't drag the line to zero; if a window has no real
 * values the result is null at that point.
 */
export function movingAverage(
  values: number[],
  window: number,
): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v) => v > 0);
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** A discovered link between a nutrition habit and how the user felt. */
export interface FuelInsight {
  /** The nutrition habit the day is grouped by. */
  dimension: 'protein' | 'calorie';
  /** The self-reported metric that moved with it. */
  metric: 'energy' | 'mood';
  /** Average metric (1–5) on days the habit held, and on the days it didn't. */
  on: number;
  off: number;
}

interface DayRecord {
  calories: number;
  protein: number;
  mood: number | null;
  energy: number | null;
  proteinHit: boolean;
  calorieOk: boolean;
}

/** Both buckets need at least this many days before a link is trustworthy. */
const INSIGHT_MIN_DAYS = 3;
/** Only surface a link once the averages differ by at least this much (of 5). */
const INSIGHT_MIN_DELTA = 0.3;

const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (x: number): number => Math.round(x * 10) / 10;

/**
 * Correlate the user's mood/energy check-ins against their nutrition: for each
 * habit (hitting the protein goal, staying within the calorie goal), compare
 * the average mood/energy on days it held versus days it didn't. Only positive,
 * well-supported links are returned (each bucket ≥ 3 days, ≥ 0.3 difference),
 * strongest first, one per habit — so the result is always a short, motivating
 * list. Returns an empty array when there isn't enough data yet.
 *
 * Pure (no DB/i18n) so the caller formats the sentence and it's easy to test.
 */
export function buildFuelInsights(
  totals: { day: string; calories: number; protein: number }[],
  checkins: CheckIn[],
  goals: Goals,
): FuelInsight[] {
  const byDay = new Map(totals.map((t) => [t.day, t]));
  const records: DayRecord[] = [];
  for (const c of checkins) {
    const t = byDay.get(c.day);
    if (!t || t.calories <= 0) continue; // need a logged day to compare food
    if (c.mood == null && c.energy == null) continue;
    const goal = effectiveCalorieGoal(goals, c.day);
    records.push({
      calories: t.calories,
      protein: t.protein,
      mood: c.mood,
      energy: c.energy,
      proteinHit: goals.proteinGoal > 0 && t.protein >= goals.proteinGoal,
      calorieOk: goal > 0 && t.calories <= goal,
    });
  }

  const dims: { dimension: FuelInsight['dimension']; pick: (r: DayRecord) => boolean }[] = [
    { dimension: 'protein', pick: (r) => r.proteinHit },
    { dimension: 'calorie', pick: (r) => r.calorieOk },
  ];
  const metrics: { metric: FuelInsight['metric']; get: (r: DayRecord) => number | null }[] = [
    { metric: 'energy', get: (r) => r.energy },
    { metric: 'mood', get: (r) => r.mood },
  ];

  const found: (FuelInsight & { delta: number })[] = [];
  for (const d of dims) {
    let best: (FuelInsight & { delta: number }) | null = null;
    for (const m of metrics) {
      const on: number[] = [];
      const off: number[] = [];
      for (const r of records) {
        const v = m.get(r);
        if (v == null) continue;
        (d.pick(r) ? on : off).push(v);
      }
      if (on.length < INSIGHT_MIN_DAYS || off.length < INSIGHT_MIN_DAYS) continue;
      const delta = avg(on) - avg(off);
      if (delta < INSIGHT_MIN_DELTA) continue; // keep links positive & motivating
      if (!best || delta > best.delta) {
        best = {
          dimension: d.dimension,
          metric: m.metric,
          on: round1(avg(on)),
          off: round1(avg(off)),
          delta,
        };
      }
    }
    if (best) found.push(best);
  }

  found.sort((a, b) => b.delta - a.delta);
  return found.slice(0, 3).map((f) => ({
    dimension: f.dimension,
    metric: f.metric,
    on: f.on,
    off: f.off,
  }));
}

/**
 * Longest run of consecutive calendar days present in the set — i.e. the best
 * streak reached within a window (distinct from the *current* streak, which
 * only counts days ending at today).
 */
export function longestStreakInRange(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (isNextCalendarDay(sorted[i - 1], sorted[i])) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/** True when `b` is the calendar day immediately after `a` (both YYYY-MM-DD). */
function isNextCalendarDay(a: string, b: string): boolean {
  const d = new Date(`${a}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === b;
}
