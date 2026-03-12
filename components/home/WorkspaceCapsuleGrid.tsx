'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CapsuleCard from '@/components/CapsuleCard';
import SearchBar from '@/components/SearchBar';
import WorkspaceCapsuleIndex from '@/components/home/WorkspaceCapsuleIndex';
import WorkspaceGraphSearchPanel from '@/components/home/WorkspaceGraphSearchPanel';
import WorkspaceRefineMenu from '@/components/home/WorkspaceRefineMenu';
import WorkspaceSelectionBar from '@/components/home/WorkspaceSelectionBar';
import WorkspaceVisualLegend from '@/components/home/WorkspaceVisualLegend';
import {
  processVaultDashboardCapsules,
  useVaultDashboardState,
} from '@/hooks/useVaultDashboardState';
import { useCapsuleVisualPreferences } from '@/hooks/useCapsuleVisualPreferences';
import { exportCapsulesAsSeparateFiles, exportCapsulesToDisk } from '@/lib/vault/exportCapsules';
import type { SovereignCapsule } from '@/types/capsule';
import { WORKSPACE_SORT_LABELS } from '@/components/home/workspaceRefineConfig';

type WorkspaceBranch = 'real' | 'dream';
type WorkspaceViewMode = 'grid' | '2d' | 'list';

const CapsuleGraph = dynamic(() => import('@/components/CapsuleGraph'), { ssr: false });

