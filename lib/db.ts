import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS example (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sample (
      SampleID        INTEGER PRIMARY KEY AUTOINCREMENT,
      SampleText      TEXT    NOT NULL,
      CreatedBy       TEXT    NOT NULL,
      CreatedDate     TEXT    NOT NULL DEFAULT (datetime('now')),
      LastUpdatedBy   TEXT    NOT NULL,
      LastUpdatedDate TEXT    NOT NULL DEFAULT (datetime('now')),
      Active          INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
    );
  `);
}
