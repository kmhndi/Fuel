import { getDb } from './index';
import { shiftDay, streakFromDays, toDayKey } from './dates';
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
  stock: number | null;
  refill_at: number;
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
    stock: row.stock,
    refillAt: row.refill_at,
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
      streak: streakFromDays(days),
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

export async function getSupplement(id: number): Promise<Supplement | null> {
  const db = getDb();
  const row = await db.getFirstAsync<SupplementRow>(
    'SELECT * FROM supplements WHERE id = ?',
    id,
  );
  return row ? mapRow(row) : null;
}

/**
 * Update a supplement's details and, if its reminder is enabled, reschedule
 * the notification for the new name/dose/time.
 */
export async function updateSupplement(
  id: number,
  input: NewSupplement,
): Promise<void> {
  const db = getDb();
  const existing = await getSupplement(id);
  if (!existing) return;

  const name = input.name.trim();
  const dose = input.dose?.trim() ? input.dose.trim() : null;
  let notificationId = existing.notificationId;

  if (existing.enabled) {
    await cancelReminder(existing.notificationId);
    notificationId = await scheduleDailyReminder(
      name,
      dose,
      input.hour,
      input.minute,
    ).catch(() => null);
  }

  await db.runAsync(
    `UPDATE supplements
        SET name = ?, dose = ?, hour = ?, minute = ?, notification_id = ?,
            stock = ?, refill_at = ?
      WHERE id = ?`,
    name,
    dose,
    input.hour,
    input.minute,
    notificationId,
    input.stock ?? null,
    input.refillAt ?? 0,
    id,
  );
}

/** Mark every supplement as taken for the given day. */
export async function markAllTaken(day: string = toDayKey()): Promise<void> {
  const supplements = await getSupplements();
  for (const s of supplements) {
    await setTaken(s.id, true, day);
  }
}

/**
 * Daily completion over the last `days` days: how many supplements were taken
 * each day versus the current supplement count. Oldest first, for a dot strip.
 */
export async function getDailyAdherence(
  days: number,
): Promise<{ day: string; taken: number; total: number }[]> {
  const db = getDb();
  const countRow = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM supplements',
  );
  const total = countRow?.c ?? 0;

  const since = shiftDay(toDayKey(), -(days - 1));
  const rows = await db.getAllAsync<{ day: string; taken: number }>(
    `SELECT day, COUNT(*) AS taken FROM supplement_logs
      WHERE day >= ? GROUP BY day`,
    since,
  );
  const takenByDay = new Map(rows.map((r) => [r.day, r.taken]));

  const result: { day: string; taken: number; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = shiftDay(toDayKey(), -i);
    result.push({ day, taken: takenByDay.get(day) ?? 0, total });
  }
  return result;
}

/** Mark (or unmark) a supplement as taken on a given day. */
export async function setTaken(
  supplementId: number,
  taken: boolean,
  day: string = toDayKey(),
): Promise<void> {
  const db = getDb();
  if (taken) {
    const res = await db.runAsync(
      `INSERT OR IGNORE INTO supplement_logs (supplement_id, day, taken_at)
       VALUES (?, ?, ?)`,
      supplementId,
      day,
      new Date().toISOString(),
    );
    // Only decrement inventory if this actually marked a new dose.
    if (res.changes > 0) {
      await db.runAsync(
        'UPDATE supplements SET stock = MAX(0, stock - 1) WHERE id = ? AND stock IS NOT NULL',
        supplementId,
      );
    }
  } else {
    const res = await db.runAsync(
      'DELETE FROM supplement_logs WHERE supplement_id = ? AND day = ?',
      supplementId,
      day,
    );
    if (res.changes > 0) {
      await db.runAsync(
        'UPDATE supplements SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL',
        supplementId,
      );
    }
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

  const stock = input.stock ?? null;
  const refillAt = input.refillAt ?? 0;
  const result = await db.runAsync(
    `INSERT INTO supplements (name, dose, hour, minute, enabled, notification_id, stock, refill_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    name,
    dose,
    input.hour,
    input.minute,
    notificationId,
    stock,
    refillAt,
  );

  return {
    id: result.lastInsertRowId,
    name,
    dose,
    hour: input.hour,
    minute: input.minute,
    enabled: true,
    notificationId,
    stock,
    refillAt,
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
