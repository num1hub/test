'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { SovereignCapsule } from '@/types/capsule';

const CapsuleGraph = dynamic(() => import('@/components/CapsuleGraph'), { ssr: false });

interface ProjectNeighborhoodGraphProps {
  capsules: SovereignCapsule[];
  showGraph: boolean;
  graphFullscreen: boolean;
  onToggleGraph: () => void;
  onToggleFullscreen: () => void;
  getNodeHref: (id: string) => string;
}

export default function ProjectNeighborhoodGraph({
  capsules,
  showGraph,
  graphFullscreen,
  onToggleGraph,
  onToggleFullscreen,
  getNodeHref,
}: ProjectNeighborhoodGraphProps) {
  const graphCapsules = useMemo(() => capsules, [capsules]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Project Graph (Neighborhood)</h2>
        <button
          type="button"
          onClick={onToggleGraph}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
        >
          {showGraph ? 'Hide Graph' : 'Show Graph'}
        </button>
      </div>

      {showGraph && (
        <div
          className={`overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl ${
            graphFullscreen
              ? 'fixed inset-0 z-50 rounded-none'
              : 'relative h-[520px] w-full rounded-xl'
          }`}
        >
          <CapsuleGraph
            capsules={graphCapsules}
            getNodeHref={getNodeHref}
            isFullscreen={graphFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>
      )}
    </section>
  );
}
