'use client';

import { CAPSULE_TYPES } from '@/components/vault/constants';
import { CAPSULE_TIERS } from '@/lib/capsuleTier';
import type { CapsuleTier, CapsuleType } from '@/types/capsule';

interface VaultFilterBarProps {
  activeTypes: Set<CapsuleType>;
  activeTiers: Set<CapsuleTier>;
  visibleCount: number;
  totalCount: number;
  onClearFilters: () => void;
  onClearTiers: () => void;
  onToggleType: (type: CapsuleType) => void;
  onToggleTier: (tier: CapsuleTier) => void;
}

export default function VaultFilterBar({
  activeTypes,
  activeTiers,
  visibleCount,
  totalCount,
  onClearFilters,
  onClearTiers,
  onToggleType,
  onToggleTier,
}: VaultFilterBarProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearFilters}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              activeTypes.size === 0 && activeTiers.size === 0
                ? 'border-slate-200 bg-slate-200 text-slate-900'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
            }`}
          >
            All
          </button>
          {CAPSULE_TYPES.map((capsuleType) => (
            <button
              key={capsuleType.id}
              type="button"
              onClick={() => onToggleType(capsuleType.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                activeTypes.has(capsuleType.id)
                  ? capsuleType.color
                  : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'
              }`}
            >
              {capsuleType.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearTiers}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              activeTiers.size === 0
                ? 'border-slate-200 bg-slate-200 text-slate-900'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
            }`}
          >
            All tiers
          </button>
          {CAPSULE_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onToggleTier(tier)}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                activeTiers.has(tier)
                  ? 'border-cyan-600 bg-cyan-900/20 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'
              }`}
            >
              Tier {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Showing <strong className="text-slate-300">{visibleCount}</strong> of {totalCount} capsules
      </div>
    </div>
  );
}
