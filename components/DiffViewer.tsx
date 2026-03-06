'use client';

import type { SovereignCapsule } from '@/types/capsule';

interface DiffViewerProps {
  realCapsule: SovereignCapsule;
  dreamCapsule: SovereignCapsule;
  isOpen: boolean;
  onClose: () => void;
}

type IconProps = { className?: string };

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function DiffViewer({
  realCapsule,
  dreamCapsule,
  isOpen,
  onClose,
}: DiffViewerProps) {
  if (!isOpen) return null;

  const realLines = JSON.stringify(realCapsule, null, 2).split('\n');
  const dreamLines = JSON.stringify(dreamCapsule, null, 2).split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <h2 className="text-xl font-bold text-slate-100">Branch Differential Analysis</h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-auto p-0">
          <div className="w-1/2 border-r border-slate-800">
            <div className="sticky top-0 border-b border-slate-800 bg-amber-900/20 p-2 text-center font-mono text-sm font-bold uppercase tracking-widest text-amber-500">
              Baseline (Real)
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs text-slate-400">
              {realLines.map((line, index) => {
                const isDiff = line !== dreamLines[index];
                return (
                  <div key={index} className={isDiff ? 'bg-red-900/30 text-red-300' : ''}>
                    <span className="inline-block w-8 select-none text-slate-600">{index + 1}</span>
                    {line || ' '}
                  </div>
                );
              })}
            </pre>
          </div>

          <div className="w-1/2">
            <div className="sticky top-0 border-b border-slate-800 bg-violet-900/20 p-2 text-center font-mono text-sm font-bold uppercase tracking-widest text-violet-400">
              Proposed (Dream)
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs text-slate-300">
              {dreamLines.map((line, index) => {
                const isDiff = line !== realLines[index];
                return (
                  <div key={index} className={isDiff ? 'bg-emerald-900/30 text-emerald-300' : ''}>
                    <span className="inline-block w-8 select-none text-slate-600">{index + 1}</span>
                    {line || ' '}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
