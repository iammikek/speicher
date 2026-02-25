import { Ensemble, DynamicRelation, HasMany } from '@orchestr-sh/orchestr';
import { Attribute } from './Attribute.js';

export class File extends Ensemble {
  protected table = 'files';
  protected fillable = [
    'external_upload_id',
    'filename',
    'content_type',
    'size_bytes',
    'checksum',
    'uploaded_at'
  ];

  constructor(attributes: Record<string, unknown> = {}, fromDatabase = false) {
    super({}, false);
    this.table = 'files';
    this.fillable = [
      'external_upload_id',
      'filename',
      'content_type',
      'size_bytes',
      'checksum',
      'uploaded_at'
    ];
    if (fromDatabase) {
      this.setRawAttributes(attributes);
    } else {
      this.fill(attributes);
    }
  }

  @DynamicRelation
  attrs(): HasMany<Attribute, File> {
    return this.hasMany(Attribute);
  }
}
