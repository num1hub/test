import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';

const fixture = async (name: string) => {
  const filePath = path.join(process.cwd(), '__tests__/validator/fixtures', name);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
};

describe('validator: autoFixCapsule', () => {
  it('applies parity/relation/vector fixes and revalidates cleanly', async () => {
    const capsule = await fixture('fixable-capsule.json');

    const fixed = autoFixCapsule(capsule);

    expect(fixed.appliedFixes.some((fix) => fix.includes('G10'))).toBe(true);
    expect(fixed.appliedFixes.some((fix) => fix.includes('G11'))).toBe(true);
    expect(fixed.appliedFixes.some((fix) => fix.includes('G15'))).toBe(true);

    const result = await validateCapsule(fixed.fixedData, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
