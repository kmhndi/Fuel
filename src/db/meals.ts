import { getDb } from './index';
import { toDayKey } from './dates';
import type { Meal, NewMeal } from '../types';

interface MealRow {
  id: number;
  name: string;
  calories: number;
  logged_at: string;
  day: string;
}

function mapRow(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    loggedAt: row.logged_at,
    day: row.day,
  };
}

/** Insert a meal logged "now" and return the persisted record. */
export async function addMeal(meal: NewMeal): Promise<Meal> {
  const db = getDb();
  const now = new Date();
  const loggedAt = now.toISOString();
  const day = toDayKey(now);

  const result = await db.runAsync(
    'INSERT INTO meals (name, calories, logged_at, day) VALUES (?, ?, ?, ?)',
    meal.name.trim(),
    Math.round(meal.calories),
    loggedAt,
    day,
  );

  return {
    id: result.lastInsertRowId,
    name: meal.name.trim(),
    calories: Math.round(meal.calories),
    loggedAt,
    day,
  };
}

/** All meals for a given day, newest first. */
export async function getMealsForDay(day: string): Promise<Meal[]> {
  const db = getDb();
  const rows = await db.getAllAsync<MealRow>(
    'SELECT * FROM meals WHERE day = ? ORDER BY logged_at DESC',
    day,
  );
  return rows.map(mapRow);
}

/** Total calories logged on a given day. */
export async function getDayTotal(day: string): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(calories) AS total FROM meals WHERE day = ?',
    day,
  );
  return row?.total ?? 0;
}

export async function deleteMeal(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM meals WHERE id = ?', id);
}

/** Per-day calorie totals over the last `days` days, oldest first. */
export async function getDailyTotals(
  days: number,
): Promise<{ day: string; total: number }[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ day: string; total: number }>(
    `SELECT day, SUM(calories) AS total
       FROM meals
      GROUP BY day
      ORDER BY day DESC
      LIMIT ?`,
    days,
  );
  return rows.reverse();
}
