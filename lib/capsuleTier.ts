import type { CapsuleTier } from '@/types/capsule';

export const CAPSULE_TIERS: readonly CapsuleTier[] = [1, 2, 3, 4];

export function coerceCapsuleTier(value: unknown): CapsuleTier | null {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : null;
}

export function formatCapsuleTier(value: unknown): string {
  const tier = coerceCapsuleTier(value);
  return tier ? `Tier ${tier}` : 'Tier ?';
}

export function capsuleTierBadgeClass(value: unknown): string {
  const tier = coerceCapsuleTier(value);

  switch (tier) {
    case 1:
      return 'border-red-900 bg-red-950/60 text-red-300';
    case 2:
      return 'border-amber-900 bg-amber-950/60 text-amber-300';
    case 3:
      return 'border-sky-900 bg-sky-950/60 text-sky-300';
    case 4:
      return 'border-slate-700 bg-slate-800 text-slate-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-500';
  }
}
