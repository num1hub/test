'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ActivityLog from '@/components/ActivityLog';
import AppNav from '@/components/AppNav';

export default function ActivityPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/vault"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-500 dark:text-slate-400"
            >
              ← Back to Vault
            </Link>
            <AppNav />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Telemetry</h1>
        </div>

        <ActivityLog />
      </div>
    </div>
  );
}
