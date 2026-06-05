/**
 * The companion creature's emotional state, derived from how the user's day is
 * going. Kept as a tiny pure module so the mapping is easy to read, test, and
 * tune independently of the drawing/animation code.
 */
export type CompanionMood =
  | 'sleepy' // nothing logged yet (or viewing an empty past day)
  | 'content' // logging underway, nothing special
  | 'happy' // on track / good progress
  | 'celebrating' // today's calorie goal reached
  | 'worried' // streak about to break, or a big late-day shortfall
  | 'milestone'; // streak crossed a notable threshold

/** Signals the home screen already computes, fed into {@link deriveMood}. */
export interface MoodSignals {
  /** Whether the screen is showing today (vs. a past/other day). */
  isToday: boolean;
  streak: number;
  /** Today's calorie goal has been met. */
  goalHit: boolean;
  /** Number of meals logged on the viewed day. */
  mealsLogged: number;
  /** Calories left to the goal (negative when over). */
  calLeft: number;
  /** Protein grams left to the goal (negative when over). */
  proteinLeft: number;
  /** water / waterGoal, clamped at the call site (0..1+). */
  waterRatio: number;
  /** Self-reported mood from today's check-in (1..5), or null. */
  checkinMood: number | null;
  /** Local hour (0..23) — drives the "late and still empty" worry. */
  hourOfDay: number;
}

/** Streak lengths that earn a special, proud "milestone" look on the day. */
export const MILESTONE_STREAKS = [7, 14, 30, 50, 100, 200, 365];

export function isMilestoneStreak(streak: number): boolean {
  return MILESTONE_STREAKS.includes(streak);
}

/**
 * Map the day's signals to a single mood. Priority (first match wins):
 *   celebrating > milestone > worried > happy > content > sleepy
 *
 * Pure: the caller passes `hourOfDay` so there's no hidden clock dependency.
 */
export function deriveMood(s: MoodSignals): CompanionMood {
  if (s.isToday && s.goalHit) return 'celebrating';
  if (isMilestoneStreak(s.streak)) return 'milestone';
  if (
    s.isToday &&
    ((s.streak >= 1 && s.mealsLogged === 0 && s.hourOfDay >= 18) ||
      (s.calLeft > 600 && s.mealsLogged > 0 && s.hourOfDay >= 20))
  ) {
    return 'worried';
  }
  if (
    s.mealsLogged > 0 &&
    (s.calLeft <= 300 ||
      s.proteinLeft <= 10 ||
      s.waterRatio >= 1 ||
      (s.checkinMood ?? 0) >= 4)
  ) {
    return 'happy';
  }
  if (s.mealsLogged > 0) return 'content';
  return 'sleepy';
}
