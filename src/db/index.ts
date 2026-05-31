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
 * Create tables if they don't exist yet. Idempotent, so it's safe to call on
 * every launch. Bumps `user_version` so future schema changes can branch off
 * the current migration level.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

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
  `);

  await db.execAsync('PRAGMA user_version = 1');
}
