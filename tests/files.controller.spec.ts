import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { rmSync } from 'node:fs';
import { bootTestApp } from './utils/orchestr.js';
import { FilesController } from '../src/controllers/FilesController.js';

const dbPath = ':memory:';
let kernel: any;
let server: any;
let Route: any;

describe('FilesController routes', () => {
  beforeAll(async () => {
    const boot = await bootTestApp(dbPath);
    kernel = boot.kernel;
    Route = boot.Route;
    const ctrl = new FilesController();
    Route.get('/health', ctrl.health);
    Route.post('/files', ctrl.create);
    Route.get('/files/:id', ctrl.getOne);
    Route.get('/files', ctrl.list);
    Route.post('/files/:id/attributes', ctrl.addAttrs);
    Route.get('/files/:id/attributes', ctrl.listAttrs);
    server = kernel.listen(0, 'localhost');
  });

  afterAll(async () => {
    try {
      await kernel.close();
    } catch {}
    if (dbPath !== ':memory:') rmSync(dbPath, { force: true });
  });

  it('health responds ok', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('creates and fetches a file', async () => {
    const createRes = await request(server)
      .post('/files')
      .send({
        externalUploadId: 'upl_http',
        filename: 'file.bin',
        contentType: 'application/octet-stream',
        sizeBytes: 5,
        attributes: [{ key: 'category', value: 'bin' }]
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;
    const fetchRes = await request(server).get(`/files/${id}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.id).toBe(id);
    expect(fetchRes.body.attributes?.length ?? 0).toBe(1);
  });

  it('rejects missing required fields', async () => {
    const res = await request(server)
      .post('/files')
      .send({ filename: 'x', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects invalid attributes payload', async () => {
    const createRes = await request(server)
      .post('/files')
      .send({
        externalUploadId: 'upl_bad',
        filename: 'bad.txt',
        contentType: 'text/plain',
        sizeBytes: 1,
        attributes: [{}]
      });
    expect(createRes.status).toBe(400);
  });

  it('lists and adds attributes', async () => {
    const createRes = await request(server)
      .post('/files')
      .send({
        externalUploadId: 'upl_list',
        filename: 'list.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 20
      });
    const id = createRes.body.id;
    const addRes = await request(server)
      .post(`/files/${id}/attributes`)
      .send({ attributes: [{ key: 'quality', value: 'high' }] });
    expect(addRes.status).toBe(201);
    const listRes = await request(server).get(`/files/${id}/attributes`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it('supports pagination and rejects invalid params', async () => {
    const resBad1 = await request(server).get('/files?page=0');
    expect(resBad1.status).toBe(400);
    const resBad2 = await request(server).get('/files?perPage=0');
    expect(resBad2.status).toBe(400);
    const resBad3 = await request(server).get('/files?perPage=1000');
    expect(resBad3.status).toBe(400);

    // Seed a couple files
    await request(server).post('/files').send({
      externalUploadId: 'upl_p1',
      filename: 'p1.txt',
      contentType: 'text/plain',
      sizeBytes: 1
    });
    await request(server).post('/files').send({
      externalUploadId: 'upl_p2',
      filename: 'p2.txt',
      contentType: 'text/plain',
      sizeBytes: 2
    });
    const resPage = await request(server).get('/files?page=1&perPage=1');
    expect(resPage.status).toBe(200);
    expect(Array.isArray(resPage.body)).toBe(true);
    expect(resPage.body.length).toBe(1);
  });

  it('404 on non-existent file', async () => {
    const res = await request(server).get('/files/999999');
    expect(res.status).toBe(404);
  });

  it('400 on invalid id path', async () => {
    const res = await request(server).get('/files/abc');
    expect(res.status).toBe(400);
  });

  it('attributes endpoint 404 for non-existent file', async () => {
    const res = await request(server).post('/files/999999/attributes').send({ attributes: [{ key: 'k' }] });
    expect(res.status).toBe(404);
  });

  it('attributes endpoint 400 for invalid payload', async () => {
    const createRes = await request(server)
      .post('/files')
      .send({
        externalUploadId: 'upl_bad2',
        filename: 'bad2.txt',
        contentType: 'text/plain',
        sizeBytes: 1
      });
    const id = createRes.body.id;
    const res1 = await request(server).post(`/files/${id}/attributes`).send({});
    expect(res1.status).toBe(400);
    const res2 = await request(server).post(`/files/${id}/attributes`).send({ attributes: [{}] });
    expect(res2.status).toBe(400);
  });
});
