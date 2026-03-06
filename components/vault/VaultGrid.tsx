'use client';

import { CheckSquare } from 'lucide-react';
import CapsuleCard from '@/components/CapsuleCard';
import type { SovereignCapsule } from '@/types/capsule';

interface VaultGridProps {
  capsules: SovereignCapsule[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}

export default function VaultGrid({
  capsules,
  selectedIds,
  onToggleSelection,
}: VaultGridProps) {
  if (capsules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-20 text-center text-slate-500">
        No capsules match the current filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {capsules.map((capsule) => {
        const id = capsule.metadata.capsule_id;
        const isSelected = selectedIds.has(id);

        return (
          <div key={id} className="group relative">
            <div
              className={`absolute right-3 top-3 z-10 cursor-pointer rounded-md p-1 transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-900 opacity-100'
                  : 'border border-slate-600 bg-slate-800/80 text-transparent opacity-0 group-hover:opacity-100'
              }`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleSelection(id);
              }}
            >
              <CheckSquare className="h-5 w-5" />
            </div>

            <div
              className={`transition-all duration-200 ${
                isSelected ? 'scale-[0.98] rounded-xl ring-2 ring-amber-500' : ''
              }`}
            >
              <CapsuleCard capsule={capsule} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
