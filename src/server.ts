import 'reflect-metadata';
import { Application, Kernel, ConfigServiceProvider, Route, RouteServiceProvider } from '@orchestr-sh/orchestr';
import { FilesController } from './controllers/FilesController.js';
import { runBootstrapMigrations } from './setup/migrate.js';

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

  await app.boot();

  await runBootstrapMigrations(DATABASE_FILE);

  const kernel = new Kernel(app);
  const files = new FilesController();
  Route.get('/health', files.health);

  Route.post('/files', files.create);

  Route.get('/files/:id', files.getOne);

  Route.get('/files', files.list);

  Route.post('/files/:id/attributes', files.addAttrs);

  Route.get('/files/:id/attributes', files.listAttrs);

  kernel.listen(PORT, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
