'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import AiWalletForm from '@/components/AiWalletForm';
import AppNav from '@/components/AppNav';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { logClientAction } from '@/lib/clientActivity';

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.3 17.7-1.4 1.4" />
      <path d="m19.1 4.9-1.4 1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3a8.9 8.9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) router.push('/login');
  }, [router]);

  const handleLogout = () => {
    void logClientAction('logout', { message: 'Session terminated by architect.' });
    localStorage.removeItem('n1hub_vault_token');
    showToast('Session terminated.', 'info');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 transition-colors dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Link
              href="/vault"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-500 dark:text-slate-400"
            >
              ← Back to Vault
            </Link>
            <AppNav />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            System Preferences
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/20">
                  <UserIcon className="h-6 w-6 text-amber-500" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Chief Architect
                  </h2>
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                    ID: capsule.person.egor-n1.v1
                  </p>
                </div>
              </div>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Interface Theme
                </span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center space-x-2 rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {theme === 'dark' ? (
                    <>
                      <SunIcon className="h-4 w-4 text-amber-500" /> <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-4 w-4 text-blue-500" /> <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-800" />

              <Link
                href="/activity"
                className="flex w-full items-center justify-center rounded border border-slate-300 bg-slate-100 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ActivityIcon className="mr-2 h-4 w-4" /> View Audit Trail
              </Link>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-800" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-900/50 dark:bg-red-900/10"
              >
                <LogoutIcon className="mr-2 h-4 w-4" /> Terminate Session
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <PasswordChangeForm />
          </div>
        </div>

        <AiWalletForm />
      </div>
    </div>
  );
}
