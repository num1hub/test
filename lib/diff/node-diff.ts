import type { SovereignCapsule } from '@/types/capsule';
import type { RemovedCapsuleRef } from '@/lib/diff/types';

export function indexByCapsuleId(
  capsules: SovereignCapsule[],
): Map<string, SovereignCapsule> {
  return new Map(capsules.map((capsule) => [capsule.metadata.capsule_id, capsule] as const));
}

export function unionKeys<T>(
  mapA: Map<string, T>,
  mapB: Map<string, T>,
): string[] {
  return [...new Set([...mapA.keys(), ...mapB.keys()])].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function getSummary(capsule?: SovereignCapsule): string | undefined {
  if (!capsule) return undefined;
  return (
    (typeof capsule.neuro_concentrate.summary === 'string' && capsule.neuro_concentrate.summary) ||
    (typeof capsule.metadata.name === 'string' && capsule.metadata.name) ||
    capsule.metadata.capsule_id
  );
}

export function toRemovedRef(capsule: SovereignCapsule): RemovedCapsuleRef {
  return {
    id: capsule.metadata.capsule_id,
    summary: getSummary(capsule) ?? capsule.metadata.capsule_id,
    capsuleType: capsule.metadata.type,
    before: capsule,
  };
}
