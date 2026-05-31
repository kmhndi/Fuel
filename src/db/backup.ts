import { getDb } from './index';

/** Shape of a Fuel backup file. Bump `version` if the schema changes. */
export interface BackupData {
  app: 'fuel';
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

const TABLES = [
  'meals',
  'foods',
  'supplements',
  'supplement_logs',
  'water',
  'weights',
  'exercise',
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
    version: 3,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/**
 * Replace all data with the contents of a backup. Runs in a single
 * transaction so a malformed file can't leave a half-restored database.
 * Throws if the file isn't a recognisable Fuel backup.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  if (!data || data.app !== 'fuel' || typeof data.tables !== 'object') {
    throw new Error('This file is not a Fuel backup.');
  }
  const db = getDb();

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const table of TABLES) {
      await tx.execAsync(`DELETE FROM ${table}`);
      const rows = data.tables[table];
      if (!Array.isArray(rows)) continue;
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
