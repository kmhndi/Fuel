import { getDb } from './index';
import { cancelAllReminders } from '../notifications';
import type { Goals, Language, Sex, ThemeMode, WeightUnit } from '../types';

interface SettingsRow {
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  water_goal: number;
  glass_ml: number;
  weight_unit: WeightUnit;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  activity: number;
  goal_weight_kg: number | null;
  caffeine_limit: number;
  resting_burn: number | null;
  theme: ThemeMode;
  language: Language;
  accent: string;
  water_reminders: number;
  weekday_goals: string | null;
  onboarded: number;
}

const DEFAULTS: Goals = {
  calorieGoal: 2000,
  proteinGoal: 140,
  carbGoal: 220,
  fatGoal: 65,
  waterGoal: 8,
  glassMl: 250,
  weightUnit: 'kg',
  sex: null,
  age: null,
  heightCm: null,
  activity: 1.2,
  goalWeightKg: null,
  caffeineLimit: 400,
  restingBurn: null,
  theme: 'dark',
  language: 'en',
  accent: '#22D3A7',
  waterReminders: false,
  weekdayGoals: null,
  onboarded: false,
};

function parseWeekdayGoals(raw: string | null): (number | null)[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length === 7 ? arr : null;
  } catch {
    return null;
  }
}

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
    waterGoal: row.water_goal,
    glassMl: row.glass_ml,
    weightUnit: row.weight_unit,
    sex: row.sex,
    age: row.age,
    heightCm: row.height_cm,
    activity: row.activity,
    goalWeightKg: row.goal_weight_kg,
    caffeineLimit: row.caffeine_limit,
    restingBurn: row.resting_burn,
    theme: row.theme,
    language: row.language === 'ar' ? 'ar' : 'en',
    accent: row.accent,
    waterReminders: row.water_reminders === 1,
    weekdayGoals: parseWeekdayGoals(row.weekday_goals),
    onboarded: row.onboarded === 1,
  };
}

export type GoalUpdate = Partial<Omit<Goals, 'onboarded'>>;

/**
 * Persist any subset of goals/profile fields and mark the user as onboarded.
 * Only the provided keys are written, so callers can update one section
 * without clobbering the rest.
 */
export async function saveGoals(update: GoalUpdate): Promise<void> {
  const db = getDb();
  const current = await getGoals();
  const next = { ...current, ...update };
  await db.runAsync(
    `INSERT INTO settings
       (id, calorie_goal, protein_goal, carb_goal, fat_goal, water_goal,
        glass_ml, weight_unit, sex, age, height_cm, activity, goal_weight_kg,
        caffeine_limit, resting_burn, theme, language, accent, water_reminders, weekday_goals, onboarded)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       calorie_goal = excluded.calorie_goal,
       protein_goal = excluded.protein_goal,
       carb_goal = excluded.carb_goal,
       fat_goal = excluded.fat_goal,
       water_goal = excluded.water_goal,
       glass_ml = excluded.glass_ml,
       weight_unit = excluded.weight_unit,
       sex = excluded.sex,
       age = excluded.age,
       height_cm = excluded.height_cm,
       activity = excluded.activity,
       goal_weight_kg = excluded.goal_weight_kg,
       caffeine_limit = excluded.caffeine_limit,
       resting_burn = excluded.resting_burn,
       theme = excluded.theme,
       language = excluded.language,
       accent = excluded.accent,
       water_reminders = excluded.water_reminders,
       weekday_goals = excluded.weekday_goals,
       onboarded = 1`,
    Math.max(0, Math.round(next.calorieGoal)),
    Math.max(0, Math.round(next.proteinGoal)),
    Math.max(0, Math.round(next.carbGoal)),
    Math.max(0, Math.round(next.fatGoal)),
    Math.max(1, Math.round(next.waterGoal)),
    Math.max(50, Math.round(next.glassMl)),
    next.weightUnit,
    next.sex,
    next.age,
    next.heightCm,
    next.activity,
    next.goalWeightKg,
    Math.max(0, Math.round(next.caffeineLimit)),
    next.restingBurn != null ? Math.max(0, Math.round(next.restingBurn)) : null,
    next.theme,
    next.language,
    next.accent,
    next.waterReminders ? 1 : 0,
    next.weekdayGoals ? JSON.stringify(next.weekdayGoals) : null,
  );
}

/** Update only the language preference (without touching onboarding state). */
export async function setLanguageSetting(language: Language): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO settings (id, language) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET language = excluded.language`,
    language,
  );
}

/** Wipe all logged data across every table (keeps goals/settings). */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM foods;
    DELETE FROM supplement_logs;
    DELETE FROM supplements;
    DELETE FROM water;
    DELETE FROM weights;
    DELETE FROM exercise;
    DELETE FROM caffeine;
    DELETE FROM checkins;
    DELETE FROM measurements;
  `);
  await cancelAllReminders();
}
