import { afterEach, describe, expect, it } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  getAuthToken,
  getTrustedMutationError,
  resolveRole,
} from '@/lib/apiSecurity';

const originalEnv = process.env;

describe('apiSecurity mutation trust', () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects cookie-backed mutation requests without a trusted origin', () => {
    const token = getAuthToken({ sub: 'egor-n1', role: 'owner' });
    const request = new Request('http://localhost/api/capsules', {
      method: 'POST',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });

    expect(getTrustedMutationError(request)).toBe('Forbidden: cross-site mutation request rejected.');
  });

  it('allows cookie-backed mutation requests when origin matches request host', () => {
    const token = getAuthToken({ sub: 'egor-n1', role: 'owner' });
    const request = new Request('http://localhost/api/capsules', {
      method: 'POST',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
        origin: 'http://localhost',
      },
    });

    expect(getTrustedMutationError(request)).toBeNull();
  });

  it('allows bearer-backed mutation requests without origin checks', () => {
    const token = getAuthToken({ sub: 'egor-n1', role: 'owner' });
    const request = new Request('http://localhost/api/capsules', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(getTrustedMutationError(request)).toBeNull();
  });

  it('ignores x-n1-role overrides outside test mode', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_AUTH_SECRET: 'security-test-secret',
    };

    const token = getAuthToken({ sub: 'egor-n1', role: 'owner' });
    const request = new Request('http://localhost/api/validate/fix', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-n1-role': 'viewer',
      },
    });

    expect(resolveRole(request)).toBe('owner');
  });
});
