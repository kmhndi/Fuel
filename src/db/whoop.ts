import { getDb } from './index';
import type { WhoopDaily } from '../types';

interface WhoopDailyRow {
  day: string;
  calories: number;
  strain: number | null;
  synced_at: string;
}

function mapRow(row: WhoopDailyRow): WhoopDaily {
  return { day: row.day, calories: row.calories, strain: row.strain };
}

/**
 * Insert or update WHOOP's total daily energy burn for a day. This figure
 * already includes both resting and active calories, so it is treated as the
 * authoritative energy-out for days where it exists.
 */
export async function upsertWhoopDaily(
  day: string,
  calories: number,
  strain: number | null,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO whoop_daily (day, calories, strain, synced_at)
       VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       calories = excluded.calories,
       strain = excluded.strain,
       synced_at = excluded.synced_at`,
    day,
    Math.max(0, Math.round(calories)),
    strain,
    new Date().toISOString(),
  );
}

/** WHOOP daily energy summary for a day, or null if none synced. */
export async function getWhoopDaily(day: string): Promise<WhoopDaily | null> {
  const db = getDb();
  const row = await db.getFirstAsync<WhoopDailyRow>(
    'SELECT * FROM whoop_daily WHERE day = ?',
    day,
  );
  return row ? mapRow(row) : null;
}

/** Remove all WHOOP daily summaries (used on disconnect / clear-all). */
export async function clearWhoopDaily(): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM whoop_daily');
}
