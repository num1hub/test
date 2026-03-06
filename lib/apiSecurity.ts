const AUTH_TOKEN = process.env.N1HUB_AUTH_TOKEN ?? 'n1-authorized-architect-token-777';

const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

export function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${AUTH_TOKEN}`;
}

export function resolveRole(request: Request): 'owner' | 'editor' | 'viewer' {
  const explicitRole = request.headers.get('x-n1-role');
  if (explicitRole === 'owner' || explicitRole === 'editor' || explicitRole === 'viewer') {
    return explicitRole;
  }

  // Single-token mode: authorized requests are treated as owner by default.
  return isAuthorized(request) ? 'owner' : 'viewer';
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
