import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation, resolveRole } from '@/lib/apiSecurity';
import { branchExists, forkCapsule } from '@/lib/branching';

const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) {
    return jsonError(401, 'Unauthorized');
  }
  const rate = checkRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  const role = resolveRole(request);
  if (role !== 'owner' && role !== 'editor') {
    return jsonError(401, 'Unauthorized');
  }

  try {
    const { id } = await params;
    if (await branchExists(id, 'dream')) {
      return jsonError(409, 'Dream branch already exists.');
    }

    const dreamCapsule = await forkCapsule(id);
    return NextResponse.json(dreamCapsule, { status: 201 });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return jsonError(404, 'Real capsule not found to fork.');
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return jsonError(message.includes('already exists') ? 409 : 500, message);
  }
}
