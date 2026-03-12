import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/deploy/smoke/route';

describe('GET /api/deploy/smoke', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 200 with ok=true outside production', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
    };
    delete process.env.N1HUB_AUTH_SECRET;
    delete process.env.N1HUB_OWNER_LOGIN;
    delete process.env.VAULT_PASSWORD;
    delete process.env.N1HUB_ACCESS_CODE;
    delete process.env.N1HUB_OWNER_ROUTE_SEGMENT;

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toMatchObject({
      ok: true,
      mode: 'development',
      lockedRootPath: '/',
      ownerRouteBasePath: '/architect-gate/<hidden>',
    });
  });

  it('returns 503 with missing env in production when deploy auth is incomplete', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_OWNER_ROUTE_SEGMENT: 'vault-door-4431',
    };
    delete process.env.N1HUB_AUTH_SECRET;
    delete process.env.VAULT_PASSWORD;
    delete process.env.N1HUB_ACCESS_CODE;

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.missingEnv).toEqual([
      'N1HUB_AUTH_SECRET',
      'VAULT_PASSWORD',
      'N1HUB_ACCESS_CODE',
    ]);
  });
});
