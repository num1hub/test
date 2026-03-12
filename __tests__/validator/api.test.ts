import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as validatePost } from '@/app/api/validate/route';
import { POST as batchPost } from '@/app/api/validate/batch/route';
import { POST as fixPost } from '@/app/api/validate/fix/route';
import { GET as gatesGet } from '@/app/api/validate/gates/route';
import { GET as statsGet } from '@/app/api/validate/stats/route';
import { readValidationLogs } from '@/lib/validationLog';
import { createAuthToken } from '@/__tests__/helpers/auth'

vi.mock('@/lib/capsuleVault', () => ({
  getExistingCapsuleIds: vi.fn(async () => new Set(['capsule.foundation.capsuleos.v1'])),
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(async () => undefined),
}));

vi.mock('@/lib/validationLog', () => ({
  appendValidationLog: vi.fn(async () => undefined),
  readValidationLogs: vi.fn(async () => []),
  buildValidationStats: vi.fn(() => ({
    total: 0,
    passed: 0,
    failed: 0,
    warned: 0,
    passRate: 1,
    recent: [],
    trend: [],
  })),
}));

const authHeader = { Authorization: `Bearer ${createAuthToken()}` };

const fixture = async (name: string) => {
  const filePath = path.join(process.cwd(), '__tests__/validator/fixtures', name);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
};

describe('validation API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/validate returns 401 without auth', async () => {
    const req = new Request('http://localhost/api/validate', {
      method: 'POST',
      body: JSON.stringify({ capsule: {} }),
    });
    const res = await validatePost(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/validate validates a capsule', async () => {
    const capsule = await fixture('valid-capsule.json');
    const req = new Request('http://localhost/api/validate', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ capsule }),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it('POST /api/validate/batch blocks non-owner role', async () => {
    const capsule = await fixture('valid-capsule.json');
    const req = new Request('http://localhost/api/validate/batch', {
      method: 'POST',
      headers: {
        ...authHeader,
        'x-n1-role': 'viewer',
      },
      body: JSON.stringify({ capsules: [capsule] }),
    });

    const res = await batchPost(req);
    expect(res.status).toBe(403);
  });

  it('POST /api/validate/batch validates many capsules for owner role', async () => {
    const capsule = await fixture('valid-capsule.json');
    const req = new Request('http://localhost/api/validate/batch', {
      method: 'POST',
      headers: {
        ...authHeader,
        'x-n1-role': 'owner',
      },
      body: JSON.stringify({ capsules: [capsule, capsule] }),
    });

    const res = await batchPost(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      summary: { total: number; valid: number };
      results: Array<{ valid: boolean }>;
    };
    expect(body.summary.total).toBe(2);
    expect(body.summary.valid).toBe(2);
    expect(body.results).toHaveLength(2);
    expect(body.results.every((result) => result.valid)).toBe(true);
  });

  it('POST /api/validate/fix blocks non-owner role', async () => {
    const capsule = await fixture('valid-capsule.json');
    const req = new Request('http://localhost/api/validate/fix', {
      method: 'POST',
      headers: {
        ...authHeader,
        'x-n1-role': 'viewer',
      },
      body: JSON.stringify({ capsule }),
    });

    const res = await fixPost(req);
    expect(res.status).toBe(403);
  });

  it('POST /api/validate/fix returns the fixed payload contract for owner role', async () => {
    const capsule = await fixture('valid-capsule.json');
    const req = new Request('http://localhost/api/validate/fix', {
      method: 'POST',
      headers: {
        ...authHeader,
        'x-n1-role': 'owner',
      },
      body: JSON.stringify({ capsule }),
    });

    const res = await fixPost(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      valid: boolean;
      fixedCapsule: { metadata: { capsule_id: string } };
      appliedFixes: string[];
    };
    expect(body.valid).toBe(true);
    expect(body.fixedCapsule.metadata.capsule_id).toBe('capsule.test.valid.v1');
    expect(Array.isArray(body.appliedFixes)).toBe(true);
  });

  it('GET /api/validate/gates returns gate metadata', async () => {
    const req = new Request('http://localhost/api/validate/gates', { headers: authHeader });
    const res = await gatesGet(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { gates: Array<{ id: string }> };
    expect(body.gates).toHaveLength(16);
    expect(body.gates[0].id).toBe('G01');
  });

  it('GET /api/validate/stats returns stats payload', async () => {
    const req = new Request('http://localhost/api/validate/stats', { headers: authHeader });
    const res = await statsGet(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(0);
  });

  it('GET /api/validate/stats forwards the limit query parameter to the log reader', async () => {
    const req = new Request('http://localhost/api/validate/stats?limit=25', { headers: authHeader });
    const res = await statsGet(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(readValidationLogs)).toHaveBeenCalledWith(25);
  });
});
