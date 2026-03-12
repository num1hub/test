'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import AiWalletForm from '@/components/AiWalletForm';
import AppNav from '@/components/AppNav';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  DEFAULT_CAPSULE_VISUAL_OWNER_ID,
  useCapsuleVisualPreferences,
} from '@/hooks/useCapsuleVisualPreferences';
import {
  CAPSULE_GRAPH_QUALITY_PRESETS,
  CAPSULE_VISUAL_PROFILES,
} from '@/lib/capsuleVisualProfile';
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

function PreferenceChip({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
          : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs leading-5 opacity-80">{hint}</div>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const {
    visualProfile,
    graphQuality,
    setVisualProfile,
    setGraphQuality,
    resolvedVisualProfile,
    resolvedGraphQuality,
  } = useCapsuleVisualPreferences(DEFAULT_CAPSULE_VISUAL_OWNER_ID);

  const handleLogout = async () => {
    void logClientAction('logout', { message: 'Session terminated by architect.' });

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if cookie clearing fails, drop the local token and return to login.
    }

    localStorage.removeItem('n1hub_vault_token');
    showToast('Session terminated.', 'info');
    router.push('/');
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
                    ID: {DEFAULT_CAPSULE_VISUAL_OWNER_ID}
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

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Visual Memory Profile
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-500">
                    {resolvedVisualProfile.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {resolvedVisualProfile.hint}
                </p>
                <div className="mt-3 grid gap-2">
                  {CAPSULE_VISUAL_PROFILES.map((profile) => (
                    <PreferenceChip
                      key={profile.key}
                      active={visualProfile === profile.key}
                      label={profile.label}
                      hint={profile.hint}
                      onClick={() => setVisualProfile(profile.key)}
                    />
                  ))}
                </div>
              </div>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-800" />

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    2D Graph Quality
                  </span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-500">
                    {resolvedGraphQuality.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {resolvedGraphQuality.hint}
                </p>
                <div className="mt-3 grid gap-2">
                  {CAPSULE_GRAPH_QUALITY_PRESETS.map((quality) => (
                    <PreferenceChip
                      key={quality.key}
                      active={graphQuality === quality.key}
                      label={quality.label}
                      hint={quality.hint}
                      onClick={() => setGraphQuality(quality.key)}
                    />
                  ))}
                </div>
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
            <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 dark:text-amber-100">
              <div className="font-semibold">Vercel Hobby auth mode</div>
              <p className="mt-1 leading-6 text-amber-100/80">
                This deployment is intended to run behind the locked architect gate. In production, rotate the
                master password and access code through deployment environment settings instead of relying on
                in-app mutation.
              </p>
            </div>
            <PasswordChangeForm />
          </div>
        </div>
        <AiWalletForm />
      </div>
    </div>
  );
}
