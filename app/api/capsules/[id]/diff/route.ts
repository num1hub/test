import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit } from '@/lib/apiSecurity';
import { branchNameSchema } from '@/contracts/diff';
import { computeDiff } from '@/lib/diff/diff-engine';

const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

function requireAuthorized(request: Request): NextResponse | null {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const branchA = branchNameSchema.safeParse(url.searchParams.get('branchA') ?? 'real');
  const branchB = branchNameSchema.safeParse(url.searchParams.get('branchB') ?? 'dream');
  if (!branchA.success || !branchB.success) {
    return jsonError(400, 'Invalid branch name');
  }

  try {
    const { id } = await params;
    const recursive = url.searchParams.get('recursive') === 'true';
    const diff = await computeDiff(branchA.data, branchB.data, {
      scopeType: 'capsule',
      scopeRootId: id,
      recursive,
    });
    return NextResponse.json(diff);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export const dynamic = 'force-dynamic';
