import type { MealType } from './types';

/** Atwater factors: calories per gram of each macronutrient. */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Estimate calories implied by a macro split (rounded). */
export function caloriesFromMacros(
  protein: number,
  carbs: number,
  fat: number,
): number {
  return Math.round(
    protein * KCAL_PER_GRAM.protein +
      carbs * KCAL_PER_GRAM.carbs +
      fat * KCAL_PER_GRAM.fat,
  );
}

export type ProteinPref = 'cut' | 'maintain' | 'build';

/** Protein target in grams per kg of bodyweight, by goal intent. */
const PROTEIN_G_PER_KG: Record<ProteinPref, number> = {
  cut: 2.0,
  maintain: 1.8,
  build: 2.0,
};

/**
 * A starting macro split for a calorie target: protein scaled by bodyweight
 * (or 30% of calories when weight is unknown), fat at 25% of calories, carbs
 * filling the remainder. All grams, rounded, carbs floored at 0.
 */
export function suggestMacros(
  calories: number,
  weightKg: number | null,
  pref: ProteinPref,
): { protein: number; carbs: number; fat: number } {
  const protein =
    weightKg && weightKg > 0
      ? Math.round(weightKg * PROTEIN_G_PER_KG[pref])
      : Math.round((calories * 0.3) / KCAL_PER_GRAM.protein);
  const fat = Math.round((calories * 0.25) / KCAL_PER_GRAM.fat);
  const carbs = Math.max(
    0,
    Math.round(
      (calories - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat) /
        KCAL_PER_GRAM.carbs,
    ),
  );
  return { protein, carbs, fat };
}

/** Distinct colors per macro, reused across rings, bars, and legends. */
export const macroColors = {
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#F472B6',
} as const;

interface MealTypeMeta {
  label: string;
  /** Ionicons glyph name. */
  icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' | 'cafe-outline';
}

export const mealTypeMeta: Record<MealType, MealTypeMeta> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline' },
  lunch: { label: 'Lunch', icon: 'partly-sunny-outline' },
  dinner: { label: 'Dinner', icon: 'moon-outline' },
  snack: { label: 'Snacks', icon: 'cafe-outline' },
};

/**
 * Pick the most likely meal type from the current time of day, so logging a
 * meal pre-selects something sensible.
 */
export function mealTypeForNow(date = new Date()): MealType {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
