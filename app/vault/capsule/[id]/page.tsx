'use client';

import { Suspense, use, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CapsuleDetailView from '@/components/CapsuleDetailView';
import DiffViewer from '@/components/DiffViewer';
import VersionHistoryModal from '@/components/VersionHistoryModal';
import ValidationPanel from '@/components/validation/ValidationPanel';
import CapsuleBranchMergePanel from '@/components/vault/detail/CapsuleBranchMergePanel';
import {
  CapsuleDetailEmptyState,
  CapsuleDetailErrorState,
  CapsuleDetailLoadingState,
} from '@/components/vault/detail/CapsuleDetailState';
import CapsuleDetailToolbar from '@/components/vault/detail/CapsuleDetailToolbar';
import { useCapsuleVisualPreferences } from '@/hooks/useCapsuleVisualPreferences';
import { useCapsuleBranchState } from '@/hooks/useCapsuleBranchState';
import { useCapsuleValidation } from '@/hooks/useCapsuleValidation';
import { isBranchType, type BranchName } from '@/types/branch';

function CapsuleDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const capsuleId = resolvedParams.id;
  const { visualProfile } = useCapsuleVisualPreferences();
  const searchParams = useSearchParams();
  const requestedBranch = useMemo<BranchName>(() => {
    const raw = searchParams.get('branch');
    return isBranchType(raw) ? raw : 'real';
  }, [searchParams]);

  const {
    capsule,
    loading,
    error,
    isDeleting,
    isHistoryOpen,
    currentBranch,
    availableBranches,
    hasDreamBranch,
    isDiffOpen,
    diff,
    mergePreview,
    isPreviewingMerge,
    isApplyingMerge,
    fetchBranch,
    setIsHistoryOpen,
    setIsDiffOpen,
    handleRestoreComplete,
    handleFork,
    handlePromote,
    handlePreviewMerge,
    handleApplyMerge,
    handleViewDiff,
    handleDelete,
  } = useCapsuleBranchState(capsuleId, requestedBranch);

  const { validationResult, validationLoading } = useCapsuleValidation(capsuleId, capsule);

  if (loading) return <CapsuleDetailLoadingState />;
  if (error) return <CapsuleDetailErrorState error={error} />;
  if (!capsule) return <CapsuleDetailEmptyState />;

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <CapsuleDetailToolbar
          capsuleId={capsuleId}
          currentBranch={currentBranch}
          hasDreamBranch={hasDreamBranch}
          availableBranches={availableBranches.map((branch) => branch.name)}
          isDeleting={isDeleting}
          onSwitchBranch={(branch) => void fetchBranch(branch)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onFork={handleFork}
          onPromote={handlePromote}
          onViewDiff={handleViewDiff}
          onDelete={handleDelete}
        />

        <div
          className={`rounded-xl p-1 transition-colors duration-500 ${
            currentBranch === 'dream'
              ? 'border border-violet-900/50 bg-violet-900/20 shadow-lg shadow-violet-900/10'
              : currentBranch !== 'real'
                ? 'border border-sky-900/50 bg-sky-900/10 shadow-lg shadow-sky-900/10'
                : ''
          }`}
        >
          <CapsuleDetailView capsule={capsule} visualProfile={visualProfile} />
        </div>

        <ValidationPanel
          result={validationResult}
          loading={validationLoading}
          title={`Branch Validation (${currentBranch})`}
        />

        <CapsuleBranchMergePanel
          branch={currentBranch}
          preview={mergePreview}
          isPreviewing={isPreviewingMerge}
          isApplying={isApplyingMerge}
          onPreview={() => void handlePreviewMerge()}
          onApply={() => void handleApplyMerge()}
          onOpenPreview={() => {
            if (!mergePreview) return;
            setIsDiffOpen(true);
          }}
        />

        <VersionHistoryModal
          capsuleId={capsuleId}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestoreComplete={handleRestoreComplete}
        />

        {isDiffOpen && diff && (
          <DiffViewer
            diff={diff}
            isOpen={isDiffOpen}
            onClose={() => setIsDiffOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function CapsuleDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CapsuleDetailLoadingState />}>
      <CapsuleDetailPageContent {...props} />
    </Suspense>
  );
}
