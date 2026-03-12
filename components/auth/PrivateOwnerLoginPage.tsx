'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OWNER_ACCESS_CODE_LENGTH } from '@/lib/authConfig';

export default function PrivateOwnerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get('next') || '/', [searchParams]);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login,
          password,
          accessCode,
        }),
      });

      const data = (await response.json()) as {
        token?: string;
        error?: string;
      };

      if (!response.ok || !data.token) {
        setError(data.error ?? 'Authentication failed.');
        return;
      }

      localStorage.setItem('n1hub_vault_token', data.token);
      router.push(nextPath);
    } catch {
      setError('System error during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.32em] text-amber-400">Private Owner Access</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Restricted N1Hub login</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            This temporary owner flow stays off the public landing. Access requires the exact owner
            login, password, and a short private access code. Sessions are still signed and the
            route remains rate-limited.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm font-semibold text-white">Private Route</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The login page is no longer linked from the public home surface.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm font-semibold text-white">Single Owner</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Only the configured owner login is accepted. Email-based aliases stay disabled.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm font-semibold text-white">Limited Factors</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Password plus a {OWNER_ACCESS_CODE_LENGTH}-character private access code replaces
                the earlier TOTP setup for now.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Sign in</h2>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Owner Login
              </label>
              <input
                type="text"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                placeholder="egor-n1"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Private Access Code
              </label>
              <input
                type="password"
                value={accessCode}
                onChange={(event) =>
                  setAccessCode(
                    event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, OWNER_ACCESS_CODE_LENGTH),
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-sm uppercase tracking-[0.35em] text-slate-100 outline-none transition-colors focus:border-amber-500"
                placeholder="N1X1"
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying Session...' : 'Unlock N1Hub'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
