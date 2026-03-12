import type { CapsuleSubtype } from '@/types/capsule';
import type { SortOption } from '@/utils/sortUtils';

export const WORKSPACE_SORT_GROUPS: Array<{
  label: string;
  options: Array<{ value: SortOption; label: string }>;
}> = [
  {
    label: 'Updated',
    options: [
      { value: 'date-new', label: 'Newest' },
      { value: 'date-old', label: 'Oldest' },
    ],
  },
  {
    label: 'Name',
    options: [
      { value: 'name-asc', label: 'A-Z' },
      { value: 'name-desc', label: 'Z-A' },
    ],
  },
  {
    label: 'Structure',
    options: [
      { value: 'type', label: 'Type' },
      { value: 'tier', label: 'Tier' },
    ],
  },
];

export const WORKSPACE_SORT_LABELS = new Map<SortOption, string>(
  WORKSPACE_SORT_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.value, option.label] as const),
  ),
);

export const WORKSPACE_SUBTYPE_OPTIONS: Array<{ value: CapsuleSubtype; label: string }> = [
  { value: 'hub', label: 'Hub' },
  { value: 'atomic', label: 'Atomic' },
];
