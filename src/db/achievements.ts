import { getDb } from './index';
import { getLoggedDays } from './meals';
import { streakFromDays } from './dates';

export interface AchievementStats {
  daysLogged: number;
  totalMeals: number;
  logStreak: number;
  onTargetDays: number;
  waterGoalDays: number;
  weighIns: number;
  checkins: number;
}

/** Gather the counters used to evaluate achievement badges. */
export async function getAchievementStats(
  calorieGoal: number,
  waterGoal: number,
): Promise<AchievementStats> {
  const db = getDb();

  const distinct = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(DISTINCT day) AS c FROM meals',
  );
  const total = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM meals',
  );
  const onTarget = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM (
       SELECT day, SUM(calories) AS cal FROM meals GROUP BY day
       HAVING cal > 0 AND cal <= ?
     )`,
    calorieGoal,
  );
  const water = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM water WHERE glasses >= ?',
    waterGoal,
  );
  const weighIns = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM weights',
  );
  const checkins = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM checkins',
  );

  const logStreak = streakFromDays(await getLoggedDays(400));

  return {
    daysLogged: distinct?.c ?? 0,
    totalMeals: total?.c ?? 0,
    logStreak,
    onTargetDays: onTarget?.c ?? 0,
    waterGoalDays: water?.c ?? 0,
    weighIns: weighIns?.c ?? 0,
    checkins: checkins?.c ?? 0,
  };
}
