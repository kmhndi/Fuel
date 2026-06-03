import { getDb } from './index';
import { toDayKey } from './dates';
import type { Exercise, ExerciseSource } from '../types';

interface ExerciseRow {
  id: number;
  name: string;
  calories: number;
  logged_at: string;
  day: string;
  source: ExerciseSource | null;
  external_id: string | null;
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    loggedAt: row.logged_at,
    day: row.day,
    source: row.source ?? 'manual',
    externalId: row.external_id,
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
    "INSERT INTO exercise (name, calories, logged_at, day, source, external_id) VALUES (?, ?, ?, ?, 'manual', NULL)",
    name.trim() || 'Exercise',
    Math.max(0, Math.round(calories)),
    now.toISOString(),
    day ?? toDayKey(now),
  );
}

/**
 * Insert or update an externally-sourced exercise entry (e.g. a WHOOP workout),
 * keyed by its stable `externalId` so re-syncing the same workout updates the
 * existing row instead of creating duplicates.
 */
export async function upsertExternalExercise(params: {
  externalId: string;
  source: ExerciseSource;
  name: string;
  calories: number;
  day: string;
  loggedAt: string;
}): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO exercise (name, calories, logged_at, day, source, external_id)
       VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(external_id) DO UPDATE SET
       name = excluded.name,
       calories = excluded.calories,
       logged_at = excluded.logged_at,
       day = excluded.day,
       source = excluded.source`,
    params.name.trim() || 'Workout',
    Math.max(0, Math.round(params.calories)),
    params.loggedAt,
    params.day,
    params.source,
    params.externalId,
  );
}

/** Remove every externally-sourced exercise entry for a given source. */
export async function deleteExercisesBySource(
  source: ExerciseSource,
): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM exercise WHERE source = ?', source);
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
