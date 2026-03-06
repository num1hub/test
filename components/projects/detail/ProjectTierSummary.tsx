'use client';

import type { BranchName } from '@/types/branch';
import { CAPSULE_TIERS, capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { countCapsulesByTier } from '@/lib/tierAnalytics';
import type { SovereignCapsule } from '@/types/capsule';
import type { ProjectCapsule } from '@/types/project';

interface ProjectTierSummaryProps {
  branch: BranchName;
  project: ProjectCapsule;
  linkedCapsules: SovereignCapsule[];
  baselineProject?: ProjectCapsule;
  baselineLinkedCapsules?: SovereignCapsule[] | null;
}

function formatDelta(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : String(value);
}

export default function ProjectTierSummary({
  branch,
  project,
  linkedCapsules,
  baselineProject,
  baselineLinkedCapsules = null,
}: ProjectTierSummaryProps) {
  const counts = countCapsulesByTier(linkedCapsules);
  const baselineCounts = baselineLinkedCapsules ? countCapsulesByTier(baselineLinkedCapsules) : null;
  const strategic = counts[1] + counts[2];
  const exploratory = counts[4];
  const baselineStrategic = baselineCounts ? baselineCounts[1] + baselineCounts[2] : null;
  const baselineExploratory = baselineCounts ? baselineCounts[4] : null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tier Summary</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">Project Criticality Map</h2>
          <p className="mt-1 text-sm text-slate-400">
            Direct subprojects and linked atomic capsules grouped by strategic weight.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            Branch: <span className="text-slate-300">{branch}</span>
            {baselineCounts ? (
              <>
                {' '}
                · Baseline compare: <span className="text-slate-300">real</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded border px-3 py-1.5 text-xs font-mono ${capsuleTierBadgeClass(
              project.metadata.tier,
            )}`}
          >
            Current project: {formatCapsuleTier(project.metadata.tier)}
          </span>
          {baselineProject ? (
            <span
              className={`rounded border px-3 py-1.5 text-xs font-mono ${capsuleTierBadgeClass(
                baselineProject.metadata.tier,
              )}`}
            >
              Real project: {formatCapsuleTier(baselineProject.metadata.tier)}
            </span>
          ) : null}
          <span className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300">
            Linked capsules: {linkedCapsules.length}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CAPSULE_TIERS.map((tier) => (
          <div key={tier} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <span
                className={`rounded border px-2 py-1 text-xs font-mono ${capsuleTierBadgeClass(
                  tier,
                )}`}
              >
                {formatCapsuleTier(tier)}
              </span>
              <span className="font-mono text-lg font-semibold text-slate-100">{counts[tier]}</span>
            </div>
            {baselineCounts ? (
              <div className="mt-2 text-xs text-cyan-300">
                {formatDelta(counts[tier] - baselineCounts[tier])} vs real
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-400 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          Strategic linked surface: <span className="font-semibold text-slate-200">{strategic}</span>
          {baselineStrategic !== null ? (
            <span className="ml-2 text-xs text-cyan-300">
              {formatDelta(strategic - baselineStrategic)} vs real
            </span>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          Exploratory linked surface: <span className="font-semibold text-slate-200">{exploratory}</span>
          {baselineExploratory !== null ? (
            <span className="ml-2 text-xs text-cyan-300">
              {formatDelta(exploratory - baselineExploratory)} vs real
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
