'use client';

import Link from 'next/link';
import type { SovereignCapsule } from '@/types/capsule';
import CapsuleVisualMark from '@/components/CapsuleVisualMark';
import { resolveCapsuleFaceprint } from '@/lib/capsuleFaceprint';
import { resolveCapsulePalette, withAlpha } from '@/lib/capsulePalette';
import { resolveCapsulePresence } from '@/lib/capsulePresence';
import type { CapsuleVisualProfileKey } from '@/lib/capsuleVisualProfile';

type WorkspaceCapsuleIndexProps = {
  capsules: SovereignCapsule[];
  getCapsuleHref: (capsuleId: string) => string;
  visualProfile?: CapsuleVisualProfileKey;
};

function getDisplayName(capsule: SovereignCapsule) {
  const explicitName =
    typeof capsule.metadata.name === 'string' ? capsule.metadata.name.trim() : '';

  return explicitName || capsule.metadata.capsule_id;
}

export default function WorkspaceCapsuleIndex({
  capsules,
  getCapsuleHref,
  visualProfile,
}: WorkspaceCapsuleIndexProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[minmax(280px,2.2fr)_minmax(170px,1fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)] gap-4 border-b border-slate-800 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <span>Capsule</span>
            <span>Palette</span>
            <span>Status</span>
            <span>Links</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {capsules.map((capsule) => {
              const palette = resolveCapsulePalette(capsule.metadata);
              const faceprint = resolveCapsuleFaceprint(capsule.metadata.capsule_id);
              const links = capsule.recursive_layer.links?.length ?? 0;
              const presence = resolveCapsulePresence({
                metadata: capsule.metadata,
                palette,
                linkCount: links,
              });

              return (
                <Link
                  key={capsule.metadata.capsule_id}
                  href={getCapsuleHref(capsule.metadata.capsule_id)}
                  className="grid grid-cols-[minmax(280px,2.2fr)_minmax(170px,1fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)] gap-4 px-4 py-4 transition-colors hover:bg-slate-900/70"
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full"
                        style={{
                          backgroundColor: palette.accent,
                          boxShadow: `0 0 0 ${3 + presence.haloBoost * 2}px ${withAlpha(
                            palette.accent,
                            0.1 * presence.haloBoost,
                          )}`,
                        }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">
                          {getDisplayName(capsule)}
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-slate-500">
                          {capsule.metadata.capsule_id}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                          {capsule.neuro_concentrate.summary || 'No summary available.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <CapsuleVisualMark
                      palette={palette}
                      capsuleId={capsule.metadata.capsule_id}
                      presenceTier={presence.tier}
                      visualProfile={visualProfile}
                      size="sm"
                      className="mt-0.5 flex-none"
                    />
                    <div className="min-w-0">
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.18em]"
                        style={{
                          color: palette.badgeText,
                          borderColor: palette.badgeBorder,
                          backgroundColor: palette.badgeBackground,
                        }}
                        title={palette.label}
                      >
                        [{palette.sigil}] {palette.label}
                      </span>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {presence.label} · {palette.rankLabel}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: palette.badgeText }}>
                        Face {faceprint.memoryTag}
                      </div>
                      <div className="mt-1 text-xs leading-5" style={{ color: palette.badgeText }}>
                        {palette.memoryCue}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300">
                    <div>{capsule.metadata.status || 'unknown'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {capsule.metadata.type || 'capsule'} · {capsule.metadata.subtype || 'unknown'}
                    </div>
                  </div>

                  <div className="text-sm text-slate-300">
                    <div>{links}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {typeof capsule.metadata.tier === 'number'
                        ? `Tier ${capsule.metadata.tier}`
                        : 'No tier'}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
