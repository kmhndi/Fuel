import { getDb } from './index';

/** Glasses of water logged on a given day. */
export async function getWater(day: string): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ glasses: number }>(
    'SELECT glasses FROM water WHERE day = ?',
    day,
  );
  return row?.glasses ?? 0;
}

/** Set the absolute glass count for a day (clamped at 0). */
export async function setWater(day: string, glasses: number): Promise<number> {
  const db = getDb();
  const value = Math.max(0, Math.round(glasses));
  await db.runAsync(
    `INSERT INTO water (day, glasses) VALUES (?, ?)
     ON CONFLICT(day) DO UPDATE SET glasses = excluded.glasses`,
    day,
    value,
  );
  return value;
}

/** Adjust a day's glasses by `delta` (e.g. +1 or -1) and return the new total. */
export async function adjustWater(
  day: string,
  delta: number,
): Promise<number> {
  const current = await getWater(day);
  return setWater(day, current + delta);
}

/** Per-day glass counts over the last `days` days, oldest first. */
export async function getWaterTotals(
  days: number,
): Promise<{ day: string; glasses: number }[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ day: string; glasses: number }>(
    `SELECT day, glasses FROM water
      WHERE glasses > 0
      ORDER BY day DESC
      LIMIT ?`,
    days,
  );
  return rows.reverse();
}
