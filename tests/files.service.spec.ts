import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { bootTestApp } from './utils/orchestr.js';
import { FilesService } from '../src/services/FilesService.js';

const dbPath = ':memory:';
let kernel: any;

describe('FilesService', () => {
  beforeAll(async () => {
    const boot = await bootTestApp(dbPath);
    kernel = boot.kernel;
  });

  afterAll(async () => {
    await kernel.close();
    if (dbPath !== ':memory:') rmSync(dbPath, { force: true });
  });

  it('creates file with attributes and retrieves it', async () => {
    const service = new FilesService();
    const created = await service.createFile({
      externalUploadId: 'upl_abc',
      filename: 'doc.txt',
      contentType: 'text/plain',
      sizeBytes: 42,
      attributes: [{ key: 'lang', value: 'en' }]
    });
    expect(created).toBeTruthy();
    expect(created!.id).toBeGreaterThan(0);
    expect(created!.attributes?.length ?? 0).toBe(1);

    const fetched = await service.getFileById(created!.id);
    expect(fetched).toBeTruthy();
    expect(fetched!.filename).toBe('doc.txt');
  });

  it('lists files with filters', async () => {
    const service = new FilesService();
    await service.createFile({
      externalUploadId: 'upl_xyz',
      filename: 'image.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100
    });
    const byUpload = await service.listFiles({ externalUploadId: 'upl_xyz' });
    expect(byUpload.length).toBeGreaterThan(0);
    const byType = await service.listFiles({ contentType: 'image/jpeg' });
    expect(byType.length).toBeGreaterThan(0);
  });

  it('adds and lists attributes for a file', async () => {
    const service = new FilesService();
    const created = await service.createFile({
      externalUploadId: 'upl_attr',
      filename: 'a.bin',
      contentType: 'application/octet-stream',
      sizeBytes: 1
    });
    const updated = await service.addAttributes(created!.id, [
      { key: 'tag', value: 'alpha' },
      { key: 'env', value: 'test' }
    ]);
    expect(updated).toBeTruthy();
    const attrs = await service.listAttributes(created!.id);
    expect(attrs!.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for non-existent file id on service methods', async () => {
    const service = new FilesService();
    const none1 = await service.getFileById(999999);
    expect(none1).toBeNull();
    const none2 = await service.addAttributes(999999, [{ key: 'x' }]);
    expect(none2).toBeNull();
    const none3 = await service.listAttributes(999999);
    expect(none3).toBeNull();
  });
});
