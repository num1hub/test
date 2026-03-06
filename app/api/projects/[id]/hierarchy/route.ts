import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized, checkRateLimit } from '@/lib/apiSecurity';
import { loadOverlayGraph } from '@/lib/diff/branch-manager';
import type { SovereignCapsule } from '@/types/capsule';
import { branchNameSchema } from '@/contracts/diff';
import { isRecordObject } from '@/lib/validator/utils';

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

const getChildren = (parentId: string, capsules: SovereignCapsule[]): SovereignCapsule[] => {
  return capsules.filter((capsule) =>
    (capsule.recursive_layer.links ?? []).some(
      (link) => link.relation_type === 'part_of' && link.target_id === parentId,
    ),
  );
};

export async function GET(
  request: NextRequest,
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

  const { id } = await params;
  const url = new URL(request.url);
  const maxDepth = Math.max(1, Math.min(Number(url.searchParams.get('depth') ?? 10), 50));
  const branchParsed = branchNameSchema.safeParse(url.searchParams.get('branch') ?? 'real');
  if (!branchParsed.success) {
    return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
  }

  try {
    const capsules = (await loadOverlayGraph(branchParsed.data)).filter(isCapsuleLike);
    const root = capsules.find((capsule) => capsule.metadata.capsule_id === id);

    if (!root || root.metadata.type !== 'project') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const buildSubtree = (
      parentId: string,
      depth: number,
      ancestry: Set<string>,
    ): Array<SovereignCapsule & { children: unknown[] }> => {
      if (depth <= 0) return [];

      return getChildren(parentId, capsules).map((child) => {
        const nextAncestry = new Set(ancestry);
        const childId = child.metadata.capsule_id;
        if (nextAncestry.has(childId)) {
          return { ...child, children: [] };
        }
        nextAncestry.add(childId);
        return {
          ...child,
          children: buildSubtree(childId, depth - 1, nextAncestry),
        };
      });
    };

    return NextResponse.json({
      ...root,
      children: buildSubtree(id, maxDepth, new Set([id])),
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
