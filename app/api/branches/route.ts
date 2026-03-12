import { NextResponse } from 'next/server';
import type { BranchInfo } from '@/contracts/diff';
import { isAuthorized, checkRateLimit, requireTrustedMutation, resolveRole } from '@/lib/apiSecurity';
import { createBranchRequestSchema } from '@/contracts/diff';
import {
  createBranch,
  getBranchInfo,
  listBranchCapsuleIds,
  listBranches,
  loadOverlayGraph,
  readBranchManifest,
} from '@/lib/diff/branch-manager';

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

async function toBranchInfo(branchName: string): Promise<BranchInfo> {
  const info = await getBranchInfo(branchName);
  const capsuleIds =
    info.manifest?.capsuleIds ?? (branchName === 'real' ? await listBranchCapsuleIds('real') : []);

  return {
    name: branchName,
    sourceBranch: info.manifest?.sourceBranch ?? 'real',
    sourceProjectId: info.manifest?.sourceProjectId ?? null,
    capsuleIds,
    createdAt: info.manifest?.createdAt ?? new Date().toISOString(),
    updatedAt: info.manifest?.updatedAt ?? new Date().toISOString(),
    description: info.manifest?.description,
    archived: info.manifest?.archived,
    isDefault: info.isDefault,
    materialized: info.materialized,
    tombstoned: info.tombstoned,
  };
}

export async function GET(request: Request) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const capsuleId = url.searchParams.get('capsuleId');
    const branches = await Promise.all([
      toBranchInfo('real'),
      ...(await listBranches()).map(async (branch) => toBranchInfo(branch.name)),
    ]);

    if (!projectId && !capsuleId) {
      return NextResponse.json({ branches });
    }

    let scopeIds = new Set<string>();
    if (projectId) {
      scopeIds = new Set(
        (await loadOverlayGraph('real', {
          scopeType: 'project',
          scopeRootId: projectId,
          recursive: true,
        })).map((capsule) => capsule.metadata.capsule_id),
      );
    } else if (capsuleId) {
      scopeIds = new Set([capsuleId]);
    }

    const filtered = branches.filter((branch) => {
      return branch.capsuleIds.some((id) => scopeIds.has(id));
    });

    return NextResponse.json({ branches: filtered });
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export async function POST(request: Request) {
  const authError = requireAuthorized(request) ?? requireEditor(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createBranchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid branch request' },
        { status: 400 },
      );
    }

    if (await readBranchManifest(parsed.data.newBranchName)) {
      return jsonError(409, 'Branch already exists');
    }

    const manifest = await createBranch({
      newBranchName: parsed.data.newBranchName,
      sourceBranch: parsed.data.sourceBranch,
      scopeType: parsed.data.sourceProjectId ? 'project' : 'capsule',
      scopeRootId: parsed.data.sourceProjectId ?? parsed.data.sourceCapsuleId,
      capsuleIds: parsed.data.sourceCapsuleId ? [parsed.data.sourceCapsuleId] : undefined,
      recursive: parsed.data.recursive,
      description: parsed.data.description,
    });

    return NextResponse.json(manifest, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return jsonError(message === 'Branch already exists' ? 409 : 500, message);
  }
}

export const dynamic = 'force-dynamic';
