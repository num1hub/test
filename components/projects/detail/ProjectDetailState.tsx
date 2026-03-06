'use client';

export function ProjectDetailLoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-400">
      <p className="animate-pulse">Loading project...</p>
    </div>
  );
}

export function ProjectDetailNotFoundState() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-400">
      <p>Project not found.</p>
    </div>
  );
}
