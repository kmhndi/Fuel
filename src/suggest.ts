import type { Food } from './types';

/** What's left of today's budget that a suggestion should fit into. */
export interface RouletteBudget {
  calLeft: number;
  proteinLeft: number;
}

/**
 * Pick one food from the library that fits the remaining calorie budget,
 * favoring options that help close the protein gap (and, softly, ones the user
 * actually eats). Picks randomly among the strongest few so repeated spins
 * vary instead of always returning the single "best" match.
 *
 * Returns null when there's no meaningful room left (< 50 kcal) or nothing in
 * the library fits — the caller distinguishes those via the library size.
 *
 * `rng` is injectable so the choice is deterministic in tests.
 */
export function pickRoulette(
  foods: Food[],
  budget: RouletteBudget,
  rng: () => number = Math.random,
): Food | null {
  const { calLeft, proteinLeft } = budget;
  // Not worth suggesting anything once the day is essentially full.
  if (calLeft < 50) return null;

  // Allow a small overshoot so a near-fit isn't excluded on a technicality.
  const tolerance = Math.max(80, calLeft * 0.15);
  const candidates = foods.filter(
    (f) => f.calories > 0 && f.calories <= calLeft + tolerance,
  );
  if (candidates.length === 0) return null;

  const scored = candidates.map((food) => {
    // How much of the outstanding protein this food would cover (0..1).
    const proteinHelp =
      proteinLeft > 0 ? Math.min(food.protein, proteinLeft) / proteinLeft : 0;
    // Reward using more of the remaining room (a meal over a nibble), 0..1.
    const calFit = Math.max(0, 1 - Math.abs(calLeft - food.calories) / calLeft);
    // Gentle nudge toward foods the user favorites / eats often.
    const pop = (food.isFavorite ? 1 : 0) + Math.min(food.useCount, 20) / 20;
    // Base of 1 keeps every candidate reachable by the weighted draw.
    return { food, score: 1 + 2 * proteinHelp + calFit + 0.5 * pop };
  });

  scored.sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, Math.min(8, scored.length));
  const total = pool.reduce((sum, x) => sum + x.score, 0);

  let r = rng() * total;
  for (const x of pool) {
    r -= x.score;
    if (r <= 0) return x.food;
  }
  return pool[0].food;
}
