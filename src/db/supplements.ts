import { getDb } from './index';
import { shiftDay, streakFromDays, toDayKey } from './dates';
import { cancelReminders, scheduleReminders } from '../notifications';
import type { NewSupplement, Supplement, SupplementStatus } from '../types';

interface SupplementRow {
  id: number;
  name: string;
  dose: string | null;
  hour: number;
  minute: number;
  hour2: number | null;
  minute2: number | null;
  weekdays: string | null;
  enabled: number;
  notification_ids: string | null;
  stock: number | null;
  refill_at: number;
}

function parseJsonArray<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function mapRow(row: SupplementRow): Supplement {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    hour: row.hour,
    minute: row.minute,
    hour2: row.hour2,
    minute2: row.minute2,
    weekdays: parseJsonArray<number>(row.weekdays),
    enabled: row.enabled === 1,
    notificationIds: parseJsonArray<string>(row.notification_ids) ?? [],
    stock: row.stock,
    refillAt: row.refill_at,
  };
}

/** Build the list of reminder times for a supplement-like input. */
function timesOf(
  hour: number,
  minute: number,
  hour2: number | null | undefined,
  minute2: number | null | undefined,
): { hour: number; minute: number }[] {
  const times = [{ hour, minute }];
  if (hour2 != null && minute2 != null) times.push({ hour: hour2, minute: minute2 });
  return times;
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
  const weekdays = input.weekdays ?? null;
  const hour2 = input.hour2 ?? null;
  const minute2 = input.minute2 ?? null;
  let notificationIds = existing.notificationIds;

  if (existing.enabled) {
    await cancelReminders(existing.notificationIds);
    notificationIds = await scheduleReminders(
      name,
      dose,
      timesOf(input.hour, input.minute, hour2, minute2),
      weekdays,
    ).catch(() => []);
  }

  await db.runAsync(
    `UPDATE supplements
        SET name = ?, dose = ?, hour = ?, minute = ?, hour2 = ?, minute2 = ?,
            weekdays = ?, notification_ids = ?, stock = ?, refill_at = ?
      WHERE id = ?`,
    name,
    dose,
    input.hour,
    input.minute,
    hour2,
    minute2,
    weekdays ? JSON.stringify(weekdays) : null,
    JSON.stringify(notificationIds),
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
  const weekdays = input.weekdays ?? null;
  const hour2 = input.hour2 ?? null;
  const minute2 = input.minute2 ?? null;

  const notificationIds = await scheduleReminders(
    name,
    dose,
    timesOf(input.hour, input.minute, hour2, minute2),
    weekdays,
  ).catch(() => []);

  const stock = input.stock ?? null;
  const refillAt = input.refillAt ?? 0;
  const result = await db.runAsync(
    `INSERT INTO supplements
       (name, dose, hour, minute, hour2, minute2, weekdays, enabled, notification_ids, stock, refill_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    name,
    dose,
    input.hour,
    input.minute,
    hour2,
    minute2,
    weekdays ? JSON.stringify(weekdays) : null,
    JSON.stringify(notificationIds),
    stock,
    refillAt,
  );

  return {
    id: result.lastInsertRowId,
    name,
    dose,
    hour: input.hour,
    minute: input.minute,
    hour2,
    minute2,
    weekdays,
    enabled: true,
    notificationIds,
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
  let notificationIds = supplement.notificationIds;

  if (enabled) {
    notificationIds = await scheduleReminders(
      supplement.name,
      supplement.dose,
      timesOf(supplement.hour, supplement.minute, supplement.hour2, supplement.minute2),
      supplement.weekdays,
    ).catch(() => []);
  } else {
    await cancelReminders(supplement.notificationIds);
    notificationIds = [];
  }

  await db.runAsync(
    'UPDATE supplements SET enabled = ?, notification_ids = ? WHERE id = ?',
    enabled ? 1 : 0,
    JSON.stringify(notificationIds),
    supplement.id,
  );

  return { ...supplement, enabled, notificationIds };
}

/** Delete a supplement, its adherence history, and any pending reminder. */
export async function deleteSupplement(
  supplement: Supplement,
): Promise<void> {
  const db = getDb();
  await cancelReminders(supplement.notificationIds);
  await db.runAsync(
    'DELETE FROM supplement_logs WHERE supplement_id = ?',
    supplement.id,
  );
  await db.runAsync('DELETE FROM supplements WHERE id = ?', supplement.id);
}
