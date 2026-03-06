'use client';

import Link from 'next/link';
import type { BranchName } from '@/types/branch';
import type { SovereignCapsule } from '@/types/capsule';
import { CAPSULE_TIERS, capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { buildProjectTierHeatmap, countCapsulesByTier } from '@/lib/tierAnalytics';

function heatCellClass(value: number, max: number): string {
  if (value <= 0 || max <= 0) return 'border-slate-800 bg-slate-950 text-slate-600';

  const ratio = value / max;
  if (ratio >= 0.75) return 'border-cyan-700 bg-cyan-500/25 text-cyan-200';
  if (ratio >= 0.5) return 'border-cyan-800 bg-cyan-500/18 text-cyan-300';
  if (ratio >= 0.25) return 'border-cyan-900 bg-cyan-500/12 text-cyan-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function formatDelta(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : String(value);
}

interface TierInsightsProps {
  capsules: SovereignCapsule[];
  branch?: BranchName;
  baselineCapsules?: SovereignCapsule[] | null;
}

export default function TierInsights({
  capsules,
  branch = 'real',
  baselineCapsules = null,
}: TierInsightsProps) {
  const tierCounts = countCapsulesByTier(capsules);
  const heatmapRows = buildProjectTierHeatmap(capsules);
  const baselineTierCounts = baselineCapsules ? countCapsulesByTier(baselineCapsules) : null;
  const baselineHeatmapRows = baselineCapsules ? buildProjectTierHeatmap(baselineCapsules) : [];
  const baselineHeatmapMap = new Map(
    baselineHeatmapRows.map((row) => [row.projectId, row]),
  );
  const tierMax = Math.max(...CAPSULE_TIERS.map((tier) => tierCounts[tier]), 1);
  const strategicSurface = tierCounts[1] + tierCounts[2];
  const executionSurface = tierCounts[3] + tierCounts[4];
  const baselineStrategicSurface = baselineTierCounts
    ? baselineTierCounts[1] + baselineTierCounts[2]
    : null;
  const baselineExecutionSurface = baselineTierCounts
    ? baselineTierCounts[3] + baselineTierCounts[4]
    : null;
  const heatmapMax = Math.max(
    ...heatmapRows.flatMap((row) => CAPSULE_TIERS.map((tier) => row.counts[tier])),
    1,
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tier Map</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">Strategic Capsule Surface</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Tier turns the vault into an importance map: constitutional trust-core, active platform,
            operational support, and exploratory perimeter.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Branch: <span className="text-slate-300">{branch}</span>
            {baselineTierCounts ? (
              <>
                {' '}
                · Baseline compare: <span className="text-slate-300">real</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>
            Strategic surface: <span className="font-semibold text-slate-200">{strategicSurface}</span>
            {baselineStrategicSurface !== null ? (
              <span className="ml-2 text-xs text-cyan-300">
                {formatDelta(strategicSurface - baselineStrategicSurface)} vs real
              </span>
            ) : null}
          </div>
          <div>
            Execution surface: <span className="font-semibold text-slate-200">{executionSurface}</span>
            {baselineExecutionSurface !== null ? (
              <span className="ml-2 text-xs text-cyan-300">
                {formatDelta(executionSurface - baselineExecutionSurface)} vs real
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CAPSULE_TIERS.map((tier) => (
          <div key={tier} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <span
                className={`rounded border px-2 py-1 text-xs font-mono ${capsuleTierBadgeClass(
                  tier,
                )}`}
              >
                {formatCapsuleTier(tier)}
              </span>
              <span className="font-mono text-xl font-semibold text-slate-100">
                {tierCounts[tier]}
              </span>
            </div>
            {baselineTierCounts ? (
              <div className="mt-2 text-xs text-cyan-300">
                {formatDelta(tierCounts[tier] - baselineTierCounts[tier])} vs real
              </div>
            ) : null}
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-cyan-400 transition-all"
                style={{ width: `${(tierCounts[tier] / tierMax) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Project Heatmap
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Root-project view of where the highest-tier capsules are concentrated.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(72px,1fr))_minmax(72px,1fr)] gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              <div>Project</div>
              {CAPSULE_TIERS.map((tier) => (
                <div key={tier} className="text-center">
                  Tier {tier}
                </div>
              ))}
              <div className="text-center">Total</div>
            </div>

            <div className="mt-3 space-y-2">
              {heatmapRows.map((row) => (
                <div
                  key={row.projectId}
                  className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(72px,1fr))_minmax(72px,1fr)] gap-2"
                >
                  <Link
                    href={`/projects/${encodeURIComponent(row.projectId)}${
                      branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`
                    }`}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-amber-500 hover:text-amber-400"
                  >
                    {row.projectName}
                  </Link>
                  {CAPSULE_TIERS.map((tier) => {
                    const baselineRow = baselineHeatmapMap.get(row.projectId);
                    const baselineValue = baselineRow?.counts[tier] ?? 0;
                    const delta = row.counts[tier] - baselineValue;

                    return (
                      <div
                        key={`${row.projectId}-${tier}`}
                        className={`rounded-lg border px-3 py-2 text-center ${heatCellClass(
                          row.counts[tier],
                          heatmapMax,
                        )}`}
                      >
                        <div className="text-sm font-medium">{row.counts[tier]}</div>
                        {baselineTierCounts ? (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-cyan-300">
                            {formatDelta(delta)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-slate-200">
                    {row.total}
                    {baselineTierCounts ? (
                      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-cyan-300">
                        {formatDelta(row.total - (baselineHeatmapMap.get(row.projectId)?.total ?? 0))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
