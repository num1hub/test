'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BatchToolbar from '@/components/BatchToolbar';
import ProjectsFilters from '@/components/projects/ProjectsFilters';
import ProjectsGrid from '@/components/projects/ProjectsGrid';
import ProjectsHeader from '@/components/projects/ProjectsHeader';
import ProjectTree from '@/components/projects/ProjectTree';
import { useProjectsDashboardState } from '@/hooks/useProjectsDashboardState';
import { useCapsuleStore } from '@/store/capsuleStore';

function ProjectsLoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array.from({ length: 6 })].map((_, index) => (
            <div
              key={`project-skeleton-${index}`}
              className="h-56 animate-pulse rounded-xl border border-slate-800 bg-slate-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectsErrorState({ error }: { error: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-red-500">
      {error}
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { capsules, fetchCapsules, isLoading, error, removeCapsulesLocally } = useCapsuleStore();
  const {
    view,
    setView,
    search,
    setSearch,
    statusFilter,
    tierFilter,
    sortMode,
    setSortMode,
    selectedIds,
    projects,
    childCountMap,
    filteredProjects,
    filteredTree,
    toggleStatusFilter,
    clearStatusFilters,
    toggleTierFilter,
    clearTierFilters,
    toggleSelection,
    clearSelection,
    selectAllVisible,
  } = useProjectsDashboardState(capsules);

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    void fetchCapsules();
  }, [fetchCapsules, router]);

  const handleBatchDeleteComplete = (deletedIds: string[]) => {
    removeCapsulesLocally(deletedIds);
    clearSelection();
  };

  if (isLoading) return <ProjectsLoadingState />;
  if (error) return <ProjectsErrorState error={error} />;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProjectsHeader view={view} onViewChange={setView} />

        <ProjectsFilters
          search={search}
          onSearchChange={setSearch}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          statusFilter={statusFilter}
          tierFilter={tierFilter}
          onToggleStatus={toggleStatusFilter}
          onClearStatuses={clearStatusFilters}
          onToggleTier={toggleTierFilter}
          onClearTiers={clearTierFilters}
          visibleCount={filteredProjects.length}
          totalCount={projects.length}
        />

        {view === 'grid' && (
          <BatchToolbar
            selectedIds={selectedIds}
            allVisibleCapsules={filteredProjects}
            onClearSelection={clearSelection}
            onSelectAll={selectAllVisible}
            onBatchDeleteComplete={handleBatchDeleteComplete}
          />
        )}

        {view === 'grid' ? (
          <ProjectsGrid
            projects={filteredProjects}
            childCountMap={childCountMap}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
          />
        ) : (
          <ProjectTree tree={filteredTree} />
        )}
      </div>
    </div>
  );
}
