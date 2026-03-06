import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit } from '@/lib/apiSecurity';
import { listVersions } from '@/lib/versioning';
import { branchNameSchema } from '@/contracts/diff';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  try {
    const { id } = await params;
    const branchParsed = branchNameSchema.safeParse(
      new URL(request.url).searchParams.get('branch') ?? 'real',
    );
    if (!branchParsed.success) {
      return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
    }
    const versions = await listVersions(id, { branch: branchParsed.data });
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to list versions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
