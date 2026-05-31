import * as SQLite from 'expo-sqlite';

/**
 * Single shared connection to the on-device SQLite database. Opened lazily so
 * the native module is only touched once the app actually needs storage.
 */
let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('fuel.db');
  }
  return dbInstance;
}

/**
 * Ordered schema migrations. Each entry upgrades the database from version
 * `index` to `index + 1`, so appending a new step is all it takes to evolve
 * the schema while preserving existing on-device data.
 */
const MIGRATIONS: string[] = [
  // 0 -> 1: initial calorie + supplement tables.
  `
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      day TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_day ON meals (day);

    CREATE TABLE IF NOT EXISTS supplements (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dose TEXT,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      notification_id TEXT
    );
  `,
  // 1 -> 2: macros + meal type, a reusable food library, supplement
  // adherence logs, and a single-row settings/goals table.
  `
    ALTER TABLE meals ADD COLUMN protein REAL NOT NULL DEFAULT 0;
    ALTER TABLE meals ADD COLUMN carbs REAL NOT NULL DEFAULT 0;
    ALTER TABLE meals ADD COLUMN fat REAL NOT NULL DEFAULT 0;
    ALTER TABLE meals ADD COLUMN meal_type TEXT NOT NULL DEFAULT 'snack';

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_foods_recent ON foods (last_used_at DESC);

    CREATE TABLE IF NOT EXISTS supplement_logs (
      id INTEGER PRIMARY KEY NOT NULL,
      supplement_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      UNIQUE (supplement_id, day)
    );
    CREATE INDEX IF NOT EXISTS idx_supp_logs_day ON supplement_logs (day);

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calorie_goal INTEGER NOT NULL DEFAULT 2000,
      protein_goal INTEGER NOT NULL DEFAULT 140,
      carb_goal INTEGER NOT NULL DEFAULT 220,
      fat_goal INTEGER NOT NULL DEFAULT 65,
      onboarded INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `,
];

/**
 * Run any pending migrations. Idempotent and safe to call on every launch:
 * it only applies steps newer than the database's recorded `user_version`.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    // Apply the migration and bump the version atomically, so a crash can't
    // leave a half-applied schema that re-runs (and fails on ALTER TABLE).
    // PRAGMA can't be parameterised, but the value is a trusted loop counter.
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
