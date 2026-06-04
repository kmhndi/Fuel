import * as StoreReview from 'expo-store-review';
import { getReviewPrompted, setReviewPrompted } from './db/settings';

/**
 * Minimum logging streak before we ask for an App Store / Play Store review.
 * Asking only once the user has a real streak keeps the prompt at a genuine
 * high point and skews the ratings we collect towards engaged users.
 */
const REVIEW_STREAK_THRESHOLD = 3;

/**
 * Ask for a store review at a natural high point, at most once ever. Safe to
 * call on every home-screen load: it no-ops until the user has built a streak,
 * after the first prompt, and wherever the native review API is unavailable
 * (web, dev client, or when the OS has throttled it).
 */
export async function maybeAskForReview(streak: number): Promise<void> {
  try {
    if (streak < REVIEW_STREAK_THRESHOLD) return;
    if (await getReviewPrompted()) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Record the attempt *before* showing the prompt: the OS gives no
    // completion callback, and we only ever want to ask a single time.
    await setReviewPrompted();
    await StoreReview.requestReview();
  } catch {
    // Never let a review prompt failure surface to the user.
  }
}
