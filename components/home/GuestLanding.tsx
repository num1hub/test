'use client';

import { useState } from 'react';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const previewCards = [
  {
    title: '2D Graph',
    description:
      'Navigate capsule neighborhoods spatially, focus one node, and read linked structure without losing the wider graph.',
  },
  {
    title: 'Vault Grid',
    description:
      'Scan sovereign capsules as cards, sort them by freshness, and move between branches, tiers, and types fast.',
  },
  {
    title: 'Chat to Capsules',
    description:
      'Planned operator-facing retrieval surface for routing intent through N1 instead of reading raw storage directly.',
  },
];

export default function GuestLanding() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [intent, setIntent] = useState('');
  const [state, setState] = useState<SubmissionState>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, intent }),
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setState('error');
        setMessage(data.error ?? 'Unable to record your access request.');
        return;
      }

      setState('success');
      setMessage(data.message ?? 'Access request recorded.');
      setName('');
      setEmail('');
      setIntent('');
    } catch {
      setState('error');
      setMessage('Network failure while sending the request.');
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-amber-400">N1Hub.com</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Sovereign capsule workspace for people who build with depth.
            </h1>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900/70 px-5 py-2 text-sm text-slate-300">
            Private access by invitation-only route
          </div>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Preview</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Graph-native vault, branch-aware capsule storage, and a future home surface that feels personal.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Guests see a guided preview and can request early access. Authorized architects enter
              a private workspace with direct vault access, branch-aware navigation, and evolving
              capsule-native control surfaces.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {previewCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5"
                >
                  <p className="text-sm font-semibold text-white">{card.title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-sm font-semibold text-white">Security posture</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Access remains architect-only. The public landing no longer exposes the login
                route directly. The temporary owner flow uses a private route, signed sessions,
                password verification, a short private access code, and rate-limited
                authentication.
              </p>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-400">Pre-registration</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Request early access to the private vault.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Leave a lightweight request and your intended use. This is a basic intake surface for
              preview-stage access, not a public sign-up wall.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                  placeholder="Egor"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                  placeholder="architect@n1hub.com"
                  required
                  maxLength={160}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Intent</label>
                <textarea
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                  className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                  placeholder="What do you want to build inside N1Hub?"
                  maxLength={1000}
                />
              </div>

              {message ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    state === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={state === 'submitting'}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === 'submitting' ? 'Recording Request...' : 'Join Access Queue'}
              </button>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
