import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { vi } from 'vitest';
import type { SovereignCapsule } from '@/types/capsule';
import { computeIntegrityHash } from '@/lib/validator/utils';

export async function createTempDataDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-diff-'));
  await fs.mkdir(path.join(dir, 'capsules'), { recursive: true });
  await fs.mkdir(path.join(dir, 'branches'), { recursive: true });
  await fs.mkdir(path.join(dir, 'versions'), { recursive: true });
  process.env.DATA_DIR = dir;
  vi.resetModules();
  return dir;
}

export async function makeValidCapsule(
  capsuleId: string,
  overrides: Partial<SovereignCapsule> = {},
): Promise<SovereignCapsule> {
  const fixturePath = path.join(
    process.cwd(),
    '__tests__',
    'validator',
    'fixtures',
    'valid-capsule.json',
  );
  const base = JSON.parse(await fs.readFile(fixturePath, 'utf-8')) as SovereignCapsule;

  const capsule: SovereignCapsule = {
    ...base,
    ...overrides,
    metadata: {
      ...base.metadata,
      ...overrides.metadata,
      capsule_id: capsuleId,
    },
    core_payload: {
      ...base.core_payload,
      ...overrides.core_payload,
    },
    neuro_concentrate: {
      ...base.neuro_concentrate,
      ...overrides.neuro_concentrate,
    },
    recursive_layer: {
      ...base.recursive_layer,
      ...overrides.recursive_layer,
    },
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}
