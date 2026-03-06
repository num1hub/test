'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { logClientAction } from '@/lib/clientActivity';
import type { SovereignCapsule } from '@/types/capsule';

interface BatchToolbarProps {
  selectedIds: Set<string>;
  allVisibleCapsules: SovereignCapsule[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBatchDeleteComplete: (deletedIds: string[]) => void;
}

type IconProps = { className?: string };

function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 21V9" />
      <path d="m17 16-5 5-5-5" />
      <path d="M20 4H4" />
    </svg>
  );
}

function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckSquareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export default function BatchToolbar({
  selectedIds,
  allVisibleCapsules,
  onClearSelection,
  onSelectAll,
  onBatchDeleteComplete,
}: BatchToolbarProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCount = selectedIds.size;
  const totalCount = allVisibleCapsules.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  const handleExportSelected = () => {
    try {
      const selectedCapsules = allVisibleCapsules.filter((capsule) =>
        selectedIds.has(capsule.metadata.capsule_id),
      );
      const dataStr = JSON.stringify(selectedCapsules, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `n1hub_batch_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      void logClientAction('export', {
        message: `Batch exported ${selectedCount} capsules.`,
        count: selectedCount,
      });

      showToast(`Exported ${selectedCount} capsules successfully.`, 'success');
      onClearSelection();
    } catch {
      showToast('Batch export failed.', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !window.confirm(
        `WARNING: You are about to permanently delete ${selectedCount} capsules. This action cannot be undone. Proceed?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('n1hub_vault_token');
      const res = await fetch('/api/capsules/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ capsuleIds: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error('Server rejected batch deletion request.');

      const result = (await res.json()) as {
        deleted: number;
        deletedIds?: string[];
        errors?: Array<{ id: string; message: string }>;
      };

      const deletedIds = Array.isArray(result.deletedIds) ? result.deletedIds : Array.from(selectedIds);
      const errors = Array.isArray(result.errors) ? result.errors : [];

      if (errors.length > 0) {
        showToast(`Deleted ${result.deleted}. Failed to delete ${errors.length}.`, 'error');
      } else {
        showToast(`Successfully purged ${result.deleted} capsules.`, 'success');
      }

      onBatchDeleteComplete(deletedIds);
      onClearSelection();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Batch delete failed.';
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="mb-6 flex flex-col items-center justify-between rounded-xl border border-amber-500/50 bg-amber-900/20 p-3 shadow-lg shadow-amber-900/10 sm:flex-row">
      <div className="mb-3 flex items-center space-x-4 sm:mb-0">
        <span className="rounded-lg border border-amber-900 bg-amber-950/50 px-3 py-1 font-bold text-amber-500">
          {selectedCount} Selected
        </span>
        <button
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="flex items-center text-sm font-medium text-slate-400 transition-colors hover:text-amber-400"
        >
          {isAllSelected ? (
            <>
              <CloseIcon className="mr-1 h-4 w-4" /> Deselect All
            </>
          ) : (
            <>
              <CheckSquareIcon className="mr-1 h-4 w-4" /> Select All Visible
            </>
          )}
        </button>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleExportSelected}
          disabled={isDeleting}
          className="flex items-center rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          <DownloadIcon className="mr-2 h-4 w-4" /> Export
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={isDeleting}
          className="flex items-center rounded-lg border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
        >
          <TrashIcon className="mr-2 h-4 w-4" /> {isDeleting ? 'Purging...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
