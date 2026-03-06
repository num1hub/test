'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import StatsCards from '@/components/StatsCards';
import ImportModal from '@/components/ImportModal';
import BatchToolbar from '@/components/BatchToolbar';
import VaultHealthCard from '@/components/validation/VaultHealthCard';
import VaultControls from '@/components/vault/VaultControls';
import VaultFilterBar from '@/components/vault/VaultFilterBar';
import VaultGrid from '@/components/vault/VaultGrid';
import VaultTopActions from '@/components/vault/VaultTopActions';
import { useCapsuleStore } from '@/store/capsuleStore';
import { useToast } from '@/contexts/ToastContext';
import { useVaultDashboardState } from '@/hooks/useVaultDashboardState';
import { exportCapsulesToDisk } from '@/lib/vault/exportCapsules';

const CapsuleGraph = dynamic(() => import('@/components/CapsuleGraph'), { ssr: false });

export default function VaultDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { capsules, fetchCapsules, isLoading, error, removeCapsulesLocally } = useCapsuleStore();

  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const {
    view,
    searchQuery,
    sortOption,
    activeTypes,
    selectedIds,
    processedCapsules,
    resetSelection,
    toggleTypeFilter,
    clearFilters,
    handleSearchChange,
    handleSortChange,
    handleViewChange,
    toggleSelection,
    selectAllVisible,
  } = useVaultDashboardState(capsules);

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCapsules();
  }, [fetchCapsules, router]);

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
        <StatsCards capsules={capsules} />
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
          visibleCount={processedCapsules.length}
          totalCount={capsules.length}
          onClearFilters={clearFilters}
          onToggleType={toggleTypeFilter}
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
