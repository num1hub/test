import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation, resolveRole } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds, readCapsulesFromDisk } from '@/lib/capsuleVault';
import {
  getOverlayExistenceSet,
  listExplicitBranchCapsules,
  loadOverlayGraph,
  readBranchManifest,
  readOverlayCapsule,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';
import { branchNameSchema } from '@/contracts/diff';

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

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

function requireEditor(request: Request): NextResponse | null {
  const role = resolveRole(request);
  return role === 'owner' || role === 'editor' ? null : jsonError(401, 'Unauthorized');
}

function resolveBranch(request: Request): string | null {
  const raw = new URL(request.url).searchParams.get('branch') ?? 'real';
  const parsed = branchNameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function GET(request: Request) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const materializedOnly = searchParams.get('materialized') === 'true';
    const branch = resolveBranch(request);
    if (!branch) return jsonError(400, 'Invalid branch name');
    if (branch !== 'real' && !(await readBranchManifest(branch))) {
      return jsonError(404, 'Branch not found');
    }

    const capsules =
      branch === 'real'
        ? ((await readCapsulesFromDisk()) as unknown[])
        : materializedOnly
          ? await listExplicitBranchCapsules(branch)
          : await loadOverlayGraph(branch);

    const filteredCapsules = capsules.filter((capsule) => {
      if (!typeFilter) return true;
      if (!isRecordObject(capsule)) return false;
      const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
      return metadata?.type === typeFilter;
    });

    return NextResponse.json(filteredCapsules);
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export async function POST(request: Request) {
  const authError = requireAuthorized(request) ?? requireEditor(request);
  if (authError) return authError;

  try {
    const branch = resolveBranch(request);
    if (!branch) return jsonError(400, 'Invalid branch name');
    if (branch !== 'real' && !(await readBranchManifest(branch))) {
      return jsonError(404, 'Branch not found');
    }

    const body = (await request.json()) as unknown;
    if (!isRecordObject(body)) {
      return jsonError(400, 'Bad Request: Invalid JSON');
    }

    const capsule = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    const rawParentId = typeof capsule.parentId === 'string' ? capsule.parentId.trim() : '';
    if (rawParentId) {
      const allCapsules = branch === 'real' ? await readCapsulesFromDisk() : await loadOverlayGraph(branch);
      const parentExists = allCapsules.some((candidate) => {
        if (!isRecordObject(candidate)) return false;
        const metadata = isRecordObject(candidate.metadata) ? candidate.metadata : null;
        if (!metadata) return false;
        return (
          metadata.capsule_id === rawParentId &&
          metadata.type === 'project' &&
          metadata.subtype === 'hub'
        );
      });

      if (!parentExists) {
        return jsonError(
          400,
          `Invalid parentId "${rawParentId}". Parent project must exist and be type=project subtype=hub.`,
        );
      }

      if (!isRecordObject(capsule.recursive_layer)) {
        capsule.recursive_layer = { links: [] };
      }
      const recursiveLayer = capsule.recursive_layer as Record<string, unknown>;
      if (!Array.isArray(recursiveLayer.links)) {
        recursiveLayer.links = [];
      }

      const links = recursiveLayer.links as Array<Record<string, unknown>>;
      const alreadyLinked = links.some(
        (link) => link.relation_type === 'part_of' && link.target_id === rawParentId,
      );
      if (!alreadyLinked) {
        links.push({
          target_id: rawParentId,
          relation_type: 'part_of',
        });
      }
    }

    delete capsule.parentId;
    const existingIds = branch === 'real' ? await getExistingCapsuleIds() : await getOverlayExistenceSet(branch);

    let validation = await validateCapsule(capsule, { existingIds });
    let finalCapsule = capsule;

    if (
      !validation.valid &&
      validation.errors.every((issue: ValidationIssue) => isFixableGate(issue.gate))
    ) {
      const fixed = autoFixCapsule(capsule);
      finalCapsule = fixed.fixedData;
      validation = await validateCapsule(finalCapsule, { existingIds });
    }

    const finalCapsuleRecord = isRecordObject(finalCapsule) ? finalCapsule : null;
    const finalMetadata = isRecordObject(finalCapsuleRecord?.metadata)
      ? finalCapsuleRecord.metadata
      : null;
    const capsuleId = finalMetadata?.capsule_id;

    await appendValidationLog({
      capsule_id: typeof capsuleId === 'string' ? capsuleId : null,
      source: 'ui',
      success: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Capsule was not stored.',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    if (typeof capsuleId !== 'string' || capsuleId.length === 0) {
      return jsonError(400, 'Validation passed but capsule_id is missing or invalid.');
    }

    if (existingIds.has(capsuleId) || (await readOverlayCapsule(capsuleId, branch))) {
      return jsonError(409, 'Conflict: Capsule ID already exists');
    }

    await writeOverlayCapsule(finalCapsule as never, branch);
    await logActivity('create', {
      capsule_id: capsuleId,
      branch,
      type: typeof finalMetadata?.type === 'string' ? finalMetadata.type : 'unknown',
    });
    return NextResponse.json(finalCapsule, { status: 201 });
  } catch {
    return jsonError(400, 'Bad Request: Invalid JSON');
  }
}

export const dynamic = 'force-dynamic';
