'use client';

import { useEffect, useState } from 'react';

type ChatGptAuthStatus = {
  enabled: boolean;
  available: boolean;
  state: 'connected' | 'expired' | 'missing' | 'disabled' | 'error';
  email: string | null;
  plan_type: string | null;
  subscription_active_until: string | null;
  reason: string | null;
};

type Props = {
  mode?: 'compact' | 'full';
  onAuthenticated?: (token: string) => void;
};

function badgeClasses(state: ChatGptAuthStatus['state'] | 'loading') {
  switch (state) {
    case 'connected':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'expired':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'missing':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'disabled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'error':
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
    default:
      return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

function badgeLabel(state: ChatGptAuthStatus['state'] | 'loading') {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'expired':
      return 'Expired';
    case 'missing':
      return 'Missing Codex Login';
    case 'disabled':
      return 'Disabled';
    case 'error':
      return 'Unavailable';
    default:
      return 'Checking';
  }
}

export default function ChatGptAuthStatusCard({ mode = 'full', onAuthenticated }: Props) {
  const [status, setStatus] = useState<ChatGptAuthStatus | null>(null);
  const [loading, setLoading] = useState(mode === 'full');
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const res = await fetch('/api/auth/chatgpt');
        if (!res.ok) return;
        const data = (await res.json()) as ChatGptAuthStatus;
        if (active) setStatus(data);
      } catch {
        if (active) {
          setStatus(null);
          setError('Failed to inspect local ChatGPT/Codex session.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, [mode]);

  const handleLogin = async () => {
    setAuthenticating(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/chatgpt', { method: 'POST' });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? 'ChatGPT authorization is unavailable on this machine.');
        return;
      }

      onAuthenticated?.(data.token);
    } catch {
      setError('System error during ChatGPT authentication.');
    } finally {
      setAuthenticating(false);
    }
  };

  const currentState = loading ? 'loading' : status?.state ?? 'error';
  const compact = mode === 'compact';

  return (
    <div
      className={`rounded-xl border ${
        compact
          ? 'border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40'
          : 'border-slate-800 bg-slate-950/60 p-4'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={compact ? 'text-sm font-semibold text-slate-900 dark:text-slate-100' : 'text-sm font-semibold text-slate-100'}>
            ChatGPT / Codex Auth
          </div>
          <p className={compact ? 'mt-1 text-xs text-slate-500 dark:text-slate-400' : 'mt-1 text-xs text-slate-500'}>
            Local self-hosted mode. N1Hub checks the Codex session already signed in on this machine.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(currentState)}`}>
          {badgeLabel(currentState)}
        </span>
      </div>

      {status?.email ? (
        <p className={compact ? 'mt-3 text-sm text-slate-600 dark:text-slate-300' : 'mt-3 text-sm text-slate-300'}>
          {status.email}
          {status.plan_type ? ` · ${status.plan_type}` : ''}
          {status.subscription_active_until ? ` · until ${new Date(status.subscription_active_until).toLocaleDateString()}` : ''}
        </p>
      ) : null}

      {status?.reason ? (
        <p className={compact ? 'mt-3 text-sm text-slate-500 dark:text-slate-400' : 'mt-3 text-sm text-slate-400'}>
          {status.reason}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      ) : null}

      {onAuthenticated ? (
        <button
          type="button"
          onClick={handleLogin}
          disabled={!status?.available || authenticating}
          className={`mt-4 w-full rounded px-4 py-2 font-semibold transition-colors ${
            compact
              ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
              : 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {authenticating ? 'Verifying ChatGPT Session...' : 'Continue with ChatGPT'}
        </button>
      ) : null}
    </div>
  );
}
