import 'reflect-metadata';
import { Application, Kernel, ConfigServiceProvider, Route, RouteServiceProvider, DatabaseServiceProvider, Ensemble } from '@orchestr-sh/orchestr';
import { FilesController } from './controllers/FilesController.js';
import { runBootstrapMigrations } from './setup/migrate.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { OpenApiValidator } from 'express-openapi-validate';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_FILE = process.env.DATABASE_FILE || './data/database.db';

async function bootstrap() {
  const app = new Application(process.cwd());

  app.register(
    new ConfigServiceProvider(app, {
      database: {
        default: 'sqlite',
        connections: {
          sqlite: {
            adapter: 'drizzle',
            driver: 'sqlite',
            database: DATABASE_FILE
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

  await runBootstrapMigrations(DATABASE_FILE);

  const kernel = new Kernel(app);
  const files = new FilesController();
  const specPath = resolve(process.cwd(), 'openapi/openapi.yaml');
  const specDoc = YAML.parse(readFileSync(specPath, 'utf-8'));
  const validator = new OpenApiValidator(specDoc);
  Route.group({ middleware: validator.match() }, () => {
    Route.get('/health', files.health);
    Route.post('/files', files.create);
    Route.get('/files/:id', files.getOne);
    Route.get('/files', files.list);
    Route.post('/files/:id/attributes', files.addAttrs);
    Route.get('/files/:id/attributes', files.listAttrs);
  });

  kernel.listen(PORT, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
