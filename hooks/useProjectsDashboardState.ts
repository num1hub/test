'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { buildProjectTree, getAllProjects } from '@/lib/projectUtils';
import type { SovereignCapsule } from '@/types/capsule';

export const PROJECT_STATUSES = [
  'draft',
  'active',
  'sovereign',
  'frozen',
  'archived',
  'quarantined',
  'legacy',
] as const;

export type ProjectsViewMode = 'grid' | 'tree';
export type ProjectsSortMode = 'name' | 'status' | 'date-new' | 'date-old';

export function useProjectsDashboardState(capsules: SovereignCapsule[]) {
  const [view, setView] = useState<ProjectsViewMode>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<ProjectsSortMode>('name');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);

  const projects = useMemo(() => getAllProjects(capsules), [capsules]);

  const childCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => {
      (project.recursive_layer.links ?? []).forEach((link) => {
        if (link.relation_type !== 'part_of') return;
        counts.set(link.target_id, (counts.get(link.target_id) ?? 0) + 1);
      });
    });
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();

    return [...projects]
      .filter((project) => {
        const displayName = (project.metadata.name ?? project.metadata.capsule_id).toLowerCase();
        const summary = (project.neuro_concentrate.summary ?? '').toLowerCase();

        const matchesSearch =
          !lowerSearch ||
          displayName.includes(lowerSearch) ||
          summary.includes(lowerSearch) ||
          project.metadata.capsule_id.toLowerCase().includes(lowerSearch);

        const matchesStatus =
          statusFilter.size === 0 || statusFilter.has(project.metadata.status ?? '');

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const nameA = (a.metadata.name ?? a.metadata.capsule_id).toLowerCase();
        const nameB = (b.metadata.name ?? b.metadata.capsule_id).toLowerCase();

        switch (sortMode) {
          case 'status':
            return (a.metadata.status ?? '').localeCompare(b.metadata.status ?? '');
          case 'date-new':
            return (
              new Date(b.metadata.created_at ?? '').getTime() -
              new Date(a.metadata.created_at ?? '').getTime()
            );
          case 'date-old':
            return (
              new Date(a.metadata.created_at ?? '').getTime() -
              new Date(b.metadata.created_at ?? '').getTime()
            );
          case 'name':
          default:
            return nameA.localeCompare(nameB);
        }
      });
  }, [debouncedSearch, projects, sortMode, statusFilter]);

  const filteredTree = useMemo(() => buildProjectTree(filteredProjects), [filteredProjects]);

  const toggleStatusFilter = (status: string) => {
    setSelectedIds(new Set());
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const clearStatusFilters = () => {
    setStatusFilter(new Set());
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredProjects.map((project) => project.metadata.capsule_id)));
  };

  return {
    view,
    setView,
    search,
    setSearch,
    statusFilter,
    sortMode,
    setSortMode,
    selectedIds,
    projects,
    childCountMap,
    filteredProjects,
    filteredTree,
    toggleStatusFilter,
    clearStatusFilters,
    toggleSelection,
    clearSelection,
    selectAllVisible,
  };
}
