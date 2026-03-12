import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, isAuthorized, requireTrustedMutation } from '@/lib/apiSecurity';
import { fetchAiLaneStatuses, refreshAiLanes } from '@/lib/ai/controlSurface';

const refreshSchema = z.object({
  lane: z.enum(['symphony', 'ninfinity', 'all']).default('all'),
});

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
    const lanes = await fetchAiLaneStatuses();
    return NextResponse.json({
      generated_at: new Date().toISOString(),
      lanes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load AI control state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const parsed = refreshSchema.parse((await request.json()) as unknown);
    const results = await refreshAiLanes(parsed.lane);
    return NextResponse.json({
      requested_at: new Date().toISOString(),
      lane: parsed.lane,
      results,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid AI control refresh payload' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to refresh AI lanes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
