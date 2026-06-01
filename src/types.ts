/** Shared domain types for Fuel. */

/** A meal category key. The original four ship by default, but users can add
 *  their own, so this is a free string rather than a closed union. */
export type MealType = string;

/** The default categories, used as fallbacks and for time-of-day guessing. */
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/** A customizable meal category. */
export interface MealCategory {
  id: number;
  key: string;
  name: string;
  /** Ionicons glyph name. */
  icon: string;
  sort: number;
}

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

export type Language = 'en' | 'ar';

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
  /** Primary reminder time of day. */
  hour: number;
  minute: number;
  /** Optional second daily reminder time (null = none). */
  hour2: number | null;
  minute2: number | null;
  /** Days the reminder fires (0=Sun..6=Sat); null = every day. */
  weekdays: number[] | null;
  /** Whether reminders are active. */
  enabled: boolean;
  /** expo-notifications identifiers for all scheduled reminders. */
  notificationIds: string[];
  /** Doses remaining, or null if inventory isn't tracked. */
  stock: number | null;
  /** Warn when stock falls to or below this (0 = no threshold). */
  refillAt: number;
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
  /** Optional manual resting burn (RMR, kcal/day); null = auto from profile. */
  restingBurn: number | null;
  theme: ThemeMode;
  /** UI language. */
  language: Language;
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
> & {
  hour2?: number | null;
  minute2?: number | null;
  weekdays?: number[] | null;
  stock?: number | null;
  refillAt?: number;
};
