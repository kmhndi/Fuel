/** Shared domain types for Fuel. */

/** A single logged food/meal entry. */
export interface Meal {
  id: number;
  name: string;
  calories: number;
  /** ISO timestamp of when the meal was logged. */
  loggedAt: string;
  /** Local calendar day in YYYY-MM-DD form, used for daily grouping. */
  day: string;
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

export type NewMeal = Pick<Meal, 'name' | 'calories'>;

export type NewSupplement = Pick<
  Supplement,
  'name' | 'dose' | 'hour' | 'minute'
>;
