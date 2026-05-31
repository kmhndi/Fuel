import { getDb } from './index';
import { shiftDay, toDayKey } from './dates';
import {
  cancelReminder,
  scheduleDailyReminder,
} from '../notifications';
import type { NewSupplement, Supplement, SupplementStatus } from '../types';

interface SupplementRow {
  id: number;
  name: string;
  dose: string | null;
  hour: number;
  minute: number;
  enabled: number;
  notification_id: string | null;
}

function mapRow(row: SupplementRow): Supplement {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    hour: row.hour,
    minute: row.minute,
    enabled: row.enabled === 1,
    notificationId: row.notification_id,
  };
}

/** All supplements, ordered by reminder time of day. */
export async function getSupplements(): Promise<Supplement[]> {
  const db = getDb();
  const rows = await db.getAllAsync<SupplementRow>(
    'SELECT * FROM supplements ORDER BY hour, minute',
  );
  return rows.map(mapRow);
}

/**
 * Consecutive-day streak ending today (or yesterday, so a not-yet-taken-today
 * supplement still shows its live streak).
 */
function computeStreak(takenDays: Set<string>): number {
  let cursor = toDayKey();
  if (!takenDays.has(cursor)) {
    cursor = shiftDay(cursor, -1);
    if (!takenDays.has(cursor)) return 0;
  }
  let streak = 0;
  while (takenDays.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * Supplements augmented with today's "taken" state and current streak — the
 * data the daily checklist needs.
 */
export async function getSupplementsWithStatus(): Promise<SupplementStatus[]> {
  const db = getDb();
  const supplements = await getSupplements();
  const today = toDayKey();

  const logs = await db.getAllAsync<{ supplement_id: number; day: string }>(
    'SELECT supplement_id, day FROM supplement_logs',
  );

  const daysBySupplement = new Map<number, Set<string>>();
  for (const log of logs) {
    let set = daysBySupplement.get(log.supplement_id);
    if (!set) {
      set = new Set();
      daysBySupplement.set(log.supplement_id, set);
    }
    set.add(log.day);
  }

  return supplements.map((s) => {
    const days = daysBySupplement.get(s.id) ?? new Set<string>();
    return {
      ...s,
      takenToday: days.has(today),
      streak: computeStreak(days),
    };
  });
}

/**
 * Rough adherence over the last `days` days: how many supplement-doses were
 * checked off versus how many were possible (current supplement count × days).
 */
export async function getRecentAdherence(
  days: number,
): Promise<{ taken: number; possible: number }> {
  const db = getDb();
  const countRow = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM supplements',
  );
  const supplementCount = countRow?.c ?? 0;
  const since = shiftDay(toDayKey(), -(days - 1));
  const takenRow = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM supplement_logs WHERE day >= ?',
    since,
  );
  return { taken: takenRow?.c ?? 0, possible: supplementCount * days };
}

/** Mark (or unmark) a supplement as taken on a given day. */
export async function setTaken(
  supplementId: number,
  taken: boolean,
  day: string = toDayKey(),
): Promise<void> {
  const db = getDb();
  if (taken) {
    await db.runAsync(
      `INSERT OR IGNORE INTO supplement_logs (supplement_id, day, taken_at)
       VALUES (?, ?, ?)`,
      supplementId,
      day,
      new Date().toISOString(),
    );
  } else {
    await db.runAsync(
      'DELETE FROM supplement_logs WHERE supplement_id = ? AND day = ?',
      supplementId,
      day,
    );
  }
}

/**
 * Add a supplement and schedule its daily reminder. If the OS hasn't granted
 * notification permission, the supplement is still saved (enabled) but without
 * a scheduled notification id, so the user sees it in the list.
 */
export async function addSupplement(
  input: NewSupplement,
): Promise<Supplement> {
  const db = getDb();
  const name = input.name.trim();
  const dose = input.dose?.trim() ? input.dose.trim() : null;

  const notificationId = await scheduleDailyReminder(
    name,
    dose,
    input.hour,
    input.minute,
  ).catch(() => null);

  const result = await db.runAsync(
    `INSERT INTO supplements (name, dose, hour, minute, enabled, notification_id)
     VALUES (?, ?, ?, ?, 1, ?)`,
    name,
    dose,
    input.hour,
    input.minute,
    notificationId,
  );

  return {
    id: result.lastInsertRowId,
    name,
    dose,
    hour: input.hour,
    minute: input.minute,
    enabled: true,
    notificationId,
  };
}

/**
 * Toggle a supplement's reminder on or off, scheduling/cancelling the
 * underlying notification to match.
 */
export async function setSupplementEnabled(
  supplement: Supplement,
  enabled: boolean,
): Promise<Supplement> {
  const db = getDb();
  let notificationId = supplement.notificationId;

  if (enabled) {
    notificationId = await scheduleDailyReminder(
      supplement.name,
      supplement.dose,
      supplement.hour,
      supplement.minute,
    ).catch(() => null);
  } else {
    await cancelReminder(supplement.notificationId);
    notificationId = null;
  }

  await db.runAsync(
    'UPDATE supplements SET enabled = ?, notification_id = ? WHERE id = ?',
    enabled ? 1 : 0,
    notificationId,
    supplement.id,
  );

  return { ...supplement, enabled, notificationId };
}

/** Delete a supplement, its adherence history, and any pending reminder. */
export async function deleteSupplement(
  supplement: Supplement,
): Promise<void> {
  const db = getDb();
  await cancelReminder(supplement.notificationId);
  await db.runAsync(
    'DELETE FROM supplement_logs WHERE supplement_id = ?',
    supplement.id,
  );
  await db.runAsync('DELETE FROM supplements WHERE id = ?', supplement.id);
}
