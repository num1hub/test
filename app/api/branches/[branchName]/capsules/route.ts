import { NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit, requireTrustedMutation } from '@/lib/apiSecurity';
import type { BranchInfo } from '@/contracts/diff';
import { branchNameSchema } from '@/contracts/diff';
import {
  getBranchInfo,
  listBranchCapsuleIds,
  loadOverlayGraph,
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

async function toBranchInfo(branchName: string): Promise<BranchInfo> {
  const info = await getBranchInfo(branchName);
  const capsuleIds =
    info.manifest?.capsuleIds ?? (branchName === 'real' ? await listBranchCapsuleIds('real') : []);
  const timestamp = new Date(0).toISOString();

  return {
    name: branchName,
    sourceBranch: info.manifest?.sourceBranch ?? 'real',
    sourceProjectId: info.manifest?.sourceProjectId ?? null,
    capsuleIds,
    createdAt: info.manifest?.createdAt ?? timestamp,
    updatedAt: info.manifest?.updatedAt ?? timestamp,
    description: info.manifest?.description,
    archived: info.manifest?.archived,
    isDefault: info.isDefault,
    materialized: info.materialized,
    tombstoned: info.tombstoned,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchName: string }> },
) {
  const authError = requireAuthorized(request);
  if (authError) return authError;

  const { branchName } = await params;
  const branchParsed = branchNameSchema.safeParse(branchName);
  if (!branchParsed.success) {
    return jsonError(400, 'Invalid branch name');
  }

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const capsuleIds = url.searchParams
      .get('capsuleIds')
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const recursive = url.searchParams.get('recursive') === 'true';

    const capsules = await loadOverlayGraph(branchParsed.data, {
      scopeType: projectId ? 'project' : capsuleIds?.length ? 'capsule' : 'vault',
      scopeRootId: projectId ?? undefined,
      capsuleIds,
      recursive,
    });

    const branch = await toBranchInfo(branchParsed.data);

    return NextResponse.json({
      branch,
      capsules,
    });
  } catch {
    return jsonError(500, 'Internal Server Error');
  }
}

export const dynamic = 'force-dynamic';
