'use client';

import SearchBar from '@/components/SearchBar';
import type { SortOption } from '@/utils/sortUtils';

export type VaultViewMode = 'grid' | '2d';

interface VaultControlsProps {
  searchQuery: string;
  sortOption: SortOption;
  view: VaultViewMode;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onViewChange: (value: VaultViewMode) => void;
}

export default function VaultControls({
  searchQuery,
  sortOption,
  view,
  onSearchChange,
  onSortChange,
  onViewChange,
}: VaultControlsProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm md:flex-row md:items-center">
      <div className="w-full md:w-1/2">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
      </div>

      <div className="flex w-full items-center space-x-4 md:w-auto">
        <select
          value={sortOption}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 focus:border-amber-500 focus:outline-none"
        >
          <option value="date-new">Newest First</option>
          <option value="date-old">Oldest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="type">Group by Type</option>
        </select>

        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'grid'
                ? 'bg-slate-800 text-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => onViewChange('2d')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === '2d'
                ? 'bg-slate-800 text-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D Graph
          </button>
        </div>
      </div>
    </div>
  );
}
