'use client';

import type { BranchType } from '@/types/branch';

interface BranchToggleProps {
  currentBranch: BranchType;
  hasDreamBranch: boolean;
  onSwitchBranch: (branch: BranchType) => void;
  onFork: () => void;
  onPromote: () => void;
  onViewDiff: () => void;
}

type IconProps = { className?: string };

function BranchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v9a3 3 0 0 0 3 3h6" />
      <path d="M18 15V6a3 3 0 0 0-3-3H9" />
    </svg>
  );
}

function MergeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 6h3a6 6 0 0 1 6 6v3" />
      <path d="M9 18h3" />
    </svg>
  );
}

function DiffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12h7" />
      <path d="M14 12h7" />
      <path d="m8 7 5 5-5 5" />
    </svg>
  );
}

export default function BranchToggle({
  currentBranch,
  hasDreamBranch,
  onSwitchBranch,
  onFork,
  onPromote,
  onViewDiff,
}: BranchToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-sm">
      <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
        <button
          onClick={() => onSwitchBranch('real')}
          className={`flex items-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            currentBranch === 'real'
              ? 'border border-amber-500/50 bg-amber-900/50 text-amber-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`mr-2 h-2 w-2 rounded-full ${
              currentBranch === 'real' ? 'animate-pulse bg-amber-400' : 'bg-slate-600'
            }`}
          />
          Real
        </button>
        <button
          onClick={() => hasDreamBranch && onSwitchBranch('dream')}
          disabled={!hasDreamBranch}
          className={`flex items-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            currentBranch === 'dream'
              ? 'border border-violet-500/50 bg-violet-900/50 text-violet-400'
              : hasDreamBranch
                ? 'text-slate-400 hover:text-violet-300'
                : 'cursor-not-allowed text-slate-700'
          }`}
        >
          <div
            className={`mr-2 h-2 w-2 rounded-full ${
              currentBranch === 'dream' ? 'animate-pulse bg-violet-400' : 'bg-slate-700'
            }`}
          />
          Dream
        </button>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-slate-700 sm:block" />

      {!hasDreamBranch ? (
        <button
          onClick={onFork}
          title="Fork Real state into an editable Dream workspace"
          className="flex items-center rounded-lg border border-violet-900/50 bg-violet-900/20 px-3 py-1.5 text-sm font-medium text-violet-400 transition-colors hover:bg-violet-900/40 hover:text-violet-300"
        >
          <BranchIcon className="mr-1.5 h-4 w-4" /> Fork to Dream
        </button>
      ) : (
        <>
          <button
            onClick={onViewDiff}
            className="flex items-center rounded-lg border border-blue-900/50 bg-blue-900/20 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-900/40 hover:text-blue-300"
          >
            <DiffIcon className="mr-1.5 h-4 w-4" /> Diff
          </button>

          {currentBranch === 'dream' && (
            <button
              onClick={onPromote}
              title="Overwrite Real state with current Dream state"
              className="ml-auto flex items-center rounded-lg border border-emerald-900/50 bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-900/40 hover:text-emerald-300"
            >
              <MergeIcon className="mr-1.5 h-4 w-4" /> Promote to Real
            </button>
          )}
        </>
      )}
    </div>
  );
}
