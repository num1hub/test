import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, resolveRole } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { CAPSULES_DIR, getExistingCapsuleIds, getOverlayExistenceSet } from '@/lib/capsuleVault';
import {
  dematerializeOverlayCapsule,
  getRealCapsulePath,
  listBranches,
  loadOverlayGraph,
  parseCapsuleBranchFilename,
  readOverlayCapsule,
  readBranchManifest,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager';
import { wouldCreateCycle } from '@/lib/projectUtils';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue } from '@/lib/validator/types';
import type { SovereignCapsule } from '@/types/capsule';
import { isProject } from '@/types/project';
import { branchNameSchema } from '@/contracts/diff';
import { isRecordObject } from '@/lib/validator/utils';

const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

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

const resolveBranch = (request: Request): string | null => {
  const raw = new URL(request.url).searchParams.get('branch') ?? 'real';
  const parsed = branchNameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  const branch = resolveBranch(request);
  if (!branch) return jsonError(400, 'Invalid branch name');

  try {
    const { id } = await params;
    const capsule = await readOverlayCapsule(id, branch);
    if (!capsule) {
      return jsonError(404, 'Capsule branch not found');
    }
    return NextResponse.json(capsule);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuthorized(request) ?? requireEditor(request);
  if (authError) return authError;

  let capsule: SovereignCapsule;
  try {
    capsule = (await request.json()) as SovereignCapsule;
  } catch {
    return jsonError(400, 'Bad Request');
  }

  try {
    const { id } = await params;
    const branch = resolveBranch(request);
    if (!branch) return jsonError(400, 'Invalid branch name');
    if (branch !== 'real' && !(await readBranchManifest(branch))) {
      return jsonError(404, 'Branch not found');
    }

    const existingCapsule = await readOverlayCapsule(id, branch);
    if (!existingCapsule) {
      return jsonError(404, 'Capsule not found');
    }

    if (!capsule?.metadata || typeof capsule.metadata !== 'object') {
      return jsonError(400, 'Bad Request');
    }
    if (capsule.metadata.capsule_id !== id) {
      return jsonError(400, 'Capsule ID mismatch');
    }

    const previousPartOfTargets = getPartOfTargets(existingCapsule);
    const nextPartOfTargets = getPartOfTargets(capsule);
    const partOfChanged =
      previousPartOfTargets.length !== nextPartOfTargets.length ||
      previousPartOfTargets.some((targetId) => !nextPartOfTargets.includes(targetId));

    if (partOfChanged && isProject(capsule)) {
      const graphCapsules = (await loadOverlayGraph(branch)).filter(isCapsuleLike);
      const projectGraph: SovereignCapsule[] = [
        ...graphCapsules.filter((candidate) => candidate.metadata.capsule_id !== id),
        capsule,
      ];
      const projectIds = new Set(
        projectGraph
          .filter((candidate) => isProject(candidate))
          .map((candidate) => candidate.metadata.capsule_id),
      );

      for (const parentId of nextPartOfTargets) {
        if (!projectIds.has(parentId)) {
          return jsonError(
            400,
            `Invalid parent project "${parentId}". Project capsules can only be part_of other project hubs.`,
          );
        }

        if (wouldCreateCycle(projectGraph, id, parentId)) {
          return jsonError(
            409,
            `Cycle detected: assigning "${id}" under "${parentId}" would create a project hierarchy cycle.`,
          );
        }
      }
    }

    const existingIds =
      branch === 'real' ? await getExistingCapsuleIds() : await getOverlayExistenceSet(branch);
    existingIds.add(id);

    let validation = await validateCapsule(capsule, { existingIds });
    let finalCapsule = capsule;

    if (
      !validation.valid &&
      validation.errors.every((issue: ValidationIssue) => isFixableGate(issue.gate))
    ) {
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
    await writeOverlayCapsule(finalCapsule, branch);
    await logActivity('update', {
      capsule_id: id,
      branch,
      message: `Updated ${branch} branch.`,
    });
    return NextResponse.json(finalCapsule);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuthorized(request) ?? requireEditor(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const deletedBranches = new Set<string>();

    try {
      await fs.unlink(getRealCapsulePath(id));
      deletedBranches.add('real');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const files = await fs.readdir(CAPSULES_DIR).catch((error: unknown) =>
      (error as NodeJS.ErrnoException).code === 'ENOENT' ? [] : Promise.reject(error),
    );

    const branches = new Set<string>();
    for (const file of files) {
      const parsed = parseCapsuleBranchFilename(file);
      if (parsed?.capsuleId === id && parsed.branch !== 'real') {
        branches.add(parsed.branch);
      }
    }

    for (const branch of branches) {
      await dematerializeOverlayCapsule(id, branch, { removeFromManifest: true });
      deletedBranches.add(branch);
    }

    for (const branchInfo of await listBranches()) {
      if (branchInfo.name === 'real' || !branchInfo.capsuleIds.includes(id)) continue;
      await dematerializeOverlayCapsule(id, branchInfo.name, { removeFromManifest: true });
    }

    if (deletedBranches.size === 0) {
      return jsonError(404, 'Capsule not found');
    }

    await logActivity('delete', {
      capsule_id: id,
      message: `Deleted branches: ${[...deletedBranches].sort().join(', ')}`,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export const dynamic = 'force-dynamic';
