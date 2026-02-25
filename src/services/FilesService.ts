import { File } from '../models/File.js';
import { Attribute } from '../models/Attribute.js';

export type CreateFileInput = {
  externalUploadId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string | null;
  uploadedAt?: string;
  attributes?: Array<{ key: string; value?: unknown }>;
};

export class FilesService {
  async createFile(input: CreateFileInput) {
    const conn = new File().getConnection();
    const now = new Date().toISOString();
    const id = await conn
      .table('files')
      .insertGetId({
        external_upload_id: input.externalUploadId,
        filename: input.filename,
        content_type: input.contentType,
        size_bytes: input.sizeBytes,
        checksum: input.checksum ?? null,
        uploaded_at: input.uploadedAt ?? now,
        created_at: now,
        updated_at: now
      });
    if (Array.isArray(input.attributes) && input.attributes.length > 0) {
      for (const attr of input.attributes) {
        if (attr?.key) {
          await conn.table('attributes').insert({
            file_id: id,
            key: attr.key,
            value: String(attr.value ?? ''),
            created_at: now,
            updated_at: now
          });
        }
      }
    }
    const file = await conn.table('files').find(id);
    const attrs = await conn.table('attributes').where('file_id', '=', id).get();
    return { ...file, attributes: attrs };
  }

  async getFileById(id: number) {
    const conn = new File().getConnection();
    const file = await conn.table('files').find(id);
    if (!file) return null;
    const attrs = await conn.table('attributes').where('file_id', '=', id).get();
    return { ...file, attributes: attrs };
  }

  async listFiles(
    filters: { externalUploadId?: string; filename?: string; contentType?: string },
    pagination?: { page: number; perPage: number }
  ) {
    const conn = new File().getConnection();
    let qb = conn.table('files');
    if (filters.externalUploadId) qb = qb.where('external_upload_id', '=', filters.externalUploadId);
    if (filters.filename) qb = qb.where('filename', '=', filters.filename);
    if (filters.contentType) qb = qb.where('content_type', '=', filters.contentType);
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.perPage;
      qb = qb.limit(pagination.perPage).offset(offset);
    }
    const rows = await qb.get();
    const results = [];
    for (const row of rows) {
      const attrs = await conn.table('attributes').where('file_id', '=', row.id).get();
      results.push({ ...row, attributes: attrs });
    }
    return results;
  }

  async addAttributes(fileId: number, attributes: Array<{ key: string; value?: unknown }>) {
    const conn = new File().getConnection();
    const file = await conn.table('files').find(fileId);
    if (!file) return null;
    const now = new Date().toISOString();
    for (const attr of attributes) {
      if (attr?.key) {
        await conn.table('attributes').insert({
          file_id: fileId,
          key: attr.key,
          value: String(attr.value ?? ''),
          created_at: now,
          updated_at: now
        });
      }
    }
    const updated = await conn.table('files').find(fileId);
    const attrs = await conn.table('attributes').where('file_id', '=', fileId).get();
    return { ...updated, attributes: attrs };
  }

  async listAttributes(fileId: number) {
    const conn = new File().getConnection();
    const file = await conn.table('files').find(fileId);
    if (!file) return null;
    const attrs = await conn.table('attributes').where('file_id', '=', fileId).get();
    return attrs;
  }
}
