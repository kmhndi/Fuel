/**
 * Trailing moving average. For each index, averages up to `window` values
 * ending at that index (fewer near the start). Zero/blank days are skipped so
 * a non-logged day doesn't drag the line to zero; if a window has no real
 * values the result is null at that point.
 */
export function movingAverage(
  values: number[],
  window: number,
): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v) => v > 0);
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
