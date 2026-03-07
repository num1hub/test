'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import type { AiWalletProviderId } from '@/lib/aiWalletSchema';

type ProviderCatalogEntry = {
  provider: AiWalletProviderId;
  label: string;
  family?: string;
  mode: 'api_key' | 'auth_key';
  configured: boolean;
  enabled: boolean;
  preferredModel: string | null;
  endpoint: string | null;
  helperText: string;
  available: boolean;
  selectedByDefault: boolean;
  baseUrl: string | null;
  defaultModel: string | null;
};

type LaneStatus = {
  id: 'symphony' | 'ninfinity';
  label: string;
  origin: string;
  state_url: string;
  refresh_url: string;
  status: 'online' | 'offline';
  snapshot: {
    generated_at: string;
    counts: {
      running: number;
      retrying: number;
    };
    codex_totals?: {
      total_tokens?: number;
      seconds_running?: number;
    } | null;
  } | null;
  error: string | null;
};

type GenerateResult = {
  provider: AiWalletProviderId;
  model: string;
  text: string;
  endpoint: string;
};

const DEFAULT_FORM = {
  provider: '' as '' | AiWalletProviderId,
  model: '',
  system: '',
  prompt: '',
};

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 2v4" />
      <path d="M8 4h8" />
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <path d="M9 17h6" />
    </svg>
  );
}

function PulseDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex h-2.5 w-2.5 rounded-full ${
        online ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
      }`}
    />
  );
}

export default function AiControlSurface() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderCatalogEntry[]>([]);
  const [lanes, setLanes] = useState<LaneStatus[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('n1hub_vault_token');
  }, []);

  const loadControlState = async () => {
    if (!token) return;

    try {
      const [providersResponse, controlResponse] = await Promise.all([
        fetch('/api/ai/providers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/ai/control-state', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const providerPayload = (await providersResponse.json()) as {
        error?: string;
        providers?: ProviderCatalogEntry[];
      };
      const controlPayload = (await controlResponse.json()) as {
        error?: string;
        lanes?: LaneStatus[];
      };

      if (!providersResponse.ok) {
        throw new Error(providerPayload.error || 'Failed to load provider catalog');
      }
      if (!controlResponse.ok) {
        throw new Error(controlPayload.error || 'Failed to load AI control state');
      }

      setProviders(providerPayload.providers ?? []);
      setLanes(controlPayload.lanes ?? []);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to load AI control surface', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadControlState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableProviders = providers.filter((provider) => provider.available);

  const submitPrompt = async () => {
    if (!token) {
      showToast('Session missing. Please log in again.', 'error');
      return;
    }
    if (!form.prompt.trim()) {
      showToast('Enter a prompt first.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: form.provider || undefined,
          model: form.model.trim() || undefined,
          system: form.system.trim() || undefined,
          prompt: form.prompt.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string } & GenerateResult;
      if (!response.ok) {
        throw new Error(payload.error || 'Generation failed');
      }

      setResult(payload);
      showToast(`DeepMine console responded via ${payload.provider}.`, 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Generation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshLanes = async (lane: 'symphony' | 'ninfinity' | 'all' = 'all') => {
    if (!token) {
      showToast('Session missing. Please log in again.', 'error');
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch('/api/ai/control-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lane }),
      });
      const payload = (await response.json()) as {
        error?: string;
        results?: Array<{ label: string; ok: boolean; error: string | null }>;
      };
      if (!response.ok) {
        throw new Error(payload.error || 'Refresh failed');
      }

      const failures = (payload.results ?? []).filter((entry) => !entry.ok);
      if (failures.length > 0) {
        showToast(
          failures.map((entry) => `${entry.label}: ${entry.error ?? 'failed'}`).join(' | '),
          'error',
        );
      } else {
        showToast('Agent lanes refresh requested.', 'success');
      }
      await loadControlState();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_40%)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <BotIcon className="h-4 w-4" />
                AI Control Surface
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                DeepMine, provider routing, and agent lanes in one operator view.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This is the N1Hub-native control plane inspired by OpenClaw, but grounded in AI Wallet,
                Symphony, N-Infinity, and the capsule graph rather than a standalone daemon.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refreshLanes('all')}
                disabled={refreshing}
                className="rounded border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Agent Lanes'}
              </button>
              <Link
                href="/settings"
                className="rounded border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Open Wallet Cabinet
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">DeepMine Console</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manual prompt console for wallet-backed providers and subscription bridges.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {availableProviders.length} providers ready
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Provider
              </label>
              <select
                value={form.provider}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    provider: event.target.value as '' | AiWalletProviderId,
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Auto-select from enabled providers</option>
                {availableProviders.map((provider) => (
                  <option key={provider.provider} value={provider.provider}>
                    {provider.label}
                    {provider.selectedByDefault ? ' • default' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Model Override
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                System Prompt
              </label>
              <textarea
                value={form.system}
                onChange={(event) => setForm((current) => ({ ...current, system: event.target.value }))}
                rows={3}
                placeholder="Optional system guidance"
                className="w-full rounded border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Prompt
              </label>
              <textarea
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                rows={8}
                placeholder="Ask DeepMine to summarize, compare, transform, or reason over something specific."
                className="w-full rounded border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submitPrompt()}
              disabled={submitting}
              className="rounded bg-amber-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? 'Generating...' : 'Run DeepMine Prompt'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(DEFAULT_FORM);
                setResult(null);
              }}
              className="rounded border border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear Console
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Result</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            DeepMine replies stay server-side routed through AI Wallet.
          </p>

          {result ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  {result.provider}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {result.model}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                {result.text}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Endpoint: {result.endpoint}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              No result yet. Use the console to test the wallet-backed provider plane that powers
              DeepMine, Chat to Capsules, and future assistant sessions.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Provider Constellation</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Wallet-backed providers and subscription bridges available to DeepMine and agents.
            </p>
          </div>
          <Link
            href="/settings"
            className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
          >
            Edit wallet →
          </Link>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading provider catalog...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => (
              <div
                key={provider.provider}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{provider.label}</h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{provider.helperText}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PulseDot online={provider.available} />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {provider.available ? 'ready' : 'offline'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {provider.mode === 'auth_key' ? 'subscription / auth' : 'api key'}
                  </span>
                  {provider.selectedByDefault ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      default
                    </span>
                  ) : null}
                </div>

                <dl className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between gap-4">
                    <dt>Base URL</dt>
                    <dd className="text-right text-slate-700 dark:text-slate-200">
                      {provider.baseUrl || 'n/a'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Default Model</dt>
                    <dd className="text-right text-slate-700 dark:text-slate-200">
                      {provider.defaultModel || 'n/a'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Agent Lanes</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live telemetry from the Symphony and N-Infinity status surfaces.
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            OpenClaw-style control UI, but backed by Symphony snapshots.
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading agent lanes...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lanes.map((lane) => (
              <div
                key={lane.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <PulseDot online={lane.status === 'online'} />
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{lane.label}</h4>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lane.origin}</p>
                    {lane.error ? (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{lane.error}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshLanes(lane.id)}
                    disabled={refreshing}
                    className="rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Refresh
                  </button>
                </div>

                {lane.snapshot ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Running</div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {lane.snapshot.counts.running}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Retrying</div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {lane.snapshot.counts.retrying}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Tokens</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {lane.snapshot.codex_totals?.total_tokens ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Seconds</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {Math.round(lane.snapshot.codex_totals?.seconds_running ?? 0)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    Lane unavailable. Start the service and refresh this control plane.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
