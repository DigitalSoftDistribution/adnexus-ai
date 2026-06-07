import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const productionFiles = [
  'src/hooks/useExport.ts',
  'src/lib/auditApi.ts',
];

describe('mock SPA client import boundary', () => {
  it('keeps sellable export and audit surfaces off the mock-heavy SPA client', () => {
    for (const file of productionFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');

      expect(source).not.toMatch(/from ['"]@\/lib\/api['"]/);
      expect(source).not.toMatch(/from ['"]\.\/api['"]/);
      expect(source).not.toMatch(/from ['"]\.\.\/src\/lib\/api['"]/);
    }
  });
});
