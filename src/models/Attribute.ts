import { Ensemble, BelongsTo, DynamicRelation } from '@orchestr-sh/orchestr';
import { File } from './File.js';

export class Attribute extends Ensemble {
  protected table = 'attributes';
  protected fillable = ['file_id', 'key', 'value'];

  constructor(attributes: Record<string, unknown> = {}, fromDatabase = false) {
    super({}, false);
    this.table = 'attributes';
    this.fillable = ['file_id', 'key', 'value'];
    if (fromDatabase) {
      this.setRawAttributes(attributes);
    } else {
      this.fill(attributes);
    }
  }

  @DynamicRelation
  file(): BelongsTo<File, Attribute> {
    return this.belongsTo(File);
  }
}
