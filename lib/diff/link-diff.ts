import type { LinkChange } from '@/contracts/diff';
import type { SovereignCapsule } from '@/types/capsule';
import { stableHash } from '@/lib/validator/utils';

type LinkRow = {
  source: string;
  target: string;
  relation: string;
  rest: Record<string, unknown>;
};

function extractLinkRows(capsule?: SovereignCapsule): LinkRow[] {
  if (!capsule || !Array.isArray(capsule.recursive_layer.links)) return [];
  return capsule.recursive_layer.links
    .filter(
      (
        link,
      ): link is NonNullable<SovereignCapsule['recursive_layer']['links']>[number] & {
        relation_type: string;
      } =>
        typeof link.target_id === 'string' &&
        typeof link.relation_type === 'string' &&
        link.relation_type.length > 0,
    )
    .map((link) => {
      const { target_id, relation_type, ...rest } = link;
      return {
        source: capsule.metadata.capsule_id,
        target: target_id,
        relation: relation_type as string,
        rest,
      };
    });
}

function linkKey(row: LinkRow): string {
  return `${row.source}::${row.target}::${row.relation}`;
}

function sourceTargetKey(row: LinkRow): string {
  return `${row.source}::${row.target}`;
}

function toLinkChange(
  change: LinkChange['change'],
  row: LinkRow,
  previous?: LinkRow,
): LinkChange {
  return {
    source: row.source,
    target: row.target,
    relation: row.relation,
    change,
    oldRelation: previous?.relation,
    newRelation: change === 'modified' ? row.relation : undefined,
    oldWeight: typeof previous?.rest.weight === 'number' ? previous.rest.weight : undefined,
    newWeight: typeof row.rest.weight === 'number' ? row.rest.weight : undefined,
    oldLink: previous?.rest,
    newLink: change === 'removed' ? undefined : row.rest,
  };
}

/**
 * Link identity stays anchored on source, target, and relation so relation
 * changes are represented as a removal plus an addition instead of a mutation.
 */
export function diffCapsuleLinks(
  before?: SovereignCapsule,
  after?: SovereignCapsule,
): LinkChange[] {
  const rowsA = extractLinkRows(before);
  const rowsB = extractLinkRows(after);

  const mapA = new Map(rowsA.map((row) => [linkKey(row), row] as const));
  const mapB = new Map(rowsB.map((row) => [linkKey(row), row] as const));
  const sourceTargetB = new Map(rowsB.map((row) => [sourceTargetKey(row), row] as const));
  const changes: LinkChange[] = [];

  for (const [key, rowB] of mapB.entries()) {
    const rowA = mapA.get(key);
    if (!rowA) {
      changes.push(toLinkChange('added', rowB));
      continue;
    }

    if (stableHash(rowA) !== stableHash(rowB)) {
      changes.push(toLinkChange('modified', rowB, rowA));
    }
  }

  for (const [key, rowA] of mapA.entries()) {
    if (mapB.has(key)) continue;

    const relationChanged =
      sourceTargetB.has(sourceTargetKey(rowA)) &&
      sourceTargetB.get(sourceTargetKey(rowA))?.relation !== rowA.relation;

    changes.push(
      relationChanged
        ? {
            ...toLinkChange('removed', rowA, rowA),
            oldRelation: rowA.relation,
            newRelation: undefined,
            oldLink: rowA.rest,
            newLink: undefined,
          }
        : toLinkChange('removed', rowA, rowA),
    );
  }

  return changes.sort((left, right) => {
    return (
      left.source.localeCompare(right.source) ||
      left.target.localeCompare(right.target) ||
      left.relation.localeCompare(right.relation) ||
      left.change.localeCompare(right.change)
    );
  });
}

export function diffGraphLinks(
  before: SovereignCapsule[],
  after: SovereignCapsule[],
): LinkChange[] {
  const beforeMap = new Map(before.map((capsule) => [capsule.metadata.capsule_id, capsule] as const));
  const afterMap = new Map(after.map((capsule) => [capsule.metadata.capsule_id, capsule] as const));
  const ids = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();
  return ids.flatMap((id) => diffCapsuleLinks(beforeMap.get(id), afterMap.get(id)));
}
