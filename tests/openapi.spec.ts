import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Kernel, Application, ConfigServiceProvider, DatabaseServiceProvider, RouteServiceProvider, Route, Ensemble } from '@orchestr-sh/orchestr';
import { FilesController } from '../src/controllers/FilesController.js';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { getOpenApiValidator } from './utils/openapi.js';
import { runBootstrapMigrations } from '../src/setup/migrate.js';

describe('OpenAPI responses', () => {
  let app: Application;
  let kernel: Kernel;
  let server: any;
  const dbPath = ':memory:';

  beforeAll(async () => {
    app = new Application(process.cwd());
    app.register(
      new ConfigServiceProvider(app, {
        database: {
          default: 'sqlite',
          connections: {
            sqlite: { adapter: 'drizzle', driver: 'sqlite', database: dbPath }
          }
        }
      })
    );
    app.register(new DatabaseServiceProvider(app));
    app.register(new RouteServiceProvider(app));
    await app.boot();
    const db: any = app.make('db');
    await db.connection().connect();
    try {
      Ensemble.setConnectionResolver(app.make('db'));
    } catch {}
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

    const kernelLocal = new Kernel(app);
    const files = new FilesController();
    Route.get('/health', files.health);
    Route.post('/files', files.create);
    Route.get('/files/:id', files.getOne);
    Route.get('/files', files.list);
    Route.post('/files/:id/attributes', files.addAttrs);
    Route.get('/files/:id/attributes', files.listAttrs);
    server = kernelLocal.listen(0);
    kernel = kernelLocal;
  });

  afterAll(async () => {
    try {
      await kernel.close();
    } catch {}
    // no file cleanup needed for ':memory:'
  });

  it('health 200 conforms to spec', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    const validator = getOpenApiValidator().validateResponse('get', '/health');
    expect(validator(res)).toBeUndefined();
  });

  it('create file 201 conforms to spec', async () => {
    const res = await request(server).post('/files').send({
      externalUploadId: 'upl_api',
      filename: 'api.txt',
      contentType: 'text/plain',
      sizeBytes: 10,
      attributes: [{ key: 'a', value: 'b' }]
    });
    expect(res.status).toBe(201);
    const validator = getOpenApiValidator().validateResponse('post', '/files');
    expect(validator(res)).toBeUndefined();
  });

  it('list files 200 conforms to spec', async () => {
    const res = await request(server).get('/files?page=1&perPage=10');
    expect(res.status).toBe(200);
    const validator = getOpenApiValidator().validateResponse('get', '/files');
    expect(validator(res)).toBeUndefined();
  });

  it('get file 200 conforms to spec', async () => {
    const created = await request(server).post('/files').send({
      externalUploadId: 'upl_api2',
      filename: 'api2.txt',
      contentType: 'text/plain',
      sizeBytes: 12
    });
    const id = created.body.id;
    const res = await request(server).get(`/files/${id}`);
    expect(res.status).toBe(200);
    const validator = getOpenApiValidator().validateResponse('get', '/files/{id}');
    expect(validator(res)).toBeUndefined();
  });

  it('add attributes 201 conforms to spec', async () => {
    const created = await request(server).post('/files').send({
      externalUploadId: 'upl_api3',
      filename: 'api3.txt',
      contentType: 'text/plain',
      sizeBytes: 13
    });
    const id = created.body.id;
    const res = await request(server).post(`/files/${id}/attributes`).send({ attributes: [{ key: 'k' }] });
    expect(res.status).toBe(201);
    const validator = getOpenApiValidator().validateResponse('post', '/files/{id}/attributes');
    expect(validator(res)).toBeUndefined();
  });

  it('list attributes 200 conforms to spec', async () => {
    const created = await request(server).post('/files').send({
      externalUploadId: 'upl_api4',
      filename: 'api4.txt',
      contentType: 'text/plain',
      sizeBytes: 14
    });
    const id = created.body.id;
    await request(server).post(`/files/${id}/attributes`).send({ attributes: [{ key: 'k2', value: 'v2' }] });
    const res = await request(server).get(`/files/${id}/attributes`);
    expect(res.status).toBe(200);
    const validator = getOpenApiValidator().validateResponse('get', '/files/{id}/attributes');
    expect(validator(res)).toBeUndefined();
  });
});
