import type { AuthSession } from '@/lib/apiSecurityShared';
import { isSessionShape } from '@/lib/apiSecurityShared';

const DEV_AUTH_SECRET = 'n1hub-local-dev-auth-secret';

function getAuthSecret() {
  const configuredSecret =
    process.env.N1HUB_AUTH_SECRET?.trim() || process.env.N1HUB_AUTH_TOKEN?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('N1HUB_AUTH_SECRET must be configured in production.');
  }

  return DEV_AUTH_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = atob(`${normalized}${padding}`);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

async function signTokenPayload(payload: string) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto is unavailable in the current runtime.');
  }

  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function getSessionFromTokenEdge(
  token: string | null | undefined,
): Promise<AuthSession | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  if ((await signTokenPayload(encodedPayload)) !== signature) return null;

  try {
    const payload = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const parsed = JSON.parse(payload) as unknown;
    if (!isSessionShape(parsed)) return null;
    if (parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
