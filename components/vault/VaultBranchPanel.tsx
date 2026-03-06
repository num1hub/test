'use client';

import type { BranchName } from '@/types/branch';

interface VaultBranchPanelProps {
  branch: BranchName;
  availableBranches: BranchName[];
  onBranchChange: (branch: BranchName) => void;
}

export default function VaultBranchPanel({
  branch,
  availableBranches,
  onBranchChange,
}: VaultBranchPanelProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Vault Branch</div>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">Branch-Aware Tier Analytics</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Load any overlay branch of the vault and compare its tier distribution against the real
          baseline without leaving the dashboard.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={branch}
          onChange={(event) => onBranchChange(event.target.value as BranchName)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
        >
          {availableBranches.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-500">
          {branch === 'real' ? 'Baseline view' : 'Overlay compare'}
        </div>
      </div>
    </section>
  );
}
