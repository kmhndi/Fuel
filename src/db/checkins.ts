import { getDb } from './index';
import type { CheckIn } from '../types';

interface CheckInRow {
  day: string;
  mood: number | null;
  energy: number | null;
  note: string | null;
}

export async function getCheckIn(day: string): Promise<CheckIn | null> {
  const db = getDb();
  const row = await db.getFirstAsync<CheckInRow>(
    'SELECT * FROM checkins WHERE day = ?',
    day,
  );
  return row
    ? { day: row.day, mood: row.mood, energy: row.energy, note: row.note }
    : null;
}

/** Upsert a day's mood/energy check-in (1–5 each, null to clear). */
export async function saveCheckIn(
  day: string,
  mood: number | null,
  energy: number | null,
  note: string | null = null,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO checkins (day, mood, energy, note) VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       mood = excluded.mood, energy = excluded.energy, note = excluded.note`,
    day,
    mood,
    energy,
    note?.trim() || null,
  );
}

/** Recent check-ins (most recent first) for trend display. */
export async function getRecentCheckIns(days: number): Promise<CheckIn[]> {
  const db = getDb();
  const rows = await db.getAllAsync<CheckInRow>(
    'SELECT * FROM checkins ORDER BY day DESC LIMIT ?',
    days,
  );
  return rows.map((r) => ({ day: r.day, mood: r.mood, energy: r.energy, note: r.note }));
}
