'use client';

import Link from 'next/link';
import { CheckSquare, Square } from 'lucide-react';
import type { ProjectCapsule } from '@/types/project';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-600',
  active: 'bg-green-600',
  sovereign: 'bg-amber-600',
  frozen: 'bg-blue-600',
  archived: 'bg-gray-600',
  quarantined: 'bg-red-600',
  legacy: 'bg-purple-600',
};

interface ProjectCardProps {
  project: ProjectCapsule;
  childCount?: number;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function ProjectCard({
  project,
  childCount,
  selected = false,
  onToggleSelect,
}: ProjectCardProps) {
  const { metadata, neuro_concentrate } = project;
  const displayName = metadata.name ?? metadata.capsule_id;
  const semanticHash = typeof metadata.semantic_hash === 'string' ? metadata.semantic_hash : 'unknown-hash';

  return (
    <div className="group relative h-full">
      {onToggleSelect && (
        <button
          type="button"
          aria-label={`Select ${displayName}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute right-3 top-3 z-10 rounded-md p-1 transition-all ${
            selected
              ? 'bg-amber-500 text-slate-900 opacity-100'
              : 'border border-slate-600 bg-slate-800/80 text-slate-300 opacity-0 group-hover:opacity-100'
          }`}
        >
          {selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>
      )}

      <Link href={`/projects/${encodeURIComponent(metadata.capsule_id)}`} className="block h-full">
        <div
          className={`h-full rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/20 ${
            selected ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="mb-3 flex items-start justify-between">
            <span
              className={`text-xs font-mono px-2 py-1 rounded text-white ${
                STATUS_COLORS[metadata.status ?? ''] ?? 'bg-slate-600'
              }`}
            >
              {metadata.status}
            </span>
            {childCount !== undefined && (
              <span className="text-xs text-slate-500">
                {childCount} sub-project{childCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <h3 className="mb-2 break-words text-lg font-bold text-slate-100 transition-colors group-hover:text-amber-500">
            {displayName}
          </h3>
          <p className="line-clamp-3 text-sm text-slate-400">
            {neuro_concentrate?.summary || 'No summary available.'}
          </p>

          <div className="mt-4 flex justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
            <span className="font-mono break-all mr-2">{metadata.capsule_id}</span>
            <span className="font-mono shrink-0">{semanticHash.slice(0, 12)}...</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
