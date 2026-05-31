/** Shared domain types for Fuel. */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

/** Macronutrient grams. */
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** A single logged food/meal entry. */
export interface Meal extends Macros {
  id: number;
  name: string;
  calories: number;
  mealType: MealType;
  /** Optional fiber/sugar grams (subset of carbs). */
  fiber: number;
  sugar: number;
  /** Optional free-text note (e.g. "felt too salty"). */
  note: string | null;
  /** Optional label, e.g. "homemade" or "eating out". */
  tag: string | null;
  /** ISO timestamp of when the meal was logged. */
  loggedAt: string;
  /** Local calendar day in YYYY-MM-DD form, used for daily grouping. */
  day: string;
}

/** A user-defined one-tap quick-add food. */
export interface Preset extends Macros {
  id: number;
  name: string;
  calories: number;
  sort: number;
}

/** A daily mood/energy check-in (1–5 scales). */
export interface CheckIn {
  day: string;
  mood: number | null;
  energy: number | null;
  note: string | null;
}

/** Optional body measurements for a day. */
export interface DayMeasurement {
  day: string;
  waistCm: number | null;
  bodyFat: number | null;
}

export type ThemeMode = 'dark' | 'light';

/** A logged bout of exercise whose calories add back to the daily budget. */
export interface Exercise {
  id: number;
  name: string;
  calories: number;
  loggedAt: string;
  day: string;
}

/** A body-weight entry, always stored in kilograms. */
export interface WeightEntry {
  id: number;
  kg: number;
  loggedAt: string;
  day: string;
}

export type WeightUnit = 'kg' | 'lb';

export type Sex = 'male' | 'female';

/**
 * A reusable food in the library, accumulated from logged meals so common
 * items can be re-added with a single tap.
 */
export interface Food extends Macros {
  id: number;
  name: string;
  calories: number;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt: string;
}

/** A supplement the user wants to be reminded to take. */
export interface Supplement {
  id: number;
  name: string;
  /** Optional dose note, e.g. "1000 IU" or "2 capsules". */
  dose: string | null;
  /** Reminder time of day, 0-23. */
  hour: number;
  /** Reminder time of day, 0-59. */
  minute: number;
  /** Whether the daily reminder is active. */
  enabled: boolean;
  /** expo-notifications identifier for the scheduled reminder, if any. */
  notificationId: string | null;
}

/** A supplement plus today's adherence + streak, for the daily checklist. */
export interface SupplementStatus extends Supplement {
  takenToday: boolean;
  /** Consecutive days (ending today or yesterday) the supplement was taken. */
  streak: number;
}

/** Daily targets and personal profile the user is tracking against. */
export interface Goals {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  waterGoal: number;
  glassMl: number;
  weightUnit: WeightUnit;
  /** Profile fields, used by the TDEE calculator (null until provided). */
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  activity: number;
  /** Optional target body weight in kg. */
  goalWeightKg: number | null;
  /** Daily caffeine limit in mg. */
  caffeineLimit: number;
  theme: ThemeMode;
  /** Accent color hex. */
  accent: string;
  /** Whether interval water reminders are enabled. */
  waterReminders: boolean;
  /**
   * Optional per-weekday calorie overrides, indexed 0=Sunday..6=Saturday.
   * A null entry (or null array) falls back to `calorieGoal`.
   */
  weekdayGoals: (number | null)[] | null;
  onboarded: boolean;
}

export interface NewMeal extends Macros {
  name: string;
  calories: number;
  mealType: MealType;
  fiber?: number;
  sugar?: number;
  note?: string | null;
  tag?: string | null;
}

export type NewSupplement = Pick<
  Supplement,
  'name' | 'dose' | 'hour' | 'minute'
>;
