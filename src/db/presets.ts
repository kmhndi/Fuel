import { getDb } from './index';
import type { Macros, Preset } from '../types';

interface PresetRow {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sort: number;
}

function mapRow(row: PresetRow): Preset {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    sort: row.sort,
  };
}

/** All user-defined quick-add presets, in display order. */
export async function getPresets(): Promise<Preset[]> {
  const db = getDb();
  const rows = await db.getAllAsync<PresetRow>(
    'SELECT * FROM presets ORDER BY sort, id',
  );
  return rows.map(mapRow);
}

export async function addPreset(
  name: string,
  calories: number,
  macros: Macros,
): Promise<void> {
  const db = getDb();
  const max = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort) AS m FROM presets',
  );
  await db.runAsync(
    `INSERT INTO presets (name, calories, protein, carbs, fat, sort)
     VALUES (?, ?, ?, ?, ?, ?)`,
    name.trim() || 'Preset',
    Math.max(0, Math.round(calories)),
    Math.max(0, Math.round(macros.protein)),
    Math.max(0, Math.round(macros.carbs)),
    Math.max(0, Math.round(macros.fat)),
    (max?.m ?? 0) + 1,
  );
}

export async function deletePreset(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM presets WHERE id = ?', id);
}
