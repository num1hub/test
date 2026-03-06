import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createCapsuleValidator, validateCapsule } from '@/lib/validator';

const fixture = async (name: string) => {
  const filePath = path.join(process.cwd(), '__tests__/validator/fixtures', name);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
};

describe('validator: validateCapsule', () => {
  const getValidFixture = async () => fixture('valid-capsule.json');

  it('passes a valid fixture capsule', async () => {
    const capsule = await getValidFixture();

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails G01 for malformed root structure', async () => {
    const capsule = await fixture('invalid-g01.json');
    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.gate === 'G01')).toBe(true);
  });

  it('fails G16 for integrity mismatch', async () => {
    const capsule = await fixture('invalid-g16.json');
    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.gate === 'G16')).toBe(true);
  });

  it('allows draft capsules without links (G13 exemption)', async () => {
    const capsule = await fixture('edge-case-draft.json');
    const result = await validateCapsule(capsule, {
      existingIds: new Set(),
    });

    expect(result.errors.some((issue) => issue.gate === 'G13')).toBe(false);
  });

  it('allows sovereign foundation long payload with zero contradiction pressure (G14 exemption)', async () => {
    const capsule = await fixture('edge-case-sovereign-foundation.json');

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
      customTokenLimit: 1000,
    });

    expect(result.errors.some((issue) => issue.gate === 'G14')).toBe(false);
  });

  it('warns when G12 cannot be checked without resolver IDs', async () => {
    const capsule = await getValidFixture();
    const result = await validateCapsule(capsule);

    expect(result.warnings.some((issue) => issue.gate === 'G12')).toBe(true);
  });

  it('fails G12 for missing target references when existing IDs are provided', async () => {
    const capsule = await getValidFixture();

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.some.other.id']),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.gate === 'G12')).toBe(true);
  });

  it('fails G04 for low provenance coverage without source uri', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const neuro = capsule.neuro_concentrate as Record<string, unknown>;
    const metadata = capsule.metadata as Record<string, unknown>;
    neuro.confidence_vector = {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 0.6,
      validation_score: 1,
      contradiction_pressure: 0.1,
    };
    metadata.source = undefined;

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G04')).toBe(true);
  });

  it('warns G05 for non-standard content_type', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const payload = capsule.core_payload as Record<string, unknown>;
    payload.content_type = 'html';

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.warnings.some((issue) => issue.gate === 'G05')).toBe(true);
  });

  it('fails G06 when truncation_note is not a string', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const payload = capsule.core_payload as Record<string, unknown>;
    payload.truncation_note = 42;

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G06')).toBe(true);
  });

  it('fails G08 for keyword count outside limits', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const neuro = capsule.neuro_concentrate as Record<string, unknown>;
    neuro.keywords = ['only', 'four', 'keywords', 'here'];

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G08')).toBe(true);
  });

  it('fails G09 for malformed semantic hash format', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const metadata = capsule.metadata as Record<string, unknown>;
    metadata.semantic_hash = 'INVALID-HASH';

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G09')).toBe(true);
  });

  it('fails G10 when metadata and neuro semantic hashes diverge', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const neuro = capsule.neuro_concentrate as Record<string, unknown>;
    neuro.semantic_hash = 'different-hash-token-a-b-c-d-e-f';

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G10')).toBe(true);
  });

  it('flags G11 non-canonical links and warns on refutes', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const recursive = capsule.recursive_layer as Record<string, unknown>;
    recursive.links = [
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'invalid_link' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'refutes' },
    ];

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G11')).toBe(true);
    expect(result.warnings.some((issue) => issue.gate === 'G11')).toBe(true);
  });

  it('fails G13 when non-draft capsule has no links', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const recursive = capsule.recursive_layer as Record<string, unknown>;
    recursive.links = [];

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G13')).toBe(true);
  });

  it('fails G14 when long payload has zero contradiction pressure and no exemption', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const payload = capsule.core_payload as Record<string, unknown>;
    const neuro = capsule.neuro_concentrate as Record<string, unknown>;
    payload.content = Array.from({ length: 1200 }, (_, index) => `token${index}`).join(' ');
    neuro.confidence_vector = {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0,
    };

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
      customTokenLimit: 1000,
    });

    expect(result.errors.some((issue) => issue.gate === 'G14')).toBe(true);
  });

  it('fails G15 when confidence vector values are out of bounds', async () => {
    const capsule = (await getValidFixture()) as Record<string, unknown>;
    const neuro = capsule.neuro_concentrate as Record<string, unknown>;
    neuro.confidence_vector = {
      extraction: 1.2,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.2,
    };

    const result = await validateCapsule(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.errors.some((issue) => issue.gate === 'G15')).toBe(true);
  });

  it('supports plugin-based custom validation gates', async () => {
    const capsule = await getValidFixture();
    const validator = createCapsuleValidator();
    validator.registerPlugin({
      id: 'test-plugin',
      validate: () => ({
        warnings: [{ gate: 'PLUGIN', path: '$', message: 'plugin warning' }],
      }),
    });

    const result = await validator.validate(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(result.warnings.some((issue) => issue.gate === 'PLUGIN')).toBe(true);
  });

  it('returns cacheHit on repeated validation calls', async () => {
    const capsule = await getValidFixture();
    const validator = createCapsuleValidator();

    await validator.validate(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });
    const second = await validator.validate(capsule, {
      existingIds: new Set(['capsule.foundation.capsuleos.v1']),
    });

    expect(second.cacheHit).toBe(true);
  });
});
