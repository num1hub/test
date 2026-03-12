'use client';

import Link from 'next/link';
import AppNav from '@/components/AppNav';
import AiControlSurface from '@/components/AiControlSurface';

export default function AiPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 transition-colors dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Link
              href="/vault"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-500 dark:text-slate-400"
            >
              ← Back to Vault
            </Link>
            <AppNav />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Control Surface</h1>
        </div>

        <AiControlSurface />
      </div>
    </div>
  );
}
