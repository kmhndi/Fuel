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
  // 2 -> 3: water, weight, and exercise tracking; meal notes; and the extra
  // settings needed for the TDEE calculator, water goal, and unit prefs.
  `
    ALTER TABLE meals ADD COLUMN note TEXT;

    CREATE TABLE IF NOT EXISTS water (
      day TEXT PRIMARY KEY NOT NULL,
      glasses INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY NOT NULL,
      kg REAL NOT NULL,
      logged_at TEXT NOT NULL,
      day TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_weights_day ON weights (day);

    CREATE TABLE IF NOT EXISTS exercise (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      day TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exercise_day ON exercise (day);

    ALTER TABLE settings ADD COLUMN water_goal INTEGER NOT NULL DEFAULT 8;
    ALTER TABLE settings ADD COLUMN glass_ml INTEGER NOT NULL DEFAULT 250;
    ALTER TABLE settings ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg';
    ALTER TABLE settings ADD COLUMN sex TEXT;
    ALTER TABLE settings ADD COLUMN age INTEGER;
    ALTER TABLE settings ADD COLUMN height_cm REAL;
    ALTER TABLE settings ADD COLUMN activity REAL NOT NULL DEFAULT 1.2;
  `,
  // 3 -> 4: extra nutrition fields & tags, caffeine, daily check-ins, body
  // measurements, custom quick-add presets, and assorted settings for goal
  // weight, caffeine limit, theme/accent, water reminders and weekday goals.
  `
    ALTER TABLE meals ADD COLUMN fiber REAL NOT NULL DEFAULT 0;
    ALTER TABLE meals ADD COLUMN sugar REAL NOT NULL DEFAULT 0;
    ALTER TABLE meals ADD COLUMN tag TEXT;

    CREATE TABLE IF NOT EXISTS caffeine (
      day TEXT PRIMARY KEY NOT NULL,
      mg INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS checkins (
      day TEXT PRIMARY KEY NOT NULL,
      mood INTEGER,
      energy INTEGER,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS measurements (
      day TEXT PRIMARY KEY NOT NULL,
      waist_cm REAL,
      body_fat REAL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0
    );

    ALTER TABLE settings ADD COLUMN goal_weight_kg REAL;
    ALTER TABLE settings ADD COLUMN caffeine_limit INTEGER NOT NULL DEFAULT 400;
    ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
    ALTER TABLE settings ADD COLUMN accent TEXT NOT NULL DEFAULT '#22D3A7';
    ALTER TABLE settings ADD COLUMN water_reminders INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE settings ADD COLUMN weekday_goals TEXT;
  `,
  // 4 -> 5: supplement inventory (doses left + refill threshold).
  `
    ALTER TABLE supplements ADD COLUMN stock INTEGER;
    ALTER TABLE supplements ADD COLUMN refill_at INTEGER NOT NULL DEFAULT 0;
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
