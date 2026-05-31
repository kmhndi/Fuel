import { getDb } from './index';
import {
  cancelReminder,
  scheduleDailyReminder,
} from '../notifications';
import type { NewSupplement, Supplement } from '../types';

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

/** Delete a supplement and cancel any pending reminder. */
export async function deleteSupplement(
  supplement: Supplement,
): Promise<void> {
  const db = getDb();
  await cancelReminder(supplement.notificationId);
  await db.runAsync('DELETE FROM supplements WHERE id = ?', supplement.id);
}
