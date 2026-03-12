import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation } from '@/lib/apiSecurity';
import { batchDiffRequestSchema } from '@/contracts/diff';
import { computeDiff } from '@/lib/diff/diff-engine';

const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

function requireAuthorized(request: Request): NextResponse | null {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) return jsonError(401, 'Unauthorized');
  const rate = checkRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  return null;
}

export async function POST(request: Request) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = batchDiffRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid diff request');
    }

    const diff = await computeDiff(parsed.data.branchA, parsed.data.branchB, {
      scopeType: parsed.data.scopeType,
      scopeRootId: parsed.data.scopeRootId,
      capsuleIds: parsed.data.capsuleIds,
      recursive: parsed.data.recursive,
      cascadeDeletes: parsed.data.cascadeDeletes,
      ignorePaths: parsed.data.ignorePaths,
    });

    return NextResponse.json(diff);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export const dynamic = 'force-dynamic';
