'use client';

import { useMemo } from 'react';
import CapsuleVisualMark from '@/components/CapsuleVisualMark';
import { CAPSULE_PRESENCE_LEGEND } from '@/lib/capsulePresence';
import {
  type CapsuleVisualLegendItem,
  CAPSULE_VISUAL_MEMORY_LEGEND,
  resolveCapsulePalette,
  withAlpha,
} from '@/lib/capsulePalette';
import {
  resolveCapsuleGraphQuality,
  resolveCapsuleVisualProfile,
  type CapsuleVisualProfileKey,
  type CapsuleGraphQualityKey,
} from '@/lib/capsuleVisualProfile';
import type { SovereignCapsule } from '@/types/capsule';

type WorkspaceVisualLegendProps = {
  capsules: SovereignCapsule[];
  ownerLabel: string;
  visualProfile?: CapsuleVisualProfileKey;
  graphQuality?: CapsuleGraphQualityKey;
};

function legendItemToPalette(item: CapsuleVisualLegendItem) {
  return {
    key: item.key,
    label: item.label,
    tone: item.tone,
    sigil: item.sigil,
    motif: item.motif,
    shape: item.shape,
    memoryCue: item.memoryCue,
    rankLabel: item.rankLabel,
    silhouette: item.silhouette,
    heroMark: item.heroMark,
    hierarchyDepth: item.hierarchyDepth,
    accent: item.accent,
    badgeText: item.accent,
    badgeBorder: withAlpha(item.accent, 0.45),
    badgeBackground: withAlpha(item.accent, 0.14),
    cardBorder: withAlpha(item.accent, 0.34),
    cardGlow: withAlpha(item.accent, 0.18),
    accentLine: `linear-gradient(90deg, ${withAlpha(item.accent, 0)} 0%, ${withAlpha(item.accent, 0.82)} 20%, ${withAlpha(item.accent, 1)} 50%, ${withAlpha(item.accent, 0.82)} 80%, ${withAlpha(item.accent, 0)} 100%)`,
    graphNode: item.accent,
  };
}

export default function WorkspaceVisualLegend({
  capsules,
  ownerLabel,
  visualProfile,
  graphQuality,
}: WorkspaceVisualLegendProps) {
  const profile = resolveCapsuleVisualProfile(visualProfile);
  const quality = resolveCapsuleGraphQuality(graphQuality);
  const activeLegendItems = useMemo(() => {
    const visibleKeys = new Set(
      capsules.map((capsule) => resolveCapsulePalette(capsule.metadata).key),
    );

    const ordered = CAPSULE_VISUAL_MEMORY_LEGEND.filter((item) =>
      visibleKeys.has(item.key),
    );

    return ordered;
  }, [capsules]);

  if (activeLegendItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {ownerLabel} Visual Memory Palette
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Read the graph by family language, not by text alone. Color gives
            the clan. Silhouette gives the rank. Sigil gives the shorthand.
            Shape gives the role. Faceprint gives the individual capsule. Size,
            position, and links finish the sentence. The goal is to let you
            recognize a capsule as a visual actor before you consciously read
            its ID.
          </p>
        </div>
        <div className="text-right text-[11px] uppercase tracking-[0.22em] text-slate-600">
          <div>color → silhouette → sigil → shape → faceprint</div>
          <div className="mt-1">
            {profile.label} profile · {quality.label} graph
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeLegendItems.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border bg-slate-900/70 p-3"
            style={{
              borderColor: withAlpha(item.accent, 0.32),
              boxShadow: `0 18px 38px -34px ${withAlpha(item.accent, 0.35)}`,
            }}
          >
            <div className="flex items-center gap-3">
              <CapsuleVisualMark
                palette={legendItemToPalette(item)}
                visualProfile={visualProfile}
                size="sm"
              />
              <div className="min-w-0">
                <div
                  className="text-[11px] font-mono uppercase tracking-[0.22em]"
                  style={{ color: item.accent }}
                >
                  [{item.sigil}] {item.label} · {item.tone}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {item.rankLabel} · {item.motif}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {item.description}
            </p>
            <p className="mt-2 text-xs leading-5" style={{ color: item.accent }}>
              {item.memoryCue}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Presence Grammar
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Presence is the second visual language of the vault. It tells you how
          much structural gravity a capsule carries before you read its name.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {CAPSULE_PRESENCE_LEGEND.map((item, index) => (
            <div
              key={item.tier}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              style={{
                boxShadow: `0 18px 40px -36px ${withAlpha('#94a3b8', 0.12 + index * 0.03)}`,
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                {item.label}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {item.tier}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
