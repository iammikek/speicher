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
  await runBootstrapMigrations(databaseFile);
  const kernel = new Kernel(app);
  return { app, kernel, Route };
}
