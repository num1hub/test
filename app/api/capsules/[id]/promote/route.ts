import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation, resolveRole } from '@/lib/apiSecurity';
import { branchExists } from '@/lib/branching';
import { dematerializeOverlayCapsule, readOverlayCapsule } from '@/lib/diff/branch-manager';
import { mergeBranches } from '@/lib/diff/merge-engine';

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
    if (!(await branchExists(id, 'dream'))) {
      return jsonError(404, 'Dream branch does not exist.');
    }

    const result = await mergeBranches({
      sourceBranch: 'dream',
      targetBranch: 'real',
      scopeType: 'capsule',
      scopeRootId: id,
      conflictResolution: 'source-wins',
    });

    if (!result.applied) {
      return NextResponse.json(result, { status: 409 });
    }

    await dematerializeOverlayCapsule(id, 'dream', { removeFromManifest: true });
    const realCapsule = await readOverlayCapsule(id, 'real');
    if (!realCapsule) {
      return jsonError(500, 'Merged capsule could not be loaded from real branch.');
    }

    return NextResponse.json(realCapsule, { status: 200 });
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}
