import { getDb } from './index';
import { rememberFood } from './foods';
import { toDayKey } from './dates';
import type { Meal, MealType, NewMeal } from '../types';

interface MealRow {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  meal_type: MealType;
  note: string | null;
  tag: string | null;
  logged_at: string;
  day: string;
}

function mapRow(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    mealType: row.meal_type,
    note: row.note,
    tag: row.tag,
    loggedAt: row.logged_at,
    day: row.day,
  };
}

function sanitize(meal: NewMeal) {
  const note = meal.note?.trim();
  const tag = meal.tag?.trim();
  return {
    name: meal.name.trim(),
    calories: Math.max(0, Math.round(meal.calories)),
    protein: Math.max(0, Math.round(meal.protein)),
    carbs: Math.max(0, Math.round(meal.carbs)),
    fat: Math.max(0, Math.round(meal.fat)),
    fiber: Math.max(0, Math.round(meal.fiber ?? 0)),
    sugar: Math.max(0, Math.round(meal.sugar ?? 0)),
    mealType: meal.mealType,
    note: note ? note : null,
    tag: tag ? tag : null,
  };
}

/**
 * Insert a meal. Defaults to today, but `day` lets the Today screen log onto a
 * day the user has navigated to. Also records the food in the reusable library.
 */
export async function addMeal(meal: NewMeal, day?: string): Promise<Meal> {
  const db = getDb();
  const now = new Date();
  const loggedAt = now.toISOString();
  const targetDay = day ?? toDayKey(now);
  const s = sanitize(meal);

  const result = await db.runAsync(
    `INSERT INTO meals (name, calories, protein, carbs, fat, fiber, sugar, meal_type, note, tag, logged_at, day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.name,
    s.calories,
    s.protein,
    s.carbs,
    s.fat,
    s.fiber,
    s.sugar,
    s.mealType,
    s.note,
    s.tag,
    loggedAt,
    targetDay,
  );

  await rememberFood(
    s.name,
    s.calories,
    { protein: s.protein, carbs: s.carbs, fat: s.fat },
    loggedAt,
  );

  return { id: result.lastInsertRowId, loggedAt, day: targetDay, ...s };
}

/** Update an existing meal in place (keeps its original timestamp/day). */
export async function updateMeal(id: number, meal: NewMeal): Promise<void> {
  const db = getDb();
  const s = sanitize(meal);
  await db.runAsync(
    `UPDATE meals
        SET name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?,
            meal_type = ?, note = ?, tag = ?
      WHERE id = ?`,
    s.name,
    s.calories,
    s.protein,
    s.carbs,
    s.fat,
    s.fiber,
    s.sugar,
    s.mealType,
    s.note,
    s.tag,
    id,
  );
  await rememberFood(
    s.name,
    s.calories,
    { protein: s.protein, carbs: s.carbs, fat: s.fat },
    new Date().toISOString(),
  );
}

/** Insert a copy of an existing meal, logged now on the same day. */
export async function duplicateMeal(meal: Meal): Promise<void> {
  await addMeal(
    {
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber,
      sugar: meal.sugar,
      mealType: meal.mealType,
      note: meal.note,
      tag: meal.tag,
    },
    meal.day,
  );
}

/**
 * Copy every meal from `fromDay` onto `toDay`. Returns how many were copied so
 * the UI can report the result.
 */
export async function copyMealsFromDay(
  fromDay: string,
  toDay: string,
): Promise<number> {
  const source = await getMealsForDay(fromDay);
  for (const meal of source) {
    await addMeal(
      {
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        sugar: meal.sugar,
        mealType: meal.mealType,
        note: meal.note,
        tag: meal.tag,
      },
      toDay,
    );
  }
  return source.length;
}

export async function getMeal(id: number): Promise<Meal | null> {
  const db = getDb();
  const row = await db.getFirstAsync<MealRow>(
    'SELECT * FROM meals WHERE id = ?',
    id,
  );
  return row ? mapRow(row) : null;
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

export interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
}

/** Aggregated calorie + macro totals for a day. */
export async function getDaySummary(day: string): Promise<DaySummary> {
  const db = getDb();
  const row = await db.getFirstAsync<{
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    count: number;
  }>(
    `SELECT
        SUM(calories) AS calories,
        SUM(protein)  AS protein,
        SUM(carbs)    AS carbs,
        SUM(fat)      AS fat,
        COUNT(*)      AS count
       FROM meals WHERE day = ?`,
    day,
  );
  return {
    calories: row?.calories ?? 0,
    protein: row?.protein ?? 0,
    carbs: row?.carbs ?? 0,
    fat: row?.fat ?? 0,
    count: row?.count ?? 0,
  };
}

export async function deleteMeal(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM meals WHERE id = ?', id);
}

/**
 * Search across every logged meal by name, note, or tag. Newest first.
 * An empty query returns the most recent meals.
 */
export async function searchMeals(query: string, limit = 100): Promise<Meal[]> {
  const db = getDb();
  const like = `%${query.trim().toLowerCase()}%`;
  const rows = await db.getAllAsync<MealRow>(
    `SELECT * FROM meals
      WHERE lower(name) LIKE ? OR lower(IFNULL(note, '')) LIKE ? OR lower(IFNULL(tag, '')) LIKE ?
      ORDER BY logged_at DESC
      LIMIT ?`,
    like,
    like,
    like,
    limit,
  );
  return rows.map(mapRow);
}

/** Distinct tags that have been used, most-used first. */
export async function getUsedTags(): Promise<string[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ tag: string }>(
    `SELECT tag FROM meals WHERE tag IS NOT NULL AND tag != ''
      GROUP BY tag ORDER BY COUNT(*) DESC LIMIT 12`,
  );
  return rows.map((r) => r.tag);
}

/** Whether any meal has ever been logged (used to gate first-run UI). */
export async function hasAnyMeal(): Promise<boolean> {
  const db = getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM meals',
  );
  return (row?.c ?? 0) > 0;
}

/** Set of recent days (within `days`) that have at least one meal logged. */
export async function getLoggedDays(days: number): Promise<Set<string>> {
  const db = getDb();
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT DISTINCT day FROM meals ORDER BY day DESC LIMIT ?',
    days,
  );
  return new Set(rows.map((r) => r.day));
}

/** Per-day calorie + protein totals over the last `days` days, oldest first. */
export async function getDailyTotals(
  days: number,
): Promise<{ day: string; calories: number; protein: number }[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{
    day: string;
    calories: number;
    protein: number;
  }>(
    `SELECT day, SUM(calories) AS calories, SUM(protein) AS protein
       FROM meals
      GROUP BY day
      ORDER BY day DESC
      LIMIT ?`,
    days,
  );
  return rows.reverse();
}
