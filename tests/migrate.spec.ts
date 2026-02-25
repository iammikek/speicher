import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runBootstrapMigrations } from '../src/setup/migrate.js';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

describe('bootstrap migrations', () => {
  it('creates files and attributes tables', () => {
    const dbPath = join(process.cwd(), 'tmp-test.db');
    try {
      runBootstrapMigrations(dbPath);
      const db = new Database(dbPath);
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all()
        .map((r: any) => r.name);
      db.close();
      expect(tables).toContain('files');
      expect(tables).toContain('attributes');
    } finally {
      rmSync(dbPath, { force: true });
    }
  });
});
