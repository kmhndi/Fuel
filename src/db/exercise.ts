import { getDb } from './index';
import { toDayKey } from './dates';
import type { Exercise } from '../types';

interface ExerciseRow {
  id: number;
  name: string;
  calories: number;
  logged_at: string;
  day: string;
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    loggedAt: row.logged_at,
    day: row.day,
  };
}

/** Log a bout of exercise. Its calories add back to the day's budget. */
export async function addExercise(
  name: string,
  calories: number,
  day?: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db.runAsync(
    'INSERT INTO exercise (name, calories, logged_at, day) VALUES (?, ?, ?, ?)',
    name.trim() || 'Exercise',
    Math.max(0, Math.round(calories)),
    now.toISOString(),
    day ?? toDayKey(now),
  );
}

/** Exercise entries for a day, newest first. */
export async function getExerciseForDay(day: string): Promise<Exercise[]> {
  const db = getDb();
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercise WHERE day = ? ORDER BY logged_at DESC',
    day,
  );
  return rows.map(mapRow);
}

/** Total exercise calories burned on a day. */
export async function getExerciseTotal(day: string): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(calories) AS total FROM exercise WHERE day = ?',
    day,
  );
  return row?.total ?? 0;
}

export async function deleteExercise(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM exercise WHERE id = ?', id);
}
