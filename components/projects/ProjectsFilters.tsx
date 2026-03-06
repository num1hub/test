'use client';

import SearchBar from '@/components/SearchBar';
import {
  PROJECT_STATUSES,
  type ProjectsSortMode,
} from '@/hooks/useProjectsDashboardState';

interface ProjectsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortMode: ProjectsSortMode;
  onSortModeChange: (value: ProjectsSortMode) => void;
  statusFilter: Set<string>;
  onToggleStatus: (status: string) => void;
  onClearStatuses: () => void;
  visibleCount: number;
  totalCount: number;
}

export default function ProjectsFilters({
  search,
  onSearchChange,
  sortMode,
  onSortModeChange,
  statusFilter,
  onToggleStatus,
  onClearStatuses,
  visibleCount,
  totalCount,
}: ProjectsFiltersProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search project names, summaries, or IDs..."
          />
        </div>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as ProjectsSortMode)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-amber-500 focus:outline-none"
        >
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="date-new">Sort: Newest</option>
          <option value="date-old">Sort: Oldest</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onClearStatuses}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
            statusFilter.size === 0
              ? 'border-slate-200 bg-slate-200 text-slate-900'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
          }`}
        >
          All statuses
        </button>
        {PROJECT_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => onToggleStatus(status)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter.has(status)
                ? 'border-amber-600 bg-amber-900/20 text-amber-300'
                : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="text-sm text-slate-500">
        Showing <strong className="text-slate-300">{visibleCount}</strong> of {totalCount} projects
      </div>
    </>
  );
}
