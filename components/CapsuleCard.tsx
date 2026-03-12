import Link from 'next/link';
import { SovereignCapsule } from '@/types/capsule';
import ValidationBadge from '@/components/validation/ValidationBadge';
import CapsuleVisualMark from '@/components/CapsuleVisualMark';
import { resolveCapsuleFaceprint } from '@/lib/capsuleFaceprint';
import { resolveCapsulePalette, withAlpha } from '@/lib/capsulePalette';
import { resolveCapsulePresence } from '@/lib/capsulePresence';
import {
  resolveCapsuleVisualProfile,
  type CapsuleVisualProfileKey,
} from '@/lib/capsuleVisualProfile';
import { capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { useCapsuleStore } from '@/store/capsuleStore';

export default function CapsuleCard({
  capsule,
  showValidationBadge = true,
  href,
  visualProfile,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  capsule: SovereignCapsule;
  showValidationBadge?: boolean;
  href?: string;
  visualProfile?: CapsuleVisualProfileKey;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { metadata, neuro_concentrate } = capsule;
  const validationStatus = useCapsuleStore((state) => state.validationStatus[metadata.capsule_id]);
  const destinationHref = href ?? `/vault/capsule/${metadata.capsule_id}`;
  const palette = resolveCapsulePalette(metadata);
  const faceprint = resolveCapsuleFaceprint(metadata.capsule_id);
  const profile = resolveCapsuleVisualProfile(visualProfile);
  const presence = resolveCapsulePresence({
    metadata,
    palette,
    linkCount: capsule.recursive_layer?.links?.length ?? 0,
  });
  const typeBadgeLabel =
    palette.key === metadata.type || !metadata.type ? metadata.type ?? 'capsule' : palette.label;

  return (
    <div className="group relative h-full">
      {selectable && onToggleSelect ? (
        <button
          type="button"
          onClick={onToggleSelect}
          aria-pressed={selected}
          aria-label={selected ? `Deselect ${metadata.capsule_id}` : `Select ${metadata.capsule_id}`}
          className={`absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
            selected
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
              : 'border-slate-700 bg-slate-950/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          {selected ? '✓' : '+'}
        </button>
      ) : null}

      <Link href={destinationHref} className="block h-full">
        <div
          className="flex h-full flex-col rounded-xl border bg-slate-900 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            borderColor: selected
              ? palette.badgeBorder
              : palette.cardBorder,
            boxShadow: `0 20px 46px -34px rgba(15, 23, 42, 0.35), 0 20px 46px -34px ${withAlpha(
              palette.accent,
              0.16 * presence.haloBoost * profile.cardGlowBoost,
            )}`,
            transform: `translateZ(0) scale(${profile.key === 'cinematic' ? 1.005 : 1})`,
          }}
        >
          <div
            className="mb-4 h-px rounded-full"
            style={{
              background: `linear-gradient(90deg, ${withAlpha(
                palette.accent,
                0,
              )} 0%, ${withAlpha(
                palette.accent,
                0.82 * presence.ringBoost,
              )} 20%, ${withAlpha(
                palette.accent,
                Math.min(1, presence.haloBoost),
              )} 50%, ${withAlpha(
                palette.accent,
                0.82 * presence.ringBoost,
              )} 80%, ${withAlpha(palette.accent, 0)} 100%)`,
            }}
            aria-hidden="true"
          />

          <div className="mb-3 flex items-start justify-between gap-3 pr-12">
            <div className="min-w-0 space-y-2">
              <span
                className="inline-flex rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider"
                style={{
                  color: palette.badgeText,
                  borderColor: palette.badgeBorder,
                  backgroundColor: palette.badgeBackground,
                }}
                title={`${palette.label} · ${palette.tone}`}
              >
                [{palette.sigil}] {typeBadgeLabel}
              </span>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {presence.label} · {palette.rankLabel}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: palette.badgeText }}>
                Face {faceprint.memoryTag}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <CapsuleVisualMark
                palette={palette}
                capsuleId={metadata.capsule_id}
                presenceTier={presence.tier}
                visualProfile={visualProfile}
                size="sm"
                className="mb-1"
              />
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                {metadata.status}
              </span>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${capsuleTierBadgeClass(
                  metadata.tier,
                )}`}
              >
                {formatCapsuleTier(metadata.tier)}
              </span>
            </div>
          </div>

          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="break-words text-lg font-bold leading-tight text-slate-200 transition-colors group-hover:text-slate-50">
              {metadata.capsule_id}
            </h3>
            {showValidationBadge && validationStatus ? (
              <ValidationBadge
                valid={validationStatus.valid}
                warnings={validationStatus.warnings}
                errors={validationStatus.errors}
              />
            ) : null}
          </div>

          <p className="mb-4 flex-grow line-clamp-3 text-sm text-slate-400">
            {neuro_concentrate?.summary || 'No summary available.'}
          </p>

          <div className="mb-4 rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Memory cue
            </div>
            <div className="mt-1 text-xs leading-5" style={{ color: palette.badgeText }}>
              {faceprint.memoryTag} · {palette.motif} · {palette.memoryCue}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-800/50 pt-4">
            <div className="font-mono text-xs text-slate-500">
              {metadata.semantic_hash?.substring(0, 16)}...
            </div>
            <div className="text-xs" style={{ color: palette.badgeText }}>
              {metadata.subtype}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
