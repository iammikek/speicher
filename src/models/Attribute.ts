import { Ensemble, BelongsTo, DynamicRelation } from '@orchestr-sh/orchestr';
import { File } from './File.js';

export class Attribute extends Ensemble {
  protected table = 'attributes';
  protected fillable = ['file_id', 'key', 'value'];

  @DynamicRelation
  file(): BelongsTo<File, Attribute> {
    return this.belongsTo(File);
  }
}
