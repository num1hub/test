import { NextResponse } from 'next/server';
import { branchExists, promoteCapsule, readCapsuleBranch } from '@/lib/branching';
import { getExistingCapsuleIds } from '@/lib/capsuleVault';
import { appendValidationLog } from '@/lib/validationLog';
import { validateCapsule } from '@/lib/validator';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!(await branchExists(id, 'dream'))) {
      return NextResponse.json({ error: 'Dream branch does not exist.' }, { status: 404 });
    }

    const dreamCapsule = await readCapsuleBranch(id, 'dream');
    const existingIds = await getExistingCapsuleIds();
    existingIds.add(id);

    const validation = await validateCapsule(dreamCapsule, { existingIds });
    await appendValidationLog({
      capsule_id: id,
      source: 'ui',
      success: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Dream branch failed validation and cannot be promoted.',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    const realCapsule = await promoteCapsule(id);
    return NextResponse.json(realCapsule, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
