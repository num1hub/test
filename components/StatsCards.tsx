import { useMemo } from 'react';
import { SovereignCapsule } from '@/types/capsule';

type IconProps = { className?: string };

function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function DiamondIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m6 3 6 7 6-7" />
      <path d="m3 10 9 11 9-11-9-7-9 7Z" />
    </svg>
  );
}

function BoxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function WrenchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m14.7 6.3-1 1a4 4 0 0 1-5.7 5.7l-5 5a2 2 0 1 0 2.8 2.8l5-5a4 4 0 0 1 5.7-5.7l1-1a4 4 0 0 0-2.8-6.8l-2.2 2.2" />
    </svg>
  );
}

function LayersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

function FolderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export default function StatsCards({ capsules }: { capsules: SovereignCapsule[] }) {
  const stats = useMemo(() => {
    const counts = {
      total: capsules.length,
      foundation: 0,
      concept: 0,
      operations: 0,
      physical: 0,
      project: 0,
    };

    capsules.forEach((capsule) => {
      if (capsule.metadata?.type === 'foundation') counts.foundation++;
      else if (capsule.metadata?.type === 'concept') counts.concept++;
      else if (capsule.metadata?.type === 'operations') counts.operations++;
      else if (capsule.metadata?.type === 'physical_object') counts.physical++;
      else if (capsule.metadata?.type === 'project') counts.project++;
    });

    return counts;
  }, [capsules]);

  const cards = [
    {
      label: 'Total Assets',
      value: stats.total,
      icon: DatabaseIcon,
      color: 'border-slate-700 bg-slate-800 text-slate-200',
    },
    {
      label: 'Foundations',
      value: stats.foundation,
      icon: DiamondIcon,
      color: 'border-amber-900/50 bg-amber-900/20 text-amber-400',
    },
    {
      label: 'Concepts',
      value: stats.concept,
      icon: BoxIcon,
      color: 'border-blue-900/50 bg-blue-900/20 text-blue-400',
    },
    {
      label: 'Operations',
      value: stats.operations,
      icon: WrenchIcon,
      color: 'border-emerald-900/50 bg-emerald-900/20 text-emerald-400',
    },
    {
      label: 'Physical Twins',
      value: stats.physical,
      icon: LayersIcon,
      color: 'border-orange-900/50 bg-orange-900/20 text-orange-400',
    },
    {
      label: 'Projects',
      value: stats.project,
      icon: FolderIcon,
      color: 'border-violet-900/50 bg-violet-900/20 text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center shadow-sm transition-shadow hover:shadow-md ${card.color}`}
        >
          <card.icon className="mb-2 h-6 w-6 opacity-80" />
          <span className="font-mono text-2xl font-bold">{card.value}</span>
          <span className="mt-1 text-xs uppercase tracking-wider opacity-70">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
