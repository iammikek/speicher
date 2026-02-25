import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { bootTestApp } from './utils/orchestr.js';
import { File } from '../src/models/File.js';
import { Attribute } from '../src/models/Attribute.js';

const dbPath = ':memory:';
let kernel: any;

describe('Models relations', () => {
  beforeAll(async () => {
    const boot = await bootTestApp(dbPath);
    kernel = boot.kernel;
  });

  afterAll(async () => {
    await kernel.close();
    if (dbPath !== ':memory:') rmSync(dbPath, { force: true });
  });

  it('dynamic relation returns attributes', async () => {
    const f = await File.create({
      external_upload_id: 'upl_rel',
      filename: 'rel.png',
      content_type: 'image/png',
      size_bytes: 10,
      uploaded_at: new Date().toISOString()
    });
    await Attribute.create({ file_id: f.getAttribute('id'), key: 'k1', value: 'v1' });
    await Attribute.create({ file_id: f.getAttribute('id'), key: 'k2', value: 'v2' });

    const relQuery = (f as any).attrs();
    const relResults = await relQuery.get();
    expect(relResults.length).toBe(2);
  });
});
