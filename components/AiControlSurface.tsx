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

type VaultStewardRun = {
  run_id: string;
  started_at: string;
  completed_at: string;
  status: 'completed' | 'failed' | 'skipped';
  reason: string;
  provider: AiWalletProviderId | null;
  model: string | null;
  overview: string;
  workstream: 'decomposition' | 'markup' | 'graph_refactor' | 'mixed';
  observations: string[];
  suggested_actions: string[];
  targets: Array<{
    capsule_id: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  proposed_jobs: Array<{
    id: string;
    label: string;
    goal: string;
    workstream: 'decomposition' | 'markup' | 'graph_refactor' | 'mixed';
    capsule_ids: string[];
    suggested_branch: 'dream' | 'real';
    needs_human_confirmation: boolean;
    created_at: string;
    source_run_id: string;
    status: 'queued' | 'accepted' | 'completed' | 'dismissed';
  }>;
  executed_jobs: Array<{
    id: string;
    label: string;
    goal: string;
    workstream: 'decomposition' | 'markup' | 'graph_refactor' | 'mixed';
    capsule_ids: string[];
    suggested_branch: 'dream' | 'real';
    needs_human_confirmation: boolean;
    created_at: string;
    source_run_id: string;
    status: 'queued' | 'accepted' | 'completed' | 'dismissed';
  }>;
  lane_reports: Array<{
    id: 'scout' | 'foreman' | 'reviewer' | 'maintainer';
    label: string;
    engine: 'provider' | 'local_codex';
    status: 'completed' | 'failed' | 'skipped';
    provider: string | null;
    model: string | null;
    summary: string;
    error: string | null;
  }>;
};

type VaultStewardState = {
  config: {
    enabled: boolean;
    provider: AiWalletProviderId | null;
    model: string | null;
    mode: 'continuous' | 'nightly';
    interval_minutes: number;
    night_start_hour: number;
    night_end_hour: number;
    timezone: string | null;
    max_targets_per_run: number;
  };
  runtime: {
    pid: number | null;
    status: 'stopped' | 'starting' | 'running';
    started_at: string | null;
    last_heartbeat_at: string | null;
    last_run_at: string | null;
    latest_run_id: string | null;
    loop_count: number;
    idle_streak?: number;
    next_scheduled_at?: string | null;
    last_error: string | null;
  };
  latest_run: VaultStewardRun | null;
  queue: {
    jobs: Array<{
      id: string;
      label: string;
      goal: string;
      workstream: 'decomposition' | 'markup' | 'graph_refactor' | 'mixed';
      capsule_ids: string[];
      suggested_branch: 'dream' | 'real';
      status: 'queued' | 'accepted' | 'completed' | 'dismissed';
    }>;
  };
  swarm: {
    mode: 'unavailable' | 'provider_only' | 'hybrid_ready' | 'hybrid_active';
    summary: string;
    ready_provider_count: number;
    default_provider: string | null;
    codex_available: boolean;
    codex_plan_type: string | null;
    lanes: Array<{
      id: 'scout' | 'foreman' | 'reviewer' | 'maintainer';
      label: string;
      engine: 'provider' | 'local_codex';
      state: 'ready' | 'cooldown' | 'unavailable';
      available: boolean;
      provider: string | null;
      model: string | null;
      plan_type: string | null;
      detail: string;
      cooldown_until: string | null;
    }>;
  };
};

const DEFAULT_FORM = {
  provider: '' as '' | AiWalletProviderId,
  model: '',
  system: '',
  prompt: '',
};

const DEFAULT_VAULT_STEWARD_FORM = {
  enabled: false,
  provider: '' as '' | AiWalletProviderId,
  model: '',
  mode: 'nightly' as 'continuous' | 'nightly',
  interval_minutes: 30,
  night_start_hour: 1,
  night_end_hour: 6,
  timezone: '',
  max_targets_per_run: 6,
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
  const [vaultSteward, setVaultSteward] = useState<VaultStewardState | null>(null);
  const [vaultStewardForm, setVaultStewardForm] = useState(DEFAULT_VAULT_STEWARD_FORM);
  const [vaultStewardSaving, setVaultStewardSaving] = useState(false);
  const [vaultStewardAction, setVaultStewardAction] = useState<null | 'start' | 'stop' | 'run_once'>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('n1hub_vault_token');
  }, []);

  const loadControlState = async () => {
    if (!token) return;

    try {
      const [providersResponse, controlResponse, vaultStewardResponse] = await Promise.all([
        fetch('/api/ai/providers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/ai/control-state', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/agents/vault-steward', {
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
      const vaultStewardPayload = (await vaultStewardResponse.json()) as {
        error?: string;
      } & VaultStewardState;

      if (!providersResponse.ok) {
        throw new Error(providerPayload.error || 'Failed to load provider catalog');
      }
      if (!controlResponse.ok) {
        throw new Error(controlPayload.error || 'Failed to load AI control state');
      }
      if (!vaultStewardResponse.ok) {
        throw new Error(vaultStewardPayload.error || 'Failed to load Vault Steward state');
      }

      setProviders(providerPayload.providers ?? []);
      setLanes(controlPayload.lanes ?? []);
      setVaultSteward(vaultStewardPayload);
      setVaultStewardForm({
        enabled: vaultStewardPayload.config.enabled,
        provider: vaultStewardPayload.config.provider ?? '',
        model: vaultStewardPayload.config.model ?? '',
        mode: vaultStewardPayload.config.mode,
        interval_minutes: vaultStewardPayload.config.interval_minutes,
        night_start_hour: vaultStewardPayload.config.night_start_hour,
        night_end_hour: vaultStewardPayload.config.night_end_hour,
        timezone: vaultStewardPayload.config.timezone ?? '',
        max_targets_per_run: vaultStewardPayload.config.max_targets_per_run,
      });
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
  const vaultStewardHasReadyProvider = availableProviders.length > 0;
  const vaultStewardBusy = vaultStewardSaving || vaultStewardAction !== null;

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

  const saveVaultSteward = async (
    overrides?: Partial<typeof DEFAULT_VAULT_STEWARD_FORM>,
    options?: { silent?: boolean },
  ) => {
    if (!token) {
      showToast('Session missing. Please log in again.', 'error');
      return;
    }

    const nextForm = {
      ...vaultStewardForm,
      ...overrides,
    };

    setVaultStewardSaving(true);
    try {
      const response = await fetch('/api/agents/vault-steward', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: nextForm.enabled,
          provider: nextForm.provider || 'auto',
          model: nextForm.model.trim() || undefined,
          mode: nextForm.mode,
          interval_minutes: nextForm.interval_minutes,
          night_start_hour: nextForm.night_start_hour,
          night_end_hour: nextForm.night_end_hour,
          timezone: nextForm.timezone.trim() || null,
          max_targets_per_run: nextForm.max_targets_per_run,
        }),
      });
      const payload = (await response.json()) as { error?: string } & VaultStewardState;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save Vault Steward settings');
      }

      setVaultStewardForm({
        enabled: payload.config.enabled,
        provider: payload.config.provider ?? '',
        model: payload.config.model ?? '',
        mode: payload.config.mode,
        interval_minutes: payload.config.interval_minutes,
        night_start_hour: payload.config.night_start_hour,
        night_end_hour: payload.config.night_end_hour,
        timezone: payload.config.timezone ?? '',
        max_targets_per_run: payload.config.max_targets_per_run,
      });
      setVaultSteward(payload);
      if (!options?.silent) {
        showToast(
          payload.config.enabled
            ? 'Vault Steward enabled and background runtime prepared.'
            : 'Vault Steward configuration saved.',
          'success',
        );
      }
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to save Vault Steward', 'error');
      throw error;
    } finally {
      setVaultStewardSaving(false);
    }
  };

  const toggleVaultSteward = async (enabled: boolean) => {
    if (!token) {
      showToast('Session missing. Please log in again.', 'error');
      return;
    }
    if (enabled && !vaultStewardHasReadyProvider) {
      showToast('Add and enable at least one AI provider in Wallet before turning the agent on.', 'error');
      return;
    }

    setVaultStewardForm((current) => ({ ...current, enabled }));
    let configSaved = false;

    try {
      await saveVaultSteward({ enabled }, { silent: true });
      configSaved = true;
      if (enabled) {
        showToast(
          'Vault Steward is on. The autonomous swarm daemon started and will begin capsule-planning cycles in the background.',
          'success',
        );
        await loadControlState();
      } else {
        showToast('Vault Steward is off. Autonomous capsule work has been stopped.', 'success');
      }
    } catch {
      if (!configSaved) {
        setVaultStewardForm((current) => ({ ...current, enabled: !enabled }));
      } else {
        await loadControlState();
      }
    } finally {
      setVaultStewardAction(null);
    }
  };

  const controlVaultSteward = async (action: 'start' | 'stop' | 'run_once') => {
    if (!token) {
      showToast('Session missing. Please log in again.', 'error');
      return;
    }

    setVaultStewardAction(action);
    try {
      const response = await fetch('/api/agents/vault-steward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        error?: string;
        runtime?: VaultStewardState['runtime'];
        run?: VaultStewardRun;
      };
      if (!response.ok) {
        throw new Error(payload.error || 'Vault Steward control action failed');
      }

      if (action === 'run_once' && payload.run) {
        showToast(`Vault Steward completed ${payload.run.status} run.`, payload.run.status === 'failed' ? 'error' : 'success');
      } else {
        showToast(`Vault Steward ${action} request completed.`, 'success');
      }
      await loadControlState();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Vault Steward action failed', 'error');
    } finally {
      setVaultStewardAction(null);
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
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Vault Steward</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hybrid autonomous capsule swarm. A provider-backed scout researches the full vault,
              then local ChatGPT/Codex lanes refine and review that work before N1Hub writes the
              live capsule-planning backlog and executes bounded Dream-side maintenance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <PulseDot online={vaultSteward?.runtime.status === 'running'} />
            {vaultSteward?.runtime.status ?? 'offline'}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                One-switch autonomous capsule research
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Insert an API key in AI Wallet, then flip this switch. N1Hub will save the agent
                config, start the daemon, and kick off the first capsule-focused swarm cycle
                automatically. When local ChatGPT/Codex auth is present, the Codex foreman lane
                joins the provider scout lane automatically.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    vaultStewardHasReadyProvider
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                  }`}
                >
                  {vaultStewardHasReadyProvider
                    ? `${availableProviders.length} provider${availableProviders.length === 1 ? '' : 's'} ready`
                    : 'No ready providers yet'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {vaultStewardForm.mode === 'nightly' ? 'Night-focused autonomy' : 'Continuous autonomy'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {vaultSteward?.swarm.mode ?? 'unavailable'}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={vaultStewardForm.enabled}
              onClick={() => void toggleVaultSteward(!vaultStewardForm.enabled)}
              disabled={vaultStewardBusy || (!vaultStewardHasReadyProvider && !vaultStewardForm.enabled)}
              className={`relative inline-flex h-12 w-24 items-center rounded-full border px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                vaultStewardForm.enabled
                  ? 'border-emerald-500 bg-emerald-500/90'
                  : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow transition-transform ${
                  vaultStewardForm.enabled ? 'translate-x-12' : 'translate-x-0'
                }`}
              >
                {vaultStewardBusy ? '...' : vaultStewardForm.enabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              Advanced settings below change how the autonomous agent behaves. The main ON/OFF
              switch above is the primary control.
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Provider
              </label>
              <select
                value={vaultStewardForm.provider}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    provider: event.target.value as '' | AiWalletProviderId,
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Auto-select enabled provider</option>
                {availableProviders.map((provider) => (
                  <option key={provider.provider} value={provider.provider}>
                    {provider.label}
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
                value={vaultStewardForm.model}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({ ...current, model: event.target.value }))
                }
                placeholder="Optional"
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Mode
              </label>
              <select
                value={vaultStewardForm.mode}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    mode: event.target.value as 'continuous' | 'nightly',
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="nightly">Nightly</option>
                <option value="continuous">Continuous</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Interval Minutes
              </label>
              <input
                type="number"
                min={1}
                value={vaultStewardForm.interval_minutes}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    interval_minutes: Number.parseInt(event.target.value || '30', 10),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Night Start
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={vaultStewardForm.night_start_hour}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    night_start_hour: Number.parseInt(event.target.value || '1', 10),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Night End
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={vaultStewardForm.night_end_hour}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    night_end_hour: Number.parseInt(event.target.value || '6', 10),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Timezone
              </label>
              <input
                type="text"
                value={vaultStewardForm.timezone}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({ ...current, timezone: event.target.value }))
                }
                placeholder="America/Los_Angeles"
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Max Targets Per Run
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={vaultStewardForm.max_targets_per_run}
                onChange={(event) =>
                  setVaultStewardForm((current) => ({
                    ...current,
                    max_targets_per_run: Number.parseInt(event.target.value || '6', 10),
                  }))
                }
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => void saveVaultSteward()}
                disabled={vaultStewardSaving}
                className="rounded bg-amber-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
              >
                {vaultStewardSaving ? 'Saving...' : 'Save Advanced Settings'}
              </button>
              <button
                type="button"
                onClick={() => void controlVaultSteward('start')}
                disabled={vaultStewardAction !== null || !vaultStewardHasReadyProvider}
                className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
              >
                {vaultStewardAction === 'start' ? 'Starting...' : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => void controlVaultSteward('stop')}
                disabled={vaultStewardAction !== null}
                className="rounded border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
              >
                {vaultStewardAction === 'stop' ? 'Stopping...' : 'Stop'}
              </button>
              <button
                type="button"
                onClick={() => void controlVaultSteward('run_once')}
                disabled={vaultStewardAction !== null}
                className="rounded border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
              >
                {vaultStewardAction === 'run_once' ? 'Running...' : 'Run Once Now'}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Swarm</div>
              <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {vaultSteward?.swarm.mode ?? 'unavailable'}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {vaultSteward?.swarm.summary ??
                  'The autonomous capsule swarm is still loading its provider and subscription lanes.'}
              </p>
              <div className="mt-3 grid gap-2">
                {vaultSteward?.swarm.lanes.map((lane) => (
                  <div
                    key={lane.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {lane.label}
                      </div>
                      <div
                        className={`rounded-full px-2 py-1 font-medium ${
                          lane.state === 'ready'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : lane.state === 'cooldown'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                        }`}
                      >
                        {lane.state}
                      </div>
                    </div>
                    <div className="mt-1 text-slate-500 dark:text-slate-400">
                      {(lane.provider ?? lane.engine) +
                        (lane.model ? ` / ${lane.model}` : '') +
                        (lane.plan_type ? ` / plan:${lane.plan_type}` : '')}
                    </div>
                    <div className="mt-2 text-slate-600 dark:text-slate-300">{lane.detail}</div>
                    {lane.cooldown_until ? (
                      <div className="mt-1 text-amber-600 dark:text-amber-400">
                        Cooldown until: {lane.cooldown_until}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Runtime</div>
              <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {vaultSteward?.runtime.status ?? 'unknown'}
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <div>PID: {vaultSteward?.runtime.pid ?? 'n/a'}</div>
                <div>Loop count: {vaultSteward?.runtime.loop_count ?? 0}</div>
                <div>Idle streak: {vaultSteward?.runtime.idle_streak ?? 0}</div>
                <div>Last heartbeat: {vaultSteward?.runtime.last_heartbeat_at ?? 'n/a'}</div>
                <div>Last run: {vaultSteward?.runtime.last_run_at ?? 'n/a'}</div>
                <div>Next wake-up: {vaultSteward?.runtime.next_scheduled_at ?? 'n/a'}</div>
                {vaultSteward?.runtime.last_error ? (
                  <div className="text-rose-600 dark:text-rose-400">
                    Last error: {vaultSteward.runtime.last_error}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Latest Run</div>
              {vaultSteward?.latest_run ? (
                <div className="mt-2 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {vaultSteward.latest_run.status} • {vaultSteward.latest_run.workstream}
                    </div>
                    <p className="mt-2 leading-6 text-slate-600 dark:text-slate-300">
                      {vaultSteward.latest_run.overview}
                    </p>
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {vaultSteward.latest_run.provider ?? 'auto'} / {vaultSteward.latest_run.model ?? 'default'}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Planned capsule tasks: {vaultSteward.latest_run.proposed_jobs.length} • Focus capsules:{' '}
                      {vaultSteward.latest_run.targets.length}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Executed autonomously: {vaultSteward.latest_run.executed_jobs.length}
                    </div>
                    {vaultSteward.latest_run.lane_reports.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {vaultSteward.latest_run.lane_reports.map((lane) => (
                          <div
                            key={lane.id}
                            className="rounded border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                          >
                            <div className="font-semibold text-slate-700 dark:text-slate-200">
                              {lane.label} • {lane.status}
                            </div>
                            <div className="mt-1 text-slate-500 dark:text-slate-400">
                              {(lane.provider ?? lane.engine) + (lane.model ? ` / ${lane.model}` : '')}
                            </div>
                            <div className="mt-1 text-slate-600 dark:text-slate-300">{lane.summary}</div>
                            {lane.error ? (
                              <div className="mt-1 text-rose-600 dark:text-rose-400">{lane.error}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Queued jobs: {vaultSteward.queue.jobs.filter((job) => job.status === 'queued').length}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Completed jobs: {vaultSteward.queue.jobs.filter((job) => job.status === 'completed').length}
                    </div>
                    <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      {vaultSteward.queue.jobs.slice(0, 4).map((job) => (
                        <div key={job.id} className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                          <div className="font-medium">{job.label}</div>
                          <div className="mt-1">{job.goal}</div>
                        </div>
                      ))}
                      {vaultSteward.queue.jobs.length === 0 ? <div>No queued jobs yet.</div> : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  No autonomous Vault Steward run yet.
                </div>
              )}
            </div>
          </div>
        </div>
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
