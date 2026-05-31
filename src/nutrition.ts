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
