import crypto from 'node:crypto';

type SessionRole = 'owner' | 'editor' | 'viewer';

const DEV_AUTH_SECRET = 'n1hub-local-dev-auth-secret';

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getAuthSecret() {
  const configuredSecret =
    process.env.N1HUB_AUTH_SECRET?.trim() || process.env.N1HUB_AUTH_TOKEN?.trim();
  if (configuredSecret) return configuredSecret;
  return DEV_AUTH_SECRET;
}

export function createAuthToken(role: SessionRole = 'owner') {
  const issuedAt = Date.now();
  const payload = {
    sub: 'test-architect',
    role,
    factors: ['password', 'access_code'],
    issuedAt,
    expiresAt: issuedAt + 7 * 24 * 60 * 60 * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', getAuthSecret()).update(encodedPayload).digest(),
  );
  return `${encodedPayload}.${signature}`;
}

export function makeAuthHeaders(role: SessionRole = 'owner') {
  return {
    Authorization: `Bearer ${createAuthToken(role)}`,
  };
}
