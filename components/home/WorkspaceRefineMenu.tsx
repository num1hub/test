'use client';

import { useEffect, useRef, useState } from 'react';
import { CAPSULE_TYPES } from '@/components/vault/constants';
import { CAPSULE_TIERS } from '@/lib/capsuleTier';
import {
  CAPSULE_GRAPH_QUALITY_PRESETS,
  CAPSULE_VISUAL_PROFILES,
  type CapsuleGraphQualityKey,
  type CapsuleVisualProfileKey,
} from '@/lib/capsuleVisualProfile';
import type { CapsuleSubtype, CapsuleTier, CapsuleType } from '@/types/capsule';
import type { SortOption } from '@/utils/sortUtils';
import {
  WORKSPACE_SORT_GROUPS,
  WORKSPACE_SUBTYPE_OPTIONS,
} from '@/components/home/workspaceRefineConfig';

function RefineChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

export default function WorkspaceRefineMenu({
  sortOption,
  activeTypes,
  activeTiers,
  activeSubtypes,
  onSelectSort,
  onToggleType,
  onClearTypes,
  onToggleTier,
  onClearTiers,
  onToggleSubtype,
  onClearSubtypes,
  visualProfile,
  graphQuality,
  onSelectVisualProfile,
  onSelectGraphQuality,
  onResetAll,
}: {
  sortOption: SortOption;
  activeTypes: Set<CapsuleType>;
  activeTiers: Set<CapsuleTier>;
  activeSubtypes: Set<CapsuleSubtype>;
  onSelectSort: (option: SortOption) => void;
  onToggleType: (type: CapsuleType) => void;
  onClearTypes: () => void;
  onToggleTier: (tier: CapsuleTier) => void;
  onClearTiers: () => void;
  onToggleSubtype: (subtype: CapsuleSubtype) => void;
  onClearSubtypes: () => void;
  visualProfile: CapsuleVisualProfileKey;
  graphQuality: CapsuleGraphQualityKey;
  onSelectVisualProfile: (profile: CapsuleVisualProfileKey) => void;
  onSelectGraphQuality: (quality: CapsuleGraphQualityKey) => void;
  onResetAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
      >
        <span className="text-white">Refine</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:w-[24rem]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Refine Grid
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Sort and filter what the grid, index, and 2D graph show.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close refine menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">Sort</div>
              <div className="space-y-3">
                {WORKSPACE_SORT_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600/80">
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => (
                        <RefineChip
                          key={option.value}
                          active={sortOption === option.value}
                          label={option.label}
                          onClick={() => onSelectSort(option.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">Type</div>
              <div className="flex flex-wrap gap-2">
                <RefineChip
                  active={activeTypes.size === 0}
                  label="All"
                  onClick={onClearTypes}
                />
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
            </section>

            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">Tier</div>
              <div className="flex flex-wrap gap-2">
                <RefineChip
                  active={activeTiers.size === 0}
                  label="All tiers"
                  onClick={onClearTiers}
                />
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
            </section>

            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">
                Structure
              </div>
              <div className="flex flex-wrap gap-2">
                <RefineChip
                  active={activeSubtypes.size === 0}
                  label="All"
                  onClick={onClearSubtypes}
                />
                {WORKSPACE_SUBTYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggleSubtype(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                      activeSubtypes.has(option.value)
                        ? 'border-violet-500/40 bg-violet-500/10 text-violet-200'
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">
                Visual Memory
              </div>
              <div className="flex flex-wrap gap-2">
                {CAPSULE_VISUAL_PROFILES.map((profile) => (
                  <RefineChip
                    key={profile.key}
                    active={visualProfile === profile.key}
                    label={profile.label}
                    onClick={() => onSelectVisualProfile(profile.key)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-600">
                Graph Quality
              </div>
              <div className="flex flex-wrap gap-2">
                {CAPSULE_GRAPH_QUALITY_PRESETS.map((quality) => (
                  <RefineChip
                    key={quality.key}
                    active={graphQuality === quality.key}
                    label={quality.label}
                    onClick={() => onSelectGraphQuality(quality.key)}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 flex items-center justify-start gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onResetAll}
              className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
            >
              Reset all
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
