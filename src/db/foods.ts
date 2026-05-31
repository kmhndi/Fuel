import { getDb } from './index';
import type { Food, Macros } from '../types';

interface FoodRow {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_favorite: number;
  use_count: number;
  last_used_at: string;
}

function mapRow(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    isFavorite: row.is_favorite === 1,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  };
}

/** Normalised key used to dedupe foods regardless of casing/whitespace. */
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Record that a food was just logged: insert it into the library or, if it
 * already exists, bump its use count and refresh its macros to the latest
 * values the user entered. Favorite status is preserved on update.
 */
export async function rememberFood(
  name: string,
  calories: number,
  macros: Macros,
  loggedAt: string,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO foods
       (name, name_key, calories, protein, carbs, fat, use_count, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(name_key) DO UPDATE SET
       name = excluded.name,
       calories = excluded.calories,
       protein = excluded.protein,
       carbs = excluded.carbs,
       fat = excluded.fat,
       use_count = use_count + 1,
       last_used_at = excluded.last_used_at`,
    name.trim(),
    nameKey(name),
    calories,
    macros.protein,
    macros.carbs,
    macros.fat,
    loggedAt,
  );
}

/**
 * Foods for the quick-add picker: favorites first, then most-recently used.
 * `query` filters by name (case-insensitive substring).
 */
export async function getFoodSuggestions(
  query = '',
  limit = 30,
): Promise<Food[]> {
  const db = getDb();
  const like = `%${query.trim().toLowerCase()}%`;
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM foods
      WHERE name_key LIKE ?
      ORDER BY is_favorite DESC, last_used_at DESC
      LIMIT ?`,
    like,
    limit,
  );
  return rows.map(mapRow);
}

export async function toggleFavorite(food: Food): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE foods SET is_favorite = ? WHERE id = ?',
    food.isFavorite ? 0 : 1,
    food.id,
  );
}

/** Remove a food from the library (does not affect already-logged meals). */
export async function deleteFood(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM foods WHERE id = ?', id);
}
