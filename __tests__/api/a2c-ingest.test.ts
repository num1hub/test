// @vitest-environment node
import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeIntegrityHash } from '@/lib/validator/utils';

const TEST_ROOT = path.join(process.cwd(), 'data-test', 'a2c-ingest-route');
const TEST_CAPSULES_DIR = path.join(TEST_ROOT, 'capsules');
const TEST_DATA_DIR = path.join(TEST_ROOT, 'data');
const TEST_QUARANTINE_DIR = path.join(TEST_DATA_DIR, 'quarantine');

const AUTH_TOKEN = 'Bearer n1-authorized-architect-token-777';

const logActivityMock = vi.fn(async () => undefined);
const appendValidationLogMock = vi.fn(async () => undefined);

let POST: (typeof import('@/app/api/a2c/ingest/route'))['POST'];

const fixture = async (name: string) => {
  const filePath = path.join(process.cwd(), '__tests__', 'validator', 'fixtures', name);
  return JSON.parse(await fs.readFile(filePath, 'utf-8')) as Record<string, unknown>;
};

const withCapsuleId = (capsule: Record<string, unknown>, capsuleId: string) => {
  const cloned = structuredClone(capsule) as Record<string, unknown>;
  const metadata = cloned.metadata as Record<string, unknown>;
  metadata.capsule_id = capsuleId;
  metadata.name = capsuleId;
  cloned.integrity_sha3_512 = computeIntegrityHash(cloned);
  return cloned;
};

const makeRequest = (body: unknown, options: { auth?: boolean; forwardedFor?: string } = {}) =>
  new Request('http://localhost/api/a2c/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': options.forwardedFor ?? '127.0.0.1',
      ...(options.auth === false ? {} : { Authorization: AUTH_TOKEN }),
    },
    body: JSON.stringify(body),
  });

beforeEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
  await fs.mkdir(TEST_CAPSULES_DIR, { recursive: true });
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });

  logActivityMock.mockReset();
  appendValidationLogMock.mockReset();
  vi.resetModules();

  vi.doMock('@/lib/capsuleVault', () => ({
    CAPSULES_DIR: TEST_CAPSULES_DIR,
    ensureCapsulesDir: async () => {
      await fs.mkdir(TEST_CAPSULES_DIR, { recursive: true });
      return TEST_CAPSULES_DIR;
    },
    getExistingCapsuleIds: async () => new Set(['capsule.foundation.capsuleos.v1']),
  }));

  vi.doMock('@/lib/dataPath', () => ({
    DATA_DIR: TEST_DATA_DIR,
    dataPath: (...segments: string[]) => path.join(TEST_DATA_DIR, ...segments),
  }));

  vi.doMock('@/lib/activity', () => ({
    logActivity: logActivityMock,
  }));

  vi.doMock('@/lib/validationLog', () => ({
    appendValidationLog: appendValidationLogMock,
  }));

  ({ POST } = await import('@/app/api/a2c/ingest/route'));
});

afterEach(async () => {
  vi.resetModules();
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('app/api/a2c/ingest/route.ts', () => {
  it('returns 401 when the request is unauthorized', async () => {
    const response = await POST(
      makeRequest({ capsule: {} }, { auth: false, forwardedFor: '10.0.0.1' }),
    );

    expect(response.status).toBe(401);
  });

  it('stores a valid A2C capsule candidate in the vault sandbox', async () => {
    const capsule = withCapsuleId(
      await fixture('valid-capsule.json'),
      'capsule.test.a2c-store.v1',
    );

    const response = await POST(
      makeRequest({ capsule }, { forwardedFor: '10.0.0.2' }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      stored: string[];
      summary: { total: number; stored: number; quarantined: number };
    };

    expect(payload.stored).toEqual(['capsule.test.a2c-store.v1']);
    expect(payload.summary).toEqual({ total: 1, stored: 1, quarantined: 0 });

    const storedCapsule = JSON.parse(
      await fs.readFile(
        path.join(TEST_CAPSULES_DIR, 'capsule.test.a2c-store.v1.json'),
        'utf-8',
      ),
    ) as { metadata: { capsule_id: string } };

    expect(storedCapsule.metadata.capsule_id).toBe('capsule.test.a2c-store.v1');
    expect(logActivityMock).toHaveBeenCalledWith(
      'import',
      expect.objectContaining({ stored: 1, quarantined: 0 }),
    );
    expect(appendValidationLogMock).toHaveBeenCalledTimes(1);
  });

  it('autofixes an integrity-only candidate before storing it', async () => {
    const capsule = withCapsuleId(
      await fixture('valid-capsule.json'),
      'capsule.test.a2c-autofix.v1',
    );
    capsule.integrity_sha3_512 = '0'.repeat(128);

    const response = await POST(
      makeRequest({ capsule }, { forwardedFor: '10.0.0.3' }),
    );

    expect(response.status).toBe(200);

    const storedCapsule = JSON.parse(
      await fs.readFile(
        path.join(TEST_CAPSULES_DIR, 'capsule.test.a2c-autofix.v1.json'),
        'utf-8',
      ),
    ) as { integrity_sha3_512: string };

    expect(storedCapsule.integrity_sha3_512).not.toBe('0'.repeat(128));
    expect(appendValidationLogMock).toHaveBeenCalledTimes(1);
  });

  it('returns 207 and quarantines the invalid side of a mixed batch', async () => {
    const validCapsule = withCapsuleId(
      await fixture('valid-capsule.json'),
      'capsule.test.a2c-mixed-valid.v1',
    );
    const invalidCapsule = withCapsuleId(
      await fixture('valid-capsule.json'),
      'capsule.test.a2c-mixed-invalid.v1',
    );
    ((invalidCapsule.recursive_layer as { links: Array<{ target_id: string }> }).links[0]).target_id =
      'capsule.missing.target.v1';
    invalidCapsule.integrity_sha3_512 = computeIntegrityHash(invalidCapsule);

    const response = await POST(
      makeRequest(
        { capsules: [validCapsule, invalidCapsule] },
        { forwardedFor: '10.0.0.4' },
      ),
    );

    expect(response.status).toBe(207);
    const payload = (await response.json()) as {
      stored: string[];
      quarantined: Array<{ capsule_id: string | null; file: string; reason: string }>;
      summary: { total: number; stored: number; quarantined: number };
    };

    expect(payload.stored).toEqual(['capsule.test.a2c-mixed-valid.v1']);
    expect(payload.summary).toEqual({ total: 2, stored: 1, quarantined: 1 });
    expect(payload.quarantined).toHaveLength(1);
    expect(payload.quarantined[0]?.capsule_id).toBe('capsule.test.a2c-mixed-invalid.v1');

    const quarantineFiles = await fs.readdir(TEST_QUARANTINE_DIR);
    expect(quarantineFiles).toHaveLength(1);
    expect(quarantineFiles[0]).toContain('capsule.test.a2c-mixed-invalid.v1');
  });
});
