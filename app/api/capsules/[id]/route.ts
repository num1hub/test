import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { branchExists, getCapsulePath, readCapsuleBranch, writeCapsuleBranch } from '@/lib/branching';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds, readCapsulesFromDisk } from '@/lib/capsuleVault';
import { wouldCreateCycle } from '@/lib/projectUtils';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue } from '@/lib/validator/types';
import type { SovereignCapsule } from '@/types/capsule';
import { isBranchType, type BranchType } from '@/types/branch';
import { isProject } from '@/types/project';
import { isRecordObject } from '@/lib/validator/utils';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

const getPartOfTargets = (capsule: SovereignCapsule): string[] => {
  if (!Array.isArray(capsule.recursive_layer?.links)) return [];
  return capsule.recursive_layer.links
    .filter((link) => link.relation_type === 'part_of' && typeof link.target_id === 'string')
    .map((link) => link.target_id);
};

const isCapsuleLike = (value: unknown): value is SovereignCapsule => {
  if (!isRecordObject(value)) return false;
  const metadata = isRecordObject(value.metadata) ? value.metadata : null;
  const recursiveLayer = isRecordObject(value.recursive_layer) ? value.recursive_layer : null;
  return (
    Boolean(metadata) &&
    typeof metadata?.capsule_id === 'string' &&
    Boolean(recursiveLayer) &&
    Array.isArray(recursiveLayer?.links)
  );
};

const resolveBranch = (request: Request): BranchType => {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('branch');
  return isBranchType(raw) ? raw : 'real';
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const branch = resolveBranch(request);
    const capsule = await readCapsuleBranch(id, branch);
    return NextResponse.json(capsule);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Capsule branch not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let capsule: SovereignCapsule;
  try {
    capsule = (await request.json()) as SovereignCapsule;
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const branch = resolveBranch(request);
    const exists = await branchExists(id, branch);
    if (!exists) {
      return NextResponse.json({ error: 'Capsule not found' }, { status: 404 });
    }

    if (!capsule?.metadata || typeof capsule.metadata !== 'object') {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
    if (capsule.metadata.capsule_id !== id) {
      return NextResponse.json({ error: 'Capsule ID mismatch' }, { status: 400 });
    }

    const existingCapsule = await readCapsuleBranch(id, branch);
    const previousPartOfTargets = getPartOfTargets(existingCapsule);
    const nextPartOfTargets = getPartOfTargets(capsule);

    const partOfChanged =
      previousPartOfTargets.length !== nextPartOfTargets.length ||
      previousPartOfTargets.some((targetId) => !nextPartOfTargets.includes(targetId));

    if (partOfChanged && isProject(capsule)) {
      const diskCapsules = (await readCapsulesFromDisk()).filter(isCapsuleLike);
      const graphCapsules: SovereignCapsule[] = [
        ...diskCapsules.filter((candidate) => candidate.metadata.capsule_id !== id),
        capsule,
      ];
      const projectIds = new Set(
        graphCapsules
          .filter((candidate) => isProject(candidate))
          .map((candidate) => candidate.metadata.capsule_id),
      );

      for (const parentId of nextPartOfTargets) {
        if (!projectIds.has(parentId)) {
          return NextResponse.json(
            {
              error: `Invalid parent project "${parentId}". Project capsules can only be part_of other project hubs.`,
            },
            { status: 400 },
          );
        }

        if (wouldCreateCycle(graphCapsules, id, parentId)) {
          return NextResponse.json(
            {
              error: `Cycle detected: assigning "${id}" under "${parentId}" would create a project hierarchy cycle.`,
            },
            { status: 409 },
          );
        }
      }
    }

    const existingIds = await getExistingCapsuleIds();
    existingIds.add(id);

    let validation = await validateCapsule(capsule, { existingIds });
    let finalCapsule = capsule;

    if (!validation.valid && validation.errors.every((issue: ValidationIssue) => isFixableGate(issue.gate))) {
      const fixed = autoFixCapsule(capsule);
      finalCapsule = fixed.fixedData as SovereignCapsule;
      validation = await validateCapsule(finalCapsule, { existingIds });
    }

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
          error: 'Validation failed. Update was rejected.',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    finalCapsule.metadata.updated_at = new Date().toISOString();
    await writeCapsuleBranch(id, branch, finalCapsule);
    await logActivity('update', {
      capsule_id: id,
      message: `Updated ${branch} branch.`,
    });
    return NextResponse.json(finalCapsule);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const deletedBranches: BranchType[] = [];

    for (const branch of ['real', 'dream'] as const) {
      const filePath = getCapsulePath(id, branch);
      try {
        await fs.unlink(filePath);
        deletedBranches.push(branch);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    if (deletedBranches.length === 0) {
      return NextResponse.json({ error: 'Capsule not found' }, { status: 404 });
    }

    await logActivity('delete', {
      capsule_id: id,
      message: `Deleted branches: ${deletedBranches.join(', ')}`,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
