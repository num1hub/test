'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import {
  deleteCapsuleRequest,
  fetchCapsuleBranchData,
  fetchCapsuleBranchResponse,
  getVaultToken,
  parseErrorMessage,
  postForkCapsule,
  postPromoteCapsule,
} from '@/lib/vault/capsuleBranchApi';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchType } from '@/types/branch';

export function useCapsuleBranchState(
  capsuleId: string,
  requestedBranch: BranchType,
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
  const [currentBranch, setCurrentBranch] = useState<BranchType>('real');
  const [hasDreamBranch, setHasDreamBranch] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  const fetchBranch = useCallback(
    async (branch: BranchType) => {
      const token = getVaultToken();
      if (!token) {
        setLoading(false);
        router.push('/login');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetchCapsuleBranchResponse(capsuleId, branch, token);

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (response.status === 404 && branch === 'dream') {
          setHasDreamBranch(false);
          showToast('Dream branch not found.', 'info');

          const realResponse = await fetchCapsuleBranchResponse(capsuleId, 'real', token);
          if (!realResponse.ok) throw new Error('Failed to fetch capsule.');

          const realData = (await realResponse.json()) as SovereignCapsule;
          setCapsule(realData);
          setRealCapsule(realData);
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

        if (branch === 'real') {
          setRealCapsule(data);
          const dreamResponse = await fetchCapsuleBranchResponse(capsuleId, 'dream', token);
          setHasDreamBranch(dreamResponse.ok);
          return;
        }

        setHasDreamBranch(true);
        const { response: baselineResponse, data: baseline } = await fetchCapsuleBranchData(
          capsuleId,
          'real',
          token,
        );
        if (baselineResponse.ok && baseline) {
          setRealCapsule(baseline);
        }
      } catch (caughtError: unknown) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [capsuleId, router, showToast],
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

  const handlePromote = async () => {
    if (!confirm('This will overwrite the Real baseline with current Dream state. Proceed?')) {
      return;
    }

    try {
      const token = getVaultToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await postPromoteCapsule(capsuleId, token);

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to promote branch.'));
      }

      const updatedReal = (await response.json()) as SovereignCapsule;
      updateCapsuleLocally(capsuleId, updatedReal);
      showToast('Dream promoted to Real baseline.', 'success');

      setHasDreamBranch(false);
      setCurrentBranch('real');
      setCapsule(updatedReal);
      setRealCapsule(updatedReal);
      setIsDiffOpen(false);
    } catch (caughtError: unknown) {
      showToast(
        caughtError instanceof Error ? caughtError.message : 'Failed to promote branch.',
        'error',
      );
    }
  };

  const handleViewDiff = () => {
    if (!realCapsule || !capsule || currentBranch !== 'dream') {
      showToast('Switch to Dream branch to inspect branch diff.', 'info');
      return;
    }

    setIsDiffOpen(true);
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
    hasDreamBranch,
    isDiffOpen,
    fetchBranch,
    setIsHistoryOpen,
    setIsDiffOpen,
    handleRestoreComplete,
    handleFork,
    handlePromote,
    handleViewDiff,
    handleDelete,
  };
}
