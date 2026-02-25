import { FilesService } from '../services/FilesService.js';

export class FilesController {
  constructor(private readonly service = new FilesService()) {}

  health = async (_req: any, res: any) => {
    return res.json({ status: 'ok' });
  };

  create = async (req: any, res: any) => {
    const body = req.body || {};
    const {
      externalUploadId,
      filename,
      contentType,
      sizeBytes,
      checksum,
      uploadedAt,
      attributes
    } = body;

    if (!externalUploadId || !filename || !contentType || !sizeBytes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const created = await this.service.createFile({
      externalUploadId,
      filename,
      contentType,
      sizeBytes,
      checksum,
      uploadedAt,
      attributes
    });
    return res.status(201).json(created);
  };

  getOne = async (req: any, res: any) => {
    const id = Number(req.params.id);
    const file = await this.service.getFileById(id);
    if (!file) return res.status(404).json({ error: 'Not found' });
    return res.json(file);
  };

  list = async (req: any, res: any) => {
    const { externalUploadId, filename, contentType } = req.query as Record<string, string | undefined>;
    const results = await this.service.listFiles({ externalUploadId, filename, contentType });
    return res.json(results);
  };

  addAttrs = async (req: any, res: any) => {
    const id = Number(req.params.id);
    const { attributes } = req.body || {};
    if (!Array.isArray(attributes) || attributes.length === 0) {
      return res.status(400).json({ error: 'attributes[] required' });
    }
    const updated = await this.service.addAttributes(id, attributes);
    if (!updated) return res.status(404).json({ error: 'File not found' });
    return res.status(201).json(updated);
  };

  listAttrs = async (req: any, res: any) => {
    const id = Number(req.params.id);
    const attrs = await this.service.listAttributes(id);
    if (!attrs) return res.status(404).json({ error: 'File not found' });
    return res.json(attrs);
  };
}
