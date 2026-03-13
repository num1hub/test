import { describe, expect, it } from 'vitest';
import { getAuthToken } from '@/lib/apiSecurity';
import { getSessionFromTokenEdge } from '@/lib/apiSecurityEdge';

describe('apiSecurityEdge', () => {
  it('verifies node-issued auth tokens in the edge runtime helper', async () => {
    process.env.N1HUB_AUTH_SECRET = 'edge-auth-test-secret';

    const token = getAuthToken({
      sub: 'egor-n1',
      role: 'owner',
      factors: ['password', 'access_code'],
    });

    await expect(getSessionFromTokenEdge(token)).resolves.toMatchObject({
      sub: 'egor-n1',
      role: 'owner',
      factors: ['password', 'access_code'],
    });
  });
});
