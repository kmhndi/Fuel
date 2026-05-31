import { getDb } from './index';

/** Caffeine (mg) logged on a given day. */
export async function getCaffeine(day: string): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ mg: number }>(
    'SELECT mg FROM caffeine WHERE day = ?',
    day,
  );
  return row?.mg ?? 0;
}

/** Add `mg` of caffeine to a day (negative to remove); clamped at 0. */
export async function addCaffeine(day: string, mg: number): Promise<number> {
  const db = getDb();
  const current = await getCaffeine(day);
  const value = Math.max(0, current + Math.round(mg));
  await db.runAsync(
    `INSERT INTO caffeine (day, mg) VALUES (?, ?)
     ON CONFLICT(day) DO UPDATE SET mg = excluded.mg`,
    day,
    value,
  );
  return value;
}

/** Reset a day's caffeine to zero. */
export async function clearCaffeine(day: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM caffeine WHERE day = ?', day);
}
