/**
 * Date helpers. Days are represented as local-calendar `YYYY-MM-DD` strings so
 * that "today" matches the user's wall clock rather than UTC.
 */

/** Local calendar day (YYYY-MM-DD) for the given date, defaulting to now. */
export function toDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Human-friendly label for a day key, e.g. "Today", "Yesterday", or a date. */
export function formatDayLabel(dayKey: string): string {
  const today = toDayKey();
  if (dayKey === today) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === toDayKey(yesterday)) return 'Yesterday';

  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** The day key `offset` days away from `dayKey` (negative = earlier). */
export function shiftDay(dayKey: string, offset: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return toDayKey(date);
}

/** Whether a day key refers to today. */
export function isToday(dayKey: string): boolean {
  return dayKey === toDayKey();
}

/** Whether a day key is in the future (used to cap forward navigation). */
export function isFuture(dayKey: string): boolean {
  return dayKey > toDayKey();
}

/** Format an hour/minute pair as a localized time, e.g. "8:30 AM". */
export function formatTime(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
