import { getDb } from './index';
import { toDayKey } from './dates';
import type { WeightEntry } from '../types';

interface WeightRow {
  id: number;
  kg: number;
  logged_at: string;
  day: string;
}

function mapRow(row: WeightRow): WeightEntry {
  return { id: row.id, kg: row.kg, loggedAt: row.logged_at, day: row.day };
}

/**
 * Record a weight (in kg). One entry per day: logging again on the same day
 * overwrites that day's value so the trend stays clean.
 */
export async function addWeight(kg: number, day?: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const targetDay = day ?? toDayKey(now);
  await db.runAsync('DELETE FROM weights WHERE day = ?', targetDay);
  await db.runAsync(
    'INSERT INTO weights (kg, logged_at, day) VALUES (?, ?, ?)',
    kg,
    now.toISOString(),
    targetDay,
  );
}

/** All weight entries, oldest first (handy for charting). */
export async function getWeights(): Promise<WeightEntry[]> {
  const db = getDb();
  const rows = await db.getAllAsync<WeightRow>(
    'SELECT * FROM weights ORDER BY day ASC',
  );
  return rows.map(mapRow);
}

/** Most recent weight entry, or null if none logged. */
export async function getLatestWeight(): Promise<WeightEntry | null> {
  const db = getDb();
  const row = await db.getFirstAsync<WeightRow>(
    'SELECT * FROM weights ORDER BY day DESC LIMIT 1',
  );
  return row ? mapRow(row) : null;
}

export async function deleteWeight(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM weights WHERE id = ?', id);
}
