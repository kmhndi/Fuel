import { getDailyTotals, getLoggedDays, getTopMealsByFrequency } from './db/meals';
import { getWaterTotals } from './db/water';
import { shiftDay, toDayKey } from './db/dates';
import { effectiveCalorieGoal } from './health';
import { longestStreakInRange } from './stats';
import type { Goals } from './types';

/** A playful summary archetype derived from the period's habits. */
export type PersonalityKey = 'machine' | 'protein' | 'explorer' | 'balanced';

/** Everything the "Fuel Wrapped" recap needs, for one period. */
export interface WrappedData {
  /** Window length in days (e.g. 30). */
  days: number;
  /** Days within the window that have at least one meal. */
  loggedDays: number;
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  avgProtein: number;
  /** Best consecutive-day streak achieved within the window. */
  bestStreak: number;
  /** Days within the window that landed on/under the calorie goal. */
  onTargetDays: number;
  totalWater: number;
  topFoods: { name: string; count: number }[];
  personality: PersonalityKey;
}

function nutritionPersonality(
  d: Omit<WrappedData, 'personality'>,
  goals: Goals,
): PersonalityKey {
  // Showing up beats everything.
  if (d.days > 0 && d.loggedDays >= d.days * 0.8) return 'machine';
  // Consistently hitting protein.
  if (goals.proteinGoal > 0 && d.avgProtein >= goals.proteinGoal) return 'protein';
  // No single food dominates → lots of variety.
  if (d.topFoods.length > 0 && d.topFoods[0].count <= Math.max(2, d.loggedDays * 0.34)) {
    return 'explorer';
  }
  return 'balanced';
}

/**
 * Assemble the "Fuel Wrapped" recap for the last `days` days from local data.
 * Averages are over *logged* days so rest/untracked days don't deflate them.
 */
export async function buildWrapped(days: number, goals: Goals): Promise<WrappedData> {
  const end = toDayKey();
  const start = shiftDay(end, -(days - 1));
  const [totals, loggedSet, topFoods, water] = await Promise.all([
    getDailyTotals(days),
    getLoggedDays(days),
    getTopMealsByFrequency(start, end, 5),
    getWaterTotals(days),
  ]);

  const logged = totals.filter((t) => t.calories > 0);
  const loggedDays = logged.length;
  const totalCalories = logged.reduce((s, t) => s + t.calories, 0);
  const totalProtein = logged.reduce((s, t) => s + t.protein, 0);
  const onTargetDays = totals.filter(
    (t) => t.calories > 0 && t.calories <= effectiveCalorieGoal(goals, t.day),
  ).length;
  const totalWater = water.reduce((s, w) => s + w.glasses, 0);

  const base: Omit<WrappedData, 'personality'> = {
    days,
    loggedDays,
    totalCalories: Math.round(totalCalories),
    avgCalories: loggedDays ? Math.round(totalCalories / loggedDays) : 0,
    totalProtein: Math.round(totalProtein),
    avgProtein: loggedDays ? Math.round(totalProtein / loggedDays) : 0,
    bestStreak: longestStreakInRange(loggedSet),
    onTargetDays,
    totalWater,
    topFoods,
  };
  return { ...base, personality: nutritionPersonality(base, goals) };
}
