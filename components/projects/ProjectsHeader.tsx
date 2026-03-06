'use client';

import Link from 'next/link';
import AppNav from '@/components/AppNav';
import type { ProjectsViewMode } from '@/hooks/useProjectsDashboardState';

interface ProjectsHeaderProps {
  view: ProjectsViewMode;
  onViewChange: (view: ProjectsViewMode) => void;
}

export default function ProjectsHeader({
  view,
  onViewChange,
}: ProjectsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-100">Projects</h1>
        <AppNav />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
          {(['grid', 'tree'] as const).map((candidateView) => (
            <button
              key={candidateView}
              onClick={() => onViewChange(candidateView)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === candidateView
                  ? 'bg-slate-800 text-amber-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {candidateView === 'grid' ? 'Grid' : 'Tree'}
            </button>
          ))}
        </div>

        <Link
          href="/projects/new"
          className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white transition-colors hover:bg-amber-500"
        >
          + New Project
        </Link>
      </div>
    </div>
  );
}
