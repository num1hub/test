import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { getResolvedAiProviderCatalog } from '@/lib/ai/providerRuntime';

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 120, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const providers = await getResolvedAiProviderCatalog();
    return NextResponse.json({ providers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resolve AI providers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