export default function WorkspaceCapsuleGrid({
  ownerLabel = 'Operator',
  ownerProfileId = 'capsule.person.egor-n1.v1',
}: {
  ownerLabel?: string;
  ownerProfileId?: string;
}) {
  const router = useRouter();
  const workspaceViewStorageKey = `workspace-view-mode:${ownerProfileId}`;
  const [capsules, setCapsules] = useState<SovereignCapsule[]>([]);
  const [branch, setBranch] = useState<WorkspaceBranch>('real');
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [manualGraphFocusNodeId, setManualGraphFocusNodeId] = useState<string | null>(null);
  const [graphFocusToken, setGraphFocusToken] = useState(0);
  const [graphSelectNodeId, setGraphSelectNodeId] = useState<string | null>(null);
  const [graphSelectToken, setGraphSelectToken] = useState(0);
  const [graphFitRequestToken, setGraphFitRequestToken] = useState(0);
  const [graphClearSelectionToken, setGraphClearSelectionToken] = useState(0);
  const previousGraphQueryRef = useRef('');
  const lastExactFocusKeyRef = useRef<string | null>(null);
  const suppressNextGraphFitRef = useRef(false);
  const {
    searchQuery,
    sortOption,
    activeTypes,
    activeTiers,
    activeSubtypes,
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    toggleTierFilter,
    toggleSubtypeFilter,
    clearFilters,
    clearTypeFilters,
    clearTierFilters,
    clearSubtypeFilters,
    handleSearchChange,
    handleSortChange,
    toggleSelection,
    selectAllVisible,
  } = useVaultDashboardState(capsules, {
    selectionStorageKey: `workspace-grid-selection:${branch}`,
  });
  const {
    visualProfile,
    graphQuality,
    setVisualProfile,
    setGraphQuality,
    resolvedVisualProfile: activeVisualProfile,
    resolvedGraphQuality: activeGraphQuality,
  } = useCapsuleVisualPreferences(ownerProfileId);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedViewMode = window.localStorage.getItem(workspaceViewStorageKey);
    if (storedViewMode === 'grid' || storedViewMode === '2d' || storedViewMode === 'list') {
      setViewMode(storedViewMode);
    }
  }, [workspaceViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(workspaceViewStorageKey, viewMode);
  }, [viewMode, workspaceViewStorageKey]);

  useEffect(() => {
    let active = true;

    async function loadCapsules() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (branch === 'dream') {
          params.set('branch', branch);
        }

        const response = await fetch(`/api/capsules${params.toString() ? `?${params.toString()}` : ''}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (response.status === 401) {
          router.push('/');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load capsules.');
        }

        const data = (await response.json()) as SovereignCapsule[];
        if (active) {
          setCapsules(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load capsules.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCapsules();

    return () => {
      active = false;
    };
  }, [branch, router]);

  const currentSortLabel = useMemo(
    () => WORKSPACE_SORT_LABELS.get(sortOption) ?? 'Newest',
    [sortOption],
  );
  const capsuleById = useMemo(
    () =>
      new Map(
        capsules.map((capsule) => [capsule.metadata.capsule_id, capsule] as const),
      ),
    [capsules],
  );
  const graphCapsules = useMemo(
    () =>
      processVaultDashboardCapsules(capsules, {
        activeTypes,
        activeTiers,
        activeSubtypes,
        sortOption,
      }),
    [activeSubtypes, activeTiers, activeTypes, capsules, sortOption],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const graphSearchMatches = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    return graphCapsules.filter((capsule) => {
      const name = typeof capsule.metadata.name === 'string' ? capsule.metadata.name : '';
      const summary =
        typeof capsule.neuro_concentrate.summary === 'string'
          ? capsule.neuro_concentrate.summary
          : '';
      return (
        capsule.metadata.capsule_id.toLowerCase().includes(normalizedSearchQuery) ||
        name.toLowerCase().includes(normalizedSearchQuery) ||
        summary.toLowerCase().includes(normalizedSearchQuery)
      );
    });
  }, [graphCapsules, normalizedSearchQuery]);
  const exactGraphMatchId = useMemo(() => {
    if (!normalizedSearchQuery) {
      return null;
    }

    for (const capsule of graphSearchMatches) {
      if (capsule.metadata.capsule_id.toLowerCase() === normalizedSearchQuery) {
        return capsule.metadata.capsule_id;
      }
    }

    for (const capsule of graphSearchMatches) {
      const name = typeof capsule.metadata.name === 'string' ? capsule.metadata.name : '';
      if (name.toLowerCase() === normalizedSearchQuery) {
        return capsule.metadata.capsule_id;
      }
    }

    return null;
  }, [graphSearchMatches, normalizedSearchQuery]);
  const graphSearchSuggestions = useMemo(
    () =>
      graphSearchMatches.slice(0, 8).map((capsule) => ({
        capsuleId: capsule.metadata.capsule_id,
        title: capsule.metadata.name || capsule.metadata.capsule_id,
        subtitle: capsule.neuro_concentrate.summary,
      })),
    [graphSearchMatches],
  );
  const graphSearchFocusNodeId = manualGraphFocusNodeId ?? exactGraphMatchId;
  const selectedCapsules = useMemo(
    () =>
      Array.from(selectedIds)
        .map((capsuleId) => capsuleById.get(capsuleId))
        .filter((capsule): capsule is SovereignCapsule => Boolean(capsule)),
    [capsuleById, selectedIds],
  );
  const allVisibleSelected =
    processedCapsules.length > 0 &&
    processedCapsules.every((capsule) => selectedIds.has(capsule.metadata.capsule_id));
  const graphModeMatchCount = useMemo(() => {
    if (!normalizedSearchQuery) {
      return graphCapsules.length;
    }

    return graphSearchMatches.length;
  }, [graphCapsules.length, graphSearchMatches.length, normalizedSearchQuery]);

  useEffect(() => {
    if (viewMode !== '2d') {
      previousGraphQueryRef.current = normalizedSearchQuery;
      return;
    }

    const previousQuery = previousGraphQueryRef.current;

    if (previousQuery !== normalizedSearchQuery) {
      setManualGraphFocusNodeId(null);
    }

    if (previousQuery && !normalizedSearchQuery) {
      if (suppressNextGraphFitRef.current) {
        suppressNextGraphFitRef.current = false;
      } else {
        setGraphFitRequestToken((current) => current + 1);
      }
      lastExactFocusKeyRef.current = null;
    }

    previousGraphQueryRef.current = normalizedSearchQuery;
  }, [normalizedSearchQuery, viewMode]);

  useEffect(() => {
    if (viewMode !== '2d' || !exactGraphMatchId) {
      if (!exactGraphMatchId) {
        lastExactFocusKeyRef.current = null;
      }
      return;
    }

    const exactFocusKey = `${normalizedSearchQuery}:${exactGraphMatchId}`;
    if (lastExactFocusKeyRef.current === exactFocusKey) {
      return;
    }

    lastExactFocusKeyRef.current = exactFocusKey;
    setGraphFocusToken((current) => current + 1);
  }, [exactGraphMatchId, normalizedSearchQuery, viewMode]);

  const handleWorkspaceSearchChange = useCallback((value: string) => {
    if (viewMode === '2d') {
      setManualGraphFocusNodeId(null);
      setGraphSelectNodeId(null);
      setGraphClearSelectionToken((current) => current + 1);
    }
    handleSearchChange(value);
  }, [handleSearchChange, viewMode]);

  const handleGraphSearchClear = useCallback(() => {
    setManualGraphFocusNodeId(null);
    setGraphSelectNodeId(null);
    setGraphClearSelectionToken((current) => current + 1);
    handleSearchChange('');
  }, [handleSearchChange]);

  const handleGraphMatchHover = useCallback((capsuleId: string) => {
    setManualGraphFocusNodeId(capsuleId);
    setGraphSelectNodeId(null);
    setGraphClearSelectionToken((current) => current + 1);
    setGraphFocusToken((current) => current + 1);
  }, []);

  const handleGraphMatchSelect = useCallback((capsuleId: string) => {
    setManualGraphFocusNodeId(capsuleId);
    setGraphSelectNodeId(capsuleId);
    setGraphSelectToken((current) => current + 1);
    suppressNextGraphFitRef.current = true;
    handleSearchChange('');
  }, [handleSearchChange]);

  function renderGraphSearchPanel() {
    return (
      <WorkspaceGraphSearchPanel
        value={searchQuery}
        onChange={handleWorkspaceSearchChange}
        matches={graphSearchSuggestions}
        onHoverMatch={handleGraphMatchHover}
        onSelectMatch={handleGraphMatchSelect}
        onClearSearch={handleGraphSearchClear}
      />
    );
  }

  async function handleExportBundle() {
    const activeExportBranch = branch === 'dream' ? 'dream' : 'real';
    await exportCapsulesToDisk(selectedCapsules, { activeBranch: activeExportBranch });
  }

  async function handleExportSeparateFiles() {
    const activeExportBranch = branch === 'dream' ? 'dream' : 'real';
    await exportCapsulesAsSeparateFiles(selectedCapsules, { activeBranch: activeExportBranch });
  }

  function getCapsuleHref(capsuleId: string) {
    return `/vault/capsule/${encodeURIComponent(capsuleId)}${
      branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`
    }`;
  }

  return (
    <section className="mt-4 flex-1 sm:mt-5 md:mt-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-3 shadow-2xl sm:p-4 md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="w-full xl:max-w-3xl">
              {viewMode === 'grid' || viewMode === 'list' ? (
                <SearchBar
                  value={searchQuery}
                  onChange={handleWorkspaceSearchChange}
                  placeholder="Search capsules..."
                />
              ) : (
                renderGraphSearchPanel()
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1">
                {([
                  { value: 'grid', label: 'Grid' },
                  { value: 'list', label: 'Index' },
                  { value: '2d', label: '2D Graph' },
                ] as const).map((candidate) => {
                  const active = candidate.value === viewMode;

                  return (
                    <button
                      key={candidate.value}
                      type="button"
                      onClick={() => setViewMode(candidate.value)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {candidate.label}
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-950/70 p-1">
                {(['real', 'dream'] as const).map((candidate) => {
                  const active = candidate === branch;

                  return (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => {
                        resetSelection();
                        setBranch(candidate);
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {candidate === 'real' ? 'Real' : 'Dream'}
                    </button>
                  );
                })}
              </div>

              <WorkspaceRefineMenu
                sortOption={sortOption}
                activeTypes={activeTypes}
                activeTiers={activeTiers}
                activeSubtypes={activeSubtypes}
                visualProfile={visualProfile}
                graphQuality={graphQuality}
                onSelectSort={handleSortChange}
                onToggleType={toggleTypeFilter}
                onClearTypes={clearTypeFilters}
                onToggleTier={toggleTierFilter}
                onClearTiers={clearTierFilters}
                onToggleSubtype={toggleSubtypeFilter}
                onClearSubtypes={clearSubtypeFilters}
                onSelectVisualProfile={setVisualProfile}
                onSelectGraphQuality={setGraphQuality}
                onResetAll={() => {
                  clearFilters();
                  handleSortChange('date-new');
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500 sm:gap-3">
          <span>{branch === 'real' ? 'Real Capsules' : 'Dream Capsules'}</span>
          <span className="text-slate-700">•</span>
          <span>
            {viewMode === 'grid'
              ? 'Grid View'
              : viewMode === 'list'
                ? 'Index View'
                : '2D Graph View'}
          </span>
          <span className="text-slate-700">•</span>
          <span>Sort {currentSortLabel}</span>
          <span className="text-slate-700">•</span>
          <span>{viewMode === '2d' ? graphCapsules.length : processedCapsules.length} visible</span>
          <span className="text-slate-700">•</span>
          <span>{activeVisualProfile.label} profile</span>
          <span className="text-slate-700">•</span>
          <span>{activeGraphQuality.label} graph</span>
          {viewMode === 'grid' && searchQuery.trim() ? (
            <>
              <span className="text-slate-700">•</span>
              <span>{capsules.length} total</span>
            </>
          ) : null}
          {viewMode === 'list' && searchQuery.trim() ? (
            <>
              <span className="text-slate-700">•</span>
              <span>{capsules.length} total</span>
            </>
          ) : null}
          {viewMode === '2d' && searchQuery.trim() ? (
            <>
              <span className="text-slate-700">•</span>
              <span>{graphModeMatchCount} match{graphModeMatchCount === 1 ? '' : 'es'}</span>
            </>
          ) : null}
        </div>

        <WorkspaceVisualLegend
          capsules={viewMode === '2d' ? graphCapsules : processedCapsules}
          ownerLabel={ownerLabel}
          visualProfile={visualProfile}
          graphQuality={graphQuality}
        />

        <div className="mt-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 py-20 text-center text-sm text-slate-500">
              Loading capsules...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 py-20 text-center text-sm text-red-200">
              {error}
            </div>
          ) : viewMode === 'grid' && processedCapsules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 py-20 text-center text-sm text-slate-500">
              No capsules match the current search.
            </div>
          ) : viewMode === '2d' && graphCapsules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 py-20 text-center text-sm text-slate-500">
              No capsules match the current filters.
            </div>
          ) : viewMode === 'list' && processedCapsules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 py-20 text-center text-sm text-slate-500">
              No capsules match the current search.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {selectedCapsules.length > 0 ? (
                <WorkspaceSelectionBar
                  selectedCount={selectedCapsules.length}
                  visibleCount={processedCapsules.length}
                  allVisibleSelected={allVisibleSelected}
                  onSelectAllVisible={selectAllVisible}
                  onClearSelection={resetSelection}
                  onExportBundle={() => {
                    void handleExportBundle();
                  }}
                  onExportSeparateFiles={() => {
                    void handleExportSeparateFiles();
                  }}
                />
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {processedCapsules.map((capsule) => (
                  <CapsuleCard
                    key={capsule.metadata.capsule_id}
                    capsule={capsule}
                    href={getCapsuleHref(capsule.metadata.capsule_id)}
                    visualProfile={visualProfile}
                    showValidationBadge={false}
                    selectable
                    selected={selectedIds.has(capsule.metadata.capsule_id)}
                    onToggleSelect={() => toggleSelection(capsule.metadata.capsule_id)}
                  />
                ))}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <WorkspaceCapsuleIndex
              capsules={processedCapsules}
              getCapsuleHref={getCapsuleHref}
              visualProfile={visualProfile}
            />
          ) : (
            <div
              className={`overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${
                graphFullscreen
                  ? 'fixed inset-0 z-50 rounded-none'
                  : 'relative h-[560px] rounded-2xl sm:h-[640px] xl:h-[720px]'
              }`}
            >
            <CapsuleGraph
              capsules={graphCapsules}
              activeBranch={branch}
              visualProfile={visualProfile}
              graphQuality={graphQuality}
              getNodeHref={getCapsuleHref}
              isFullscreen={graphFullscreen}
              onToggleFullscreen={() => setGraphFullscreen((current) => !current)}
                searchQuery={searchQuery}
                searchMatchNodeIds={graphSearchMatches.map((capsule) => capsule.metadata.capsule_id)}
                searchFocusNodeId={graphSearchFocusNodeId}
                searchFocusToken={graphFocusToken}
                searchSelectNodeId={graphSelectNodeId}
                searchSelectToken={graphSelectToken}
                fitRequestToken={graphFitRequestToken}
                clearSelectionToken={graphClearSelectionToken}
                searchOverlay={renderGraphSearchPanel()}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
