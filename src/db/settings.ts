import { getDb } from './index';
import { cancelAllReminders } from '../notifications';
import type { Goals } from '../types';

interface SettingsRow {
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  onboarded: number;
}

const DEFAULTS: Goals = {
  calorieGoal: 2000,
  proteinGoal: 140,
  carbGoal: 220,
  fatGoal: 65,
  onboarded: false,
};

/** Read the single settings row, falling back to defaults if absent. */
export async function getGoals(): Promise<Goals> {
  const db = getDb();
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM settings WHERE id = 1',
  );
  if (!row) return DEFAULTS;
  return {
    calorieGoal: row.calorie_goal,
    proteinGoal: row.protein_goal,
    carbGoal: row.carb_goal,
    fatGoal: row.fat_goal,
    onboarded: row.onboarded === 1,
  };
}

/** Persist goals and mark the user as onboarded. */
export async function saveGoals(
  goals: Omit<Goals, 'onboarded'>,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO settings (id, calorie_goal, protein_goal, carb_goal, fat_goal, onboarded)
     VALUES (1, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       calorie_goal = excluded.calorie_goal,
       protein_goal = excluded.protein_goal,
       carb_goal = excluded.carb_goal,
       fat_goal = excluded.fat_goal,
       onboarded = 1`,
    Math.max(0, Math.round(goals.calorieGoal)),
    Math.max(0, Math.round(goals.proteinGoal)),
    Math.max(0, Math.round(goals.carbGoal)),
    Math.max(0, Math.round(goals.fatGoal)),
  );
}

/** Wipe all logged data (meals, food library, supplements, adherence). */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM foods;
    DELETE FROM supplement_logs;
    DELETE FROM supplements;
  `);
  // Drop any reminders that were scheduled for the now-deleted supplements.
  await cancelAllReminders();
}
