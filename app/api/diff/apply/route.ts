import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, resolveRole } from '@/lib/apiSecurity';
import { mergeOptionsSchema } from '@/contracts/diff';
import { mergeBranches } from '@/lib/diff/merge-engine';

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

function requireEditor(request: Request): NextResponse | null {
  const role = resolveRole(request);
  return role === 'owner' || role === 'editor' ? null : jsonError(401, 'Unauthorized');
}

export async function POST(request: Request) {
  const authError = requireAuthorized(request) ?? requireEditor(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = mergeOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid merge request');
    }

    const result = await mergeBranches(parsed.data);
    if (
      result.conflicts.length > 0 &&
      parsed.data.conflictResolution === 'manual' &&
      parsed.data.dryRun !== true
    ) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export const dynamic = 'force-dynamic';
