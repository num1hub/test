import Link from 'next/link';
import { SovereignCapsule } from '@/types/capsule';
import ValidationBadge from '@/components/validation/ValidationBadge';
import { capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { useCapsuleStore } from '@/store/capsuleStore';

export default function CapsuleCard({
  capsule,
  showValidationBadge = true,
  href,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  capsule: SovereignCapsule;
  showValidationBadge?: boolean;
  href?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { metadata, neuro_concentrate } = capsule;
  const validationStatus = useCapsuleStore((state) => state.validationStatus[metadata.capsule_id]);
  const destinationHref = href ?? `/vault/capsule/${metadata.capsule_id}`;
  
  // Color coding based on type
  const typeColors: Record<string, string> = {
    foundation: 'text-amber-400 border-amber-900/50 bg-amber-900/10',
    concept: 'text-blue-400 border-blue-900/50 bg-blue-900/10',
    operations: 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10',
    physical_object: 'text-orange-400 border-orange-900/50 bg-orange-900/10',
    project: 'text-violet-400 border-violet-900/50 bg-violet-900/10',
  };
  
  const badgeClass = (metadata.type && typeColors[metadata.type]) || 'text-slate-400 border-slate-700 bg-slate-800';

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
          className={`h-full rounded-xl border bg-slate-900 p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-amber-900/10 ${
            selected
              ? 'border-amber-500/60 shadow-lg shadow-amber-900/15'
              : 'border-slate-800 hover:border-amber-600/50'
          } flex flex-col`}
        >
          <div className="mb-3 flex items-start justify-between gap-3 pr-12">
            <span className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${badgeClass}`}>
              {metadata.type}
            </span>
            <div className="flex flex-col items-end gap-1">
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
            <h3 className="text-lg font-bold leading-tight text-slate-200 transition-colors group-hover:text-amber-500 break-words">
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

          <div className="mt-auto flex items-center justify-between border-t border-slate-800/50 pt-4">
            <div className="font-mono text-xs text-slate-500">
              {metadata.semantic_hash?.substring(0, 16)}...
            </div>
            <div className="text-xs text-slate-600">{metadata.subtype}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
