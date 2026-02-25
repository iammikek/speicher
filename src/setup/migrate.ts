import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

export function runBootstrapMigrations(databaseFile: string) {
  try {
    mkdirSync(dirname(databaseFile), { recursive: true });
  } catch {}
  const db = new Database(databaseFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_upload_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      checksum TEXT NULL,
      uploaded_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attributes_file_id ON attributes(file_id);
    CREATE INDEX IF NOT EXISTS idx_attributes_key ON attributes(key);
  `);
  db.close();
}
