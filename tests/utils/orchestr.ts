import { Application, ConfigServiceProvider, RouteServiceProvider, Route, Kernel, DatabaseServiceProvider, Ensemble } from '@orchestr-sh/orchestr';
import { runBootstrapMigrations } from '../../src/setup/migrate.js';

export async function bootTestApp(databaseFile: string) {
  const app = new Application(process.cwd());
  app.register(
    new ConfigServiceProvider(app, {
      database: {
        default: 'sqlite',
        connections: {
          sqlite: {
            adapter: 'drizzle',
            driver: 'sqlite',
            database: databaseFile
          }
        }
      }
    })
  );
  app.register(new RouteServiceProvider(app));
  app.register(new DatabaseServiceProvider(app));
  await app.boot();
  const db: any = app.make('db');
  await db.connection().connect();
  try {
    Ensemble.setConnectionResolver(app.make('db'));
  } catch {}
  if (databaseFile === ':memory:') {
    const adapter: any = db.connection().getAdapter();
    adapter.rawClient.exec(`
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
    adapter.rawClient.exec(`
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
  } else {
    await runBootstrapMigrations(databaseFile);
  }
  const kernel = new Kernel(app);
  return { app, kernel, Route };
}
