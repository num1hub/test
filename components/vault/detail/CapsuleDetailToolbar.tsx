'use client';

import Link from 'next/link';
import BranchToggle from '../../BranchToggle';
import type { BranchName } from '@/types/branch';

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

interface CapsuleDetailToolbarProps {
  capsuleId: string;
  currentBranch: BranchName;
  hasDreamBranch: boolean;
  availableBranches: BranchName[];
  isDeleting: boolean;
  onSwitchBranch: (branch: BranchName) => void;
  onOpenHistory: () => void;
  onFork: () => void;
  onPromote: () => void;
  onViewDiff: () => void;
  onDelete: () => void;
}

export default function CapsuleDetailToolbar({
  capsuleId,
  currentBranch,
  hasDreamBranch,
  availableBranches,
  isDeleting,
  onSwitchBranch,
  onOpenHistory,
  onFork,
  onPromote,
  onViewDiff,
  onDelete,
}: CapsuleDetailToolbarProps) {
  return (
    <div className="sticky top-4 z-10 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/vault"
            className="flex items-center text-sm font-medium text-slate-400 transition-colors hover:text-amber-500"
          >
            ← Vault Terminal
          </Link>
          <span
            className={`rounded border px-2 py-1 text-xs font-mono uppercase tracking-wider ${
              currentBranch === 'dream'
                ? 'border-violet-700 bg-violet-900/20 text-violet-400'
                : currentBranch === 'real'
                  ? 'border-amber-700 bg-amber-900/20 text-amber-400'
                  : 'border-sky-700 bg-sky-900/20 text-sky-400'
            }`}
          >
            Branch: {currentBranch}
          </span>
        </div>

        <BranchToggle
          currentBranch={currentBranch}
          hasDreamBranch={hasDreamBranch}
          availableBranches={availableBranches}
          onSwitchBranch={onSwitchBranch}
          onFork={onFork}
          onPromote={onPromote}
          onViewDiff={onViewDiff}
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpenHistory}
            disabled={currentBranch !== 'real'}
            className="flex items-center rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HistoryIcon className="mr-2 h-4 w-4" /> History
          </button>
          <Link
            href={`/vault/capsule/${capsuleId}/edit?branch=${currentBranch}`}
            className="rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            Edit {currentBranch === 'dream' ? 'Dream' : 'Capsule'}
          </Link>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            {isDeleting ? 'Purging...' : 'Purge'}
          </button>
        </div>
      </div>
    </div>
  );
}
