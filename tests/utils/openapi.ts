import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { OpenApiValidator } from 'express-openapi-validate';

let validatorCache: OpenApiValidator | null = null;

export function getOpenApiValidator(): OpenApiValidator {
  if (!validatorCache) {
    const p = resolve(process.cwd(), 'openapi/openapi.yaml');
    const raw = readFileSync(p, 'utf-8');
    const doc = YAML.parse(raw);
    validatorCache = new OpenApiValidator(doc);
  }
  return validatorCache!;
}
