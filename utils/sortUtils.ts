import { SovereignCapsule } from '@/types/capsule';

export type SortOption = 'name-asc' | 'name-desc' | 'date-new' | 'date-old' | 'type' | 'tier';

const toTimestamp = (input?: string) => {
  if (!input) return 0;
  const time = new Date(input).getTime();
  return Number.isFinite(time) ? time : 0;
};

export function sortCapsules(
  capsules: SovereignCapsule[],
  option: SortOption,
): SovereignCapsule[] {
  const sorted = [...capsules];

  return sorted.sort((a, b) => {
    switch (option) {
      case 'name-asc':
        return a.metadata.capsule_id.localeCompare(b.metadata.capsule_id);
      case 'name-desc':
        return b.metadata.capsule_id.localeCompare(a.metadata.capsule_id);
      case 'date-new':
        return toTimestamp(b.metadata.created_at) - toTimestamp(a.metadata.created_at);
      case 'date-old':
        return toTimestamp(a.metadata.created_at) - toTimestamp(b.metadata.created_at);
      case 'type': {
        const typeA = a.metadata.type || '';
        const typeB = b.metadata.type || '';
        const typeCompare = typeA.localeCompare(typeB);
        if (typeCompare !== 0) return typeCompare;
        return a.metadata.capsule_id.localeCompare(b.metadata.capsule_id);
      }
      case 'tier': {
        const tierA = typeof a.metadata.tier === 'number' ? a.metadata.tier : Number.MAX_SAFE_INTEGER;
        const tierB = typeof b.metadata.tier === 'number' ? b.metadata.tier : Number.MAX_SAFE_INTEGER;
        if (tierA !== tierB) return tierA - tierB;
        return a.metadata.capsule_id.localeCompare(b.metadata.capsule_id);
      }
      default:
        return 0;
    }
  });
}
