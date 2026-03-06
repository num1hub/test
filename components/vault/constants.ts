import type { CapsuleType } from '@/types/capsule';

export const CAPSULE_TYPES: { id: CapsuleType; label: string; color: string }[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    color: 'border-amber-900 bg-amber-900/20 text-amber-400',
  },
  {
    id: 'concept',
    label: 'Concept',
    color: 'border-blue-900 bg-blue-900/20 text-blue-400',
  },
  {
    id: 'operations',
    label: 'Operations',
    color: 'border-emerald-900 bg-emerald-900/20 text-emerald-400',
  },
  {
    id: 'physical_object',
    label: 'Physical',
    color: 'border-orange-900 bg-orange-900/20 text-orange-400',
  },
  {
    id: 'project',
    label: 'Project',
    color: 'border-violet-900 bg-violet-900/20 text-violet-400',
  },
];
