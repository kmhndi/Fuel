import type { Sex, WeightUnit } from './types';

const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

/** Convert a stored kg value into the user's preferred display unit. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kgToLb(kg) : kg;
}

/** Convert a value entered in the display unit back to kg for storage. */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

/** e.g. "72.4 kg" or "159.6 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${kgToDisplay(kg, unit).toFixed(1)} ${unit}`;
}

export interface ActivityLevel {
  value: number;
  label: string;
  hint: string;
}

/** Standard activity multipliers applied to BMR to estimate TDEE. */
export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { value: 1.2, label: 'Sedentary', hint: 'Little or no exercise' },
  { value: 1.375, label: 'Light', hint: '1–3 days/week' },
  { value: 1.55, label: 'Moderate', hint: '3–5 days/week' },
  { value: 1.725, label: 'Active', hint: '6–7 days/week' },
  { value: 1.9, label: 'Very active', hint: 'Hard daily training' },
];

/**
 * Mifflin-St Jeor basal metabolic rate (kcal/day). Returns null unless all
 * inputs are present and sensible.
 */
export function bmr(
  sex: Sex | null,
  age: number | null,
  heightCm: number | null,
  weightKg: number | null,
): number | null {
  if (!sex || !age || !heightCm || !weightKg) return null;
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/** Total daily energy expenditure = BMR × activity multiplier. */
export function tdee(
  sex: Sex | null,
  age: number | null,
  heightCm: number | null,
  weightKg: number | null,
  activity: number,
): number | null {
  const base = bmr(sex, age, heightCm, weightKg);
  return base === null ? null : Math.round(base * activity);
}

/** Calorie targets for losing / maintaining / gaining around a TDEE. */
export function goalTargets(tdeeValue: number) {
  return {
    lose: Math.round(tdeeValue - 500),
    maintain: tdeeValue,
    gain: Math.round(tdeeValue + 300),
  };
}
