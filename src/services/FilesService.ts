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
    const created = await File.create({
      external_upload_id: input.externalUploadId,
      filename: input.filename,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      checksum: input.checksum ?? null,
      uploaded_at: input.uploadedAt ?? new Date().toISOString()
    });

    if (Array.isArray(input.attributes) && input.attributes.length > 0) {
      for (const attr of input.attributes) {
        if (attr?.key) {
          await Attribute.create({
            file_id: created.getAttribute('id'),
            key: attr.key,
            value: String(attr.value ?? '')
          });
        }
      }
    }

    const withAttrs = await File.query()
      .with('attrs')
      .where('id', created.getAttribute('id'))
      .first();
    return withAttrs?.toJSON();
  }

  async getFileById(id: number) {
    const file = await File.query().with('attrs').where('id', id).first();
    return file ? file.toJSON() : null;
  }

  async listFiles(filters: { externalUploadId?: string; filename?: string; contentType?: string }) {
    let query = File.query().with('attrs');
    if (filters.externalUploadId) query = query.where('external_upload_id', filters.externalUploadId);
    if (filters.filename) query = query.where('filename', filters.filename);
    if (filters.contentType) query = query.where('content_type', filters.contentType);
    const results = await query.get();
    return results.map((r: any) => r.toJSON());
  }

  async addAttributes(fileId: number, attributes: Array<{ key: string; value?: unknown }>) {
    const file = await File.find(fileId);
    if (!file) return null;
    for (const attr of attributes) {
      if (attr?.key) {
        await Attribute.create({
          file_id: fileId,
          key: attr.key,
          value: String(attr.value ?? '')
        });
      }
    }
    const withAttrs = await File.query().with('attrs').where('id', fileId).first();
    return withAttrs?.toJSON();
  }

  async listAttributes(fileId: number) {
    const file = await File.find(fileId);
    if (!file) return null;
    const attrs = await Attribute.query().where('file_id', fileId).get();
    return attrs.map((a: any) => a.toJSON());
  }
}
