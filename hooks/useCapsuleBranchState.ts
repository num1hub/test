'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import {
  applyBranchMerge,
  deleteCapsuleRequest,
  fetchBranchList,
  fetchCapsuleBranchData,
  fetchCapsuleBranchResponse,
  fetchCapsuleDiff,
  getVaultToken,
  parseErrorMessage,
  postForkCapsule,
  postPromoteCapsule,
} from '@/lib/vault/capsuleBranchApi';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { BranchInfo, DiffResult, MergeResult } from '@/contracts/diff';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchName } from '@/types/branch';

function sortBranches(branches: BranchInfo[]): BranchInfo[] {
  return [...branches].sort((left, right) => {
    if (left.name === 'real') return -1;
    if (right.name === 'real') return 1;
    if (left.name === 'dream') return right.name === 'real' ? 1 : -1;
    if (right.name === 'dream') return left.name === 'real' ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export function useCapsuleBranchState(
  capsuleId: string,
  requestedBranch: BranchName,
) {
  const router = useRouter();
  const { showToast } = useToast();
  const deleteCapsuleLocally = useCapsuleStore((state) => state.deleteCapsuleLocally);
  const updateCapsuleLocally = useCapsuleStore((state) => state.updateCapsuleLocally);

  const [capsule, setCapsule] = useState<SovereignCapsule | null>(null);
  const [realCapsule, setRealCapsule] = useState<SovereignCapsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<BranchName>('real');
  const [availableBranches, setAvailableBranches] = useState<BranchInfo[]>([]);
  const [hasDreamBranch, setHasDreamBranch] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [mergePreview, setMergePreview] = useState<MergeResult | null>(null);
  const [isPreviewingMerge, setIsPreviewingMerge] = useState(false);
  const [isApplyingMerge, setIsApplyingMerge] = useState(false);

  const refreshBranches = useCallback(async (token: string) => {
    const { response, data } = await fetchBranchList({ token, capsuleId });
    if (!response.ok || !data) {
      setAvailableBranches([]);
      setHasDreamBranch(false);
      return;
    }

    const branches = sortBranches(data.branches);
    setAvailableBranches(branches);
    setHasDreamBranch(branches.some((branch) => branch.name === 'dream'));
  }, [capsuleId]);

  const fetchBranch = useCallback(
    async (branch: BranchName) => {
      const token = getVaultToken();
      if (!token) {
        setLoading(false);
        router.push('/login');
        return;
      }

      setLoading(true);
      setError('');
      setMergePreview(null);
      setDiff(null);
      setIsDiffOpen(false);

      try {
        const response = await fetchCapsuleBranchResponse(capsuleId, branch, token);

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.status === 404 && branch !== 'real') {
          showToast(`${branch} branch not found for this capsule.`, 'info');
          await refreshBranches(token);
          const baseline = await fetchCapsuleBranchData(capsuleId, 'real', token);
          if (!baseline.response.ok || !baseline.data) {
            throw new Error('Failed to fetch capsule.');
          }
          setCapsule(baseline.data);
          setRealCapsule(baseline.data);
          setCurrentBranch('real');
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Capsule not found in Cognitive Plane.');
          }
          throw new Error('Failed to fetch capsule.');
        }

        const data = (await response.json()) as SovereignCapsule;
        setCapsule(data);
        setCurrentBranch(branch);

        const baseline = await fetchCapsuleBranchData(capsuleId, 'real', token);
        if (baseline.response.ok && baseline.data) {
          setRealCapsule(baseline.data);
        }

        await refreshBranches(token);
      } catch (caughtError: unknown) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [capsuleId, refreshBranches, router, showToast],
  );

  useEffect(() => {
    void fetchBranch(requestedBranch);
  }, [fetchBranch, requestedBranch]);

  const handleRestoreComplete = useCallback(async () => {
    await fetchBranch('real');
  }, [fetchBranch]);

  const handleFork = async () => {
    try {
      const token = getVaultToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await postForkCapsule(capsuleId, token);
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to fork into Dream branch.'));
      }

      showToast('Dream branch instantiated successfully.', 'success');
      await fetchBranch('dream');
    } catch (caughtError: unknown) {
      showToast(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to fork into Dream branch.',
        'error',
      );
    }
  };

  const handlePreviewMerge = useCallback(async () => {
    if (currentBranch === 'real') {
      showToast('Select a non-real branch before previewing a merge.', 'info');
      return;
    }

    const token = getVaultToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsPreviewingMerge(true);
    try {
      const { response, data } = await applyBranchMerge(
        {
          sourceBranch: currentBranch,
          targetBranch: 'real',
          scopeType: 'capsule',
          scopeRootId: capsuleId,
          recursive: false,
          conflictResolution: 'manual',
          dryRun: true,
        },
        token,
      );

      if (!response.ok || !data) {
        throw new Error(await parseErrorMessage(response, 'Failed to preview merge.'));
      }

      setMergePreview(data);
      setDiff(data.diff);
      setIsDiffOpen(true);
      showToast(
        data.conflicts.length > 0
          ? `Preview found ${data.conflicts.length} conflict(s).`
          : 'Merge preview is ready.',
        data.conflicts.length > 0 ? 'info' : 'success',
      );
    } catch (caughtError: unknown) {
      showToast(
        caughtError instanceof Error ? caughtError.message : 'Failed to preview merge.',
        'error',
      );
    } finally {
      setIsPreviewingMerge(false);
    }
  }, [capsuleId, currentBranch, router, showToast]);

  const handleApplyMerge = useCallback(async () => {
    if (currentBranch === 'real') {
      showToast('Real is already the baseline branch.', 'info');
      return;
    }

    if (!mergePreview) {
      showToast('Run a merge preview before applying the branch.', 'info');
      return;
    }

    if (mergePreview.conflicts.length > 0) {
      setDiff(mergePreview.diff);
      setIsDiffOpen(true);
      showToast('Preview conflicts must be reviewed before merge apply.', 'error');
      return;
    }

    const actionLabel = currentBranch === 'dream' ? 'promote Dream into Real' : `apply "${currentBranch}" into Real`;
    if (!confirm(`This will ${actionLabel}. Proceed?`)) {
      return;
    }

    try {
      const token = getVaultToken();
      if (!token) {
        router.push('/login');
        return;
      }

      setIsApplyingMerge(true);

      if (currentBranch === 'dream') {
        const response = await postPromoteCapsule(capsuleId, token);
        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, 'Failed to promote branch.'));
        }

        const updatedReal = (await response.json()) as SovereignCapsule;
        updateCapsuleLocally(capsuleId, updatedReal);
        showToast('Dream promoted to Real baseline.', 'success');

        setCapsule(updatedReal);
        setRealCapsule(updatedReal);
        setCurrentBranch('real');
        setMergePreview(null);
        setDiff(null);
        setIsDiffOpen(false);
        await refreshBranches(token);
        return;
      }

      const { response, data } = await applyBranchMerge(
        {
          sourceBranch: currentBranch,
          targetBranch: 'real',
          scopeType: 'capsule',
          scopeRootId: capsuleId,
          recursive: false,
          conflictResolution: 'manual',
          dryRun: false,
        },
        token,
      );

      if (response.status === 409 && data) {
        setMergePreview(data);
        setDiff(data.diff);
        setIsDiffOpen(true);
        showToast('Merge blocked by conflicts. Review the preview diff.', 'error');
        return;
      }

      if (!response.ok || !data) {
        throw new Error(await parseErrorMessage(response, 'Failed to apply merge.'));
      }

      const baseline = await fetchCapsuleBranchData(capsuleId, 'real', token);
      if (baseline.response.ok && baseline.data) {
        setRealCapsule(baseline.data);
        updateCapsuleLocally(capsuleId, baseline.data);
      }

      setMergePreview(null);
      setDiff(null);
      setIsDiffOpen(false);
      await fetchBranch(currentBranch);
      showToast(`${currentBranch} merged into Real baseline.`, 'success');
    } catch (caughtError: unknown) {
      showToast(
        caughtError instanceof Error ? caughtError.message : 'Failed to apply merge.',
        'error',
      );
    } finally {
      setIsApplyingMerge(false);
    }
  }, [
    capsuleId,
    currentBranch,
    fetchBranch,
    mergePreview,
    refreshBranches,
    router,
    showToast,
    updateCapsuleLocally,
  ]);

  const handlePromote = useCallback(async () => {
    if (currentBranch === 'real') {
      showToast('Real is already the baseline branch.', 'info');
      return;
    }

    if (!mergePreview || mergePreview.sourceBranch !== currentBranch || mergePreview.targetBranch !== 'real') {
      await handlePreviewMerge();
      return;
    }

    if (mergePreview.conflicts.length > 0) {
      setDiff(mergePreview.diff);
      setIsDiffOpen(true);
      showToast('Preview conflicts must be reviewed before merge apply.', 'error');
      return;
    }

    await handleApplyMerge();
  }, [currentBranch, handleApplyMerge, handlePreviewMerge, mergePreview, showToast]);

  const handleViewDiff = async () => {
    if (currentBranch === 'real') {
      showToast('Select a non-real branch to inspect a diff.', 'info');
      return;
    }

    const token = getVaultToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const { response, data } = await fetchCapsuleDiff(capsuleId, 'real', currentBranch, token, false);
      if (!response.ok || !data) {
        throw new Error(await parseErrorMessage(response, 'Failed to load branch diff.'));
      }
      setDiff(data);
      setIsDiffOpen(true);
    } catch (caughtError: unknown) {
      showToast(
        caughtError instanceof Error ? caughtError.message : 'Failed to load diff.',
        'error',
      );
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `WARNING: You are about to permanently purge capsule '${capsuleId}' from disk. This action is irreversible. Proceed?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = getVaultToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await deleteCapsuleRequest(capsuleId, token);
      if (!response.ok) {
        throw new Error('Server rejected deletion request.');
      }

      deleteCapsuleLocally(capsuleId);
      showToast('Capsule purged successfully.', 'success');
      router.push('/vault');
    } catch (caughtError: unknown) {
      showToast(
        `Purge Failed: ${
          caughtError instanceof Error ? caughtError.message : 'Unknown error'
        }`,
        'error',
      );
      setIsDeleting(false);
    }
  };

  return {
    capsule,
    realCapsule,
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
  };
}
