import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  AUTH_COOKIE_NAME,
  isSessionShape,
  type AuthFactor,
  type AuthSession,
  type SessionRole,
} from '@/lib/apiSecurityShared';

type RateLimitBucket = { count: number; windowStart: number };

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_AUTH_SECRET = 'n1hub-local-dev-auth-secret';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4 || 4)) % 4;
  return Buffer.from(`${normalized}${'='.repeat(padding)}`, 'base64');
}

function getAuthSecret() {
  const configuredSecret =
    process.env.N1HUB_AUTH_SECRET?.trim() || process.env.N1HUB_AUTH_TOKEN?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('N1HUB_AUTH_SECRET must be configured in production.');
  }

  return DEV_AUTH_SECRET;
}

function signTokenPayload(payload: string) {
  return base64UrlEncode(crypto.createHmac('sha256', getAuthSecret()).update(payload).digest());
}

function parseCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [candidateKey, ...candidateValue] = part.trim().split('=');
    if (candidateKey === key) {
      return candidateValue.join('=');
    }
  }

  return null;
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
}

function getSessionCookieToken(request: Request) {
  return parseCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);
}

function getRequestToken(request: Request) {
  const bearerToken = getBearerToken(request);
  if (bearerToken) return bearerToken;

  return getSessionCookieToken(request);
}

export { AUTH_COOKIE_NAME };
export type { SessionRole, AuthFactor, AuthSession };

export function getAuthToken(options: {
  sub?: string;
  role?: SessionRole;
  factors?: AuthFactor[];
  durationMs?: number;
} = {}) {
  const issuedAt = Date.now();
  const payload: AuthSession = {
    sub: options.sub ?? 'architect',
    role: options.role ?? 'owner',
    factors: options.factors ?? ['password'],
    issuedAt,
    expiresAt: issuedAt + (options.durationMs ?? SESSION_DURATION_MS),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function getSessionFromToken(token: string | null | undefined): AuthSession | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  if (signTokenPayload(encodedPayload) !== signature) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload).toString('utf-8')) as unknown;
    if (!isSessionShape(parsed)) return null;
    if (parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  const session = getSessionFromToken(token);
  if (!session) {
    throw new Error('Cannot set an invalid auth session cookie.');
  }

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(session.expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export type RequestAuthTransport = 'bearer' | 'session' | 'none';

export function getRequestAuthTransport(request: Request): RequestAuthTransport {
  if (getBearerToken(request)) return 'bearer';
  if (getSessionCookieToken(request)) return 'session';
  return 'none';
}

function getTrustedRequestOrigin(request: Request): string | null {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      return null;
    }
  }

  const refererHeader = request.headers.get('referer');
  if (!refererHeader) return null;

  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
}

function requestUsesMutationMethod(request: Request): boolean {
  return MUTATION_METHODS.has(request.method.toUpperCase());
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const requestOrigin = getTrustedRequestOrigin(request);
  if (!requestOrigin) return false;

  try {
    return requestOrigin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function getTrustedMutationError(request: Request): string | null {
  if (!requestUsesMutationMethod(request)) return null;
  if (getRequestAuthTransport(request) !== 'session') return null;
  return isTrustedMutationOrigin(request)
    ? null
    : 'Forbidden: cross-site mutation request rejected.';
}

export function requireTrustedMutation(request: Request): NextResponse | null {
  const error = getTrustedMutationError(request);
  return error ? NextResponse.json({ error }, { status: 403 }) : null;
}

export function getSameOriginMutationError(request: Request): string | null {
  if (!requestUsesMutationMethod(request)) return null;
  return isTrustedMutationOrigin(request) ? null : 'Forbidden: untrusted mutation origin.';
}

export function requireSameOriginMutation(request: Request): NextResponse | null {
  const error = getSameOriginMutationError(request);
  return error ? NextResponse.json({ error }, { status: 403 }) : null;
}

export function isAuthorized(request: Request): boolean {
  return Boolean(getSessionFromToken(getRequestToken(request)));
}

export function resolveRole(request: Request): SessionRole {
  if (process.env.NODE_ENV === 'test') {
    const explicitRole = request.headers.get('x-n1-role');
    if (explicitRole === 'owner' || explicitRole === 'editor' || explicitRole === 'viewer') {
      return explicitRole;
    }
  }

  return getSessionFromToken(getRequestToken(request))?.role ?? 'viewer';
}

export function checkRateLimit(
  request: Request,
  options: { windowMs?: number; maxRequests?: number } = {},
): { allowed: boolean; retryAfterSeconds: number } {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 60;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
  const authHeader = request.headers.get('authorization') ?? 'anonymous';
  const key = `${ip}:${authHeader}`;

  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    rateLimitBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}
