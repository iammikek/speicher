import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Kernel, Application, ConfigServiceProvider, DatabaseServiceProvider, RouteServiceProvider, Route, Ensemble } from '@orchestr-sh/orchestr';
import { FilesController } from '../src/controllers/FilesController.js';
import { rmSync } from 'node:fs';
import { getOpenApiValidator } from './utils/openapi.js';
import { runBootstrapMigrations } from '../src/setup/migrate.js';

describe('OpenAPI responses', () => {
  let app: Application;
  let kernel: Kernel;
  let server: any;
  const dbPath = './data/openapi-test.db';

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
    await runBootstrapMigrations(dbPath);

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
    rmSync(dbPath, { force: true });
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
