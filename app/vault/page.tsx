'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import StatsCards from '@/components/StatsCards';
import ImportModal from '@/components/ImportModal';
import BatchToolbar from '@/components/BatchToolbar';
import VaultHealthCard from '@/components/validation/VaultHealthCard';
import VaultBranchPanel from '@/components/vault/VaultBranchPanel';
import VaultControls from '@/components/vault/VaultControls';
import VaultFilterBar from '@/components/vault/VaultFilterBar';
import VaultGrid from '@/components/vault/VaultGrid';
import TierInsights from '@/components/vault/TierInsights';
import VaultTopActions from '@/components/vault/VaultTopActions';
import { useCapsuleStore } from '@/store/capsuleStore';
import { useToast } from '@/contexts/ToastContext';
import { useVaultDashboardState } from '@/hooks/useVaultDashboardState';
import { exportCapsulesToDisk } from '@/lib/vault/exportCapsules';
import {
  fetchBranchCapsules,
  fetchBranchList,
  getVaultToken,
} from '@/lib/vault/capsuleBranchApi';
import type { BranchName } from '@/types/branch';
import { normalizeBranchName } from '@/types/branch';
import type { SovereignCapsule } from '@/types/capsule';

const CapsuleGraph = dynamic(() => import('@/components/CapsuleGraph'), { ssr: false });

export default function VaultDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { capsules, fetchCapsules, isLoading, error, removeCapsulesLocally } = useCapsuleStore();
  const initialBranch = useMemo(
    () => normalizeBranchName(searchParams.get('branch') ?? 'real') ?? 'real',
    [searchParams],
  );

  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [branch, setBranch] = useState<BranchName>(initialBranch);
  const [availableBranches, setAvailableBranches] = useState<BranchName[]>(['real']);
  const [realBaselineCapsules, setRealBaselineCapsules] = useState<SovereignCapsule[] | null>(null);
  const {
    view,
    searchQuery,
    sortOption,
    activeTypes,
    activeTiers,
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    toggleTierFilter,
    clearFilters,
    clearTierFilters,
    handleSearchChange,
    handleSortChange,
    handleViewChange,
    toggleSelection,
    selectAllVisible,
  } = useVaultDashboardState(capsules);

  useEffect(() => {
    setBranch(initialBranch);
  }, [initialBranch]);

  useEffect(() => {
    const token = getVaultToken();
    if (!token) {
      router.push('/login');
      return;
    }
    void fetchCapsules(branch);
  }, [branch, fetchCapsules, router]);

  useEffect(() => {
    const token = getVaultToken();
    if (!token) return;

    void fetchBranchList({ token }).then(({ response, data }) => {
      if (!response.ok || !data) return;
      const branches = data.branches
        .map((item) => item.name)
        .sort((left, right) => left.localeCompare(right));
      setAvailableBranches(branches);
      if (!branches.includes(branch)) {
        setBranch('real');
      }
    });
  }, [branch]);

  useEffect(() => {
    const token = getVaultToken();
    if (!token) return;

    if (branch === 'real') {
      setRealBaselineCapsules(null);
      return;
    }

    void fetchBranchCapsules('real', token).then(({ response, data }) => {
      if (!response.ok || !data) return;
      setRealBaselineCapsules(data);
    });
  }, [branch]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (branch === 'real') params.delete('branch');
    else params.set('branch', branch);

    const next = params.toString();
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    const current = searchParams.toString();
    const currentUrl = current ? `${pathname}?${current}` : pathname;
    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [branch, pathname, router, searchParams]);

  const handleBatchDeleteComplete = (deletedIds: string[]) => {
    removeCapsulesLocally(deletedIds);
  };

  const handleExport = async () => {
    try {
      await exportCapsulesToDisk(capsules);
      showToast('Export successful.', 'success');
    } catch {
      showToast('Export failed.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Initializing Cognitive Plane...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center font-bold text-red-500">
        System Error: {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <VaultTopActions
        onOpenImport={() => setIsImportOpen(true)}
        onExport={handleExport}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pt-16">
        <VaultBranchPanel
          branch={branch}
          availableBranches={availableBranches}
          onBranchChange={setBranch}
        />

        <StatsCards capsules={capsules} />
        <TierInsights
          capsules={capsules}
          branch={branch}
          baselineCapsules={realBaselineCapsules}
        />
        <VaultHealthCard />

        <VaultControls
          searchQuery={searchQuery}
          sortOption={sortOption}
          view={view}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onViewChange={handleViewChange}
        />

        <VaultFilterBar
          activeTypes={activeTypes}
          activeTiers={activeTiers}
          visibleCount={processedCapsules.length}
          totalCount={capsules.length}
          onClearFilters={clearFilters}
          onClearTiers={clearTierFilters}
          onToggleType={toggleTypeFilter}
          onToggleTier={toggleTierFilter}
        />

        <BatchToolbar
          selectedIds={selectedIds}
          allVisibleCapsules={processedCapsules}
          onClearSelection={resetSelection}
          onSelectAll={selectAllVisible}
          onBatchDeleteComplete={handleBatchDeleteComplete}
        />

        {view === 'grid' ? (
          <VaultGrid
            capsules={processedCapsules}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        ) : (
          <div
            className={`overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl ${
              graphFullscreen
                ? 'fixed inset-0 z-50 rounded-none'
                : 'relative h-[600px] w-full rounded-xl'
            }`}
          >
            <CapsuleGraph
              capsules={processedCapsules}
              onNodeClick={(id) => router.push(`/vault/capsule/${id}`)}
              isFullscreen={graphFullscreen}
              onToggleFullscreen={() => setGraphFullscreen(!graphFullscreen)}
            />
          </div>
        )}
      </main>

      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
