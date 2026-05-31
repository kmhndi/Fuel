import { getDb } from './index';
import type { DayMeasurement } from '../types';

interface MeasurementRow {
  day: string;
  waist_cm: number | null;
  body_fat: number | null;
}

function mapRow(row: MeasurementRow): DayMeasurement {
  return { day: row.day, waistCm: row.waist_cm, bodyFat: row.body_fat };
}

/** Upsert a day's body measurements (null values are left empty). */
export async function saveMeasurement(
  day: string,
  waistCm: number | null,
  bodyFat: number | null,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO measurements (day, waist_cm, body_fat) VALUES (?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       waist_cm = excluded.waist_cm, body_fat = excluded.body_fat`,
    day,
    waistCm,
    bodyFat,
  );
}

/** Most recent measurement entry, or null. */
export async function getLatestMeasurement(): Promise<DayMeasurement | null> {
  const db = getDb();
  const row = await db.getFirstAsync<MeasurementRow>(
    `SELECT * FROM measurements
      WHERE waist_cm IS NOT NULL OR body_fat IS NOT NULL
      ORDER BY day DESC LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}
