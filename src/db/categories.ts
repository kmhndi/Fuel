import { getDb } from './index';
import type { MealCategory } from '../types';

interface CategoryRow {
  id: number;
  key: string;
  name: string;
  icon: string;
  sort: number;
}

function mapRow(row: CategoryRow): MealCategory {
  return { id: row.id, key: row.key, name: row.name, icon: row.icon, sort: row.sort };
}

/** Meal categories in display order. */
export async function getCategories(): Promise<MealCategory[]> {
  const db = getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM meal_categories ORDER BY sort, id',
  );
  return rows.map(mapRow);
}

function slugify(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'category'}-${Date.now().toString(36)}`;
}

/** Add a new category; returns its generated key. */
export async function addCategory(name: string, icon: string): Promise<void> {
  const db = getDb();
  const max = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort) AS m FROM meal_categories',
  );
  await db.runAsync(
    'INSERT INTO meal_categories (key, name, icon, sort) VALUES (?, ?, ?, ?)',
    slugify(name),
    name.trim() || 'Category',
    icon,
    (max?.m ?? 0) + 1,
  );
}

export async function renameCategory(id: number, name: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE meal_categories SET name = ? WHERE id = ?',
    name.trim() || 'Category',
    id,
  );
}

/** Delete a category. Meals already filed under it keep their key (they show
 *  up under "Other" until re-categorized). */
export async function deleteCategory(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM meal_categories WHERE id = ?', id);
}
