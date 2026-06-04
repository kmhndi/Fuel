import { getDb } from './index';

/** Shape of a Fuel backup file. Bump `version` if the schema changes. */
export interface BackupData {
  app: 'fuel';
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

// Every user table, kept in sync with the migrations in ./index. Anything
// omitted here is silently dropped from backups, so each new table must be
// added or its data is lost on backup/restore.
const TABLES = [
  'meals',
  'foods',
  'supplements',
  'supplement_logs',
  'water',
  'weights',
  'exercise',
  'caffeine',
  'checkins',
  'measurements',
  'presets',
  'meal_categories',
  'whoop_daily',
  'settings',
];

/** Gather every row from every table into a serialisable backup object. */
export async function collectBackup(): Promise<BackupData> {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  return {
    app: 'fuel',
    version: 4,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/**
 * Replace stored data with the contents of a backup. Runs in a single
 * transaction so a malformed file can't leave a half-restored database.
 * Tables absent from the file are left untouched, so restoring an older
 * backup can't wipe data the file doesn't carry. Throws if the file isn't a
 * recognisable Fuel backup.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  if (!data || data.app !== 'fuel' || typeof data.tables !== 'object') {
    throw new Error('This file is not a Fuel backup.');
  }
  const db = getDb();

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const table of TABLES) {
      const rows = data.tables[table];
      // A table missing from the file (e.g. an older export) is left as-is
      // rather than wiped — only clear and replace what the backup contains.
      if (!Array.isArray(rows)) continue;
      await tx.execAsync(`DELETE FROM ${table}`);
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const cols = Object.keys(row as Record<string, unknown>);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => (row as Record<string, unknown>)[c]);
        await tx.runAsync(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          values as (string | number | null)[],
        );
      }
    }
  });
}
