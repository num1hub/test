import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation } from '@/lib/apiSecurity';
import { getVersion, restoreVersion } from '@/lib/versioning';
import { branchNameSchema } from '@/contracts/diff';

function resolveBranch(request: Request): string | null {
  const parsed = branchNameSchema.safeParse(new URL(request.url).searchParams.get('branch') ?? 'real');
  return parsed.success ? parsed.data : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rate = checkRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const branch = resolveBranch(request);
  if (!branch) {
    return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
  }

  try {
    const { id, timestamp } = await params;
    const versionData = await getVersion(id, timestamp, { branch });
    if (!versionData) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json(versionData);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> },
) {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rate = checkRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const branch = resolveBranch(request);
  if (!branch) {
    return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
  }

  try {
    const { id, timestamp } = await params;
    const restoredCapsule = await restoreVersion(id, timestamp, { branch });
    return NextResponse.json(restoredCapsule);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
