import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { GATE_DEFINITIONS } from '@/lib/validator';

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 240, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  return NextResponse.json({
    gates: GATE_DEFINITIONS,
  });
}
