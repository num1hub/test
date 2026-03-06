'use client';

import type { MergeResult } from '@/contracts/diff';
import { capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { buildDiffTierInsights } from '@/lib/tierAnalytics';
import type { BranchName } from '@/types/branch';

interface CapsuleBranchMergePanelProps {
  branch: BranchName;
  preview: MergeResult | null;
  isPreviewing: boolean;
  isApplying: boolean;
  onPreview: () => void;
  onApply: () => void;
  onOpenPreview: () => void;
}

export default function CapsuleBranchMergePanel({
  branch,
  preview,
  isPreviewing,
  isApplying,
  onPreview,
  onApply,
  onOpenPreview,
}: CapsuleBranchMergePanelProps) {
  if (branch === 'real') return null;

  const tierInsights = preview ? buildDiffTierInsights(preview.diff) : null;
  const changedFieldCount = preview
    ? preview.diff.modified.reduce((total, node) => total + node.changes.length, 0)
    : 0;
  const tier1Surface = tierInsights ? tierInsights.addedCounts[1] + tierInsights.changedSurfaceCounts[1] : 0;
  const tier2Surface = tierInsights ? tierInsights.addedCounts[2] + tierInsights.changedSurfaceCounts[2] : 0;
  const hasConflicts = (preview?.conflicts.length ?? 0) > 0;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Capsule Merge Review</div>
          <div className="mt-1 text-sm text-slate-300">
            Preview the {branch} overlay into real before any capsule-level writeback.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            disabled={isPreviewing || isApplying}
            className="rounded-lg border border-sky-900/50 bg-sky-900/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-900/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPreviewing ? 'Previewing...' : 'Preview Merge'}
          </button>
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={!preview || isPreviewing || isApplying}
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Preview
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!preview || hasConflicts || isPreviewing || isApplying}
            className="rounded-lg border border-emerald-900/50 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : branch === 'dream' ? 'Promote to Real' : 'Apply to Real'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Changed Fields</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{changedFieldCount}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Action Items</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{preview?.diff.actionPlan.length ?? 0}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tier 1 Surface</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full border px-2 py-1 text-xs font-mono ${capsuleTierBadgeClass(1)}`}>
              {formatCapsuleTier(1)}
            </span>
            <span className="text-2xl font-semibold text-slate-100">{tier1Surface}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Conflicts</div>
          <div className={`mt-2 text-2xl font-semibold ${hasConflicts ? 'text-amber-300' : 'text-slate-100'}`}>
            {preview?.conflicts.length ?? 0}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className={`rounded-full border px-2 py-1 font-mono ${capsuleTierBadgeClass(2)}`}>
              {formatCapsuleTier(2)}
            </span>
            <span>surface {tier2Surface}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
        {!preview ? (
          <p>Run a merge preview first. Apply remains locked until the current branch has a reviewed dry-run result.</p>
        ) : hasConflicts ? (
          <p className="text-amber-300">
            Preview found {preview.conflicts.length} conflict(s). Review the diff before any write to real.
          </p>
        ) : (
          <p className="text-emerald-300">
            Preview is conflict-free. This capsule branch is ready to merge into real.
          </p>
        )}
        {preview?.diff.summary && <p className="mt-2 text-slate-400">{preview.diff.summary}</p>}
      </div>
    </section>
  );
}
