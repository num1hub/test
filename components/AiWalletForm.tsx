'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { getClientAuthHeaders, getClientJsonAuthHeaders } from '@/lib/clientAuth';
import {
  AI_WALLET_PROVIDER_IDS,
  AI_WALLET_PROVIDER_METADATA,
  AI_WALLET_PROVIDER_SECTION_IDS,
  AI_WALLET_PROVIDER_SECTION_METADATA,
  type AiWalletProviderId,
  type AiWalletProviderSummary,
} from '@/lib/aiWalletSchema';

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 2 11 12" />
      <path d="M21 2 15 2 2 15v4h4L19 6V2Z" />
      <path d="M7.5 15.5 10 18" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

type DraftState = {
  secret: string;
  endpoint: string;
  preferredModel: string;
  enabled: boolean;
  configured: boolean;
  secretHint: string | null;
  updatedAt: string | null;
  saving: boolean;
  testing: boolean;
};

const createDraftState = (summary?: AiWalletProviderSummary): DraftState => ({
  secret: '',
  endpoint: summary?.endpoint ?? '',
  preferredModel: summary?.preferredModel ?? '',
  enabled: summary?.enabled ?? true,
  configured: summary?.configured ?? false,
  secretHint: summary?.secretHint ?? null,
  updatedAt: summary?.updatedAt ?? null,
  saving: false,
  testing: false,
});

export default function AiWalletForm() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<AiWalletProviderId, DraftState>>(() => {
    return Object.fromEntries(
      AI_WALLET_PROVIDER_IDS.map((provider) => [provider, createDraftState()]),
    ) as Record<AiWalletProviderId, DraftState>;
  });

  const providerOrder = useMemo(() => AI_WALLET_PROVIDER_IDS, []);
  const providerSections = useMemo(() => {
    return AI_WALLET_PROVIDER_SECTION_IDS.map((sectionId) => ({
      sectionId,
      meta: AI_WALLET_PROVIDER_SECTION_METADATA[sectionId],
      providers: providerOrder.filter(
        (provider) => AI_WALLET_PROVIDER_METADATA[provider].section === sectionId,
      ),
    })).filter((section) => section.providers.length > 0);
  }, [providerOrder]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/user/ai-wallet', {
          headers: getClientAuthHeaders(),
        });
        const data = (await res.json()) as { error?: string; providers?: AiWalletProviderSummary[] };
        if (!res.ok) throw new Error(data.error || 'Failed to load AI wallet');

        setDrafts((current) => {
          const next = { ...current };
          for (const provider of data.providers ?? []) {
            next[provider.provider] = createDraftState(provider);
          }
          return next;
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load AI wallet';
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast]);

  const updateDraft = (
    provider: AiWalletProviderId,
    patch: Partial<DraftState>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        ...patch,
      },
    }));
  };

  const saveProvider = async (provider: AiWalletProviderId) => {
    const draft = drafts[provider];
    if (!draft.secret.trim() && !draft.configured) {
      showToast('Enter a key before saving.', 'error');
      return;
    }

    updateDraft(provider, { saving: true });

    try {
      const res = await fetch('/api/user/ai-wallet', {
        method: 'PUT',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({
          provider,
          action: 'save',
          secret: draft.secret.trim() || undefined,
          endpoint: draft.endpoint.trim() || undefined,
          preferredModel: draft.preferredModel.trim() || undefined,
          enabled: draft.enabled,
        }),
      });

      const data = (await res.json()) as { error?: string; provider?: AiWalletProviderSummary };
      if (!res.ok || !data.provider) {
        throw new Error(data.error || 'Failed to save provider');
      }

      updateDraft(provider, {
        ...createDraftState(data.provider),
        saving: false,
      });
      showToast(`${AI_WALLET_PROVIDER_METADATA[provider].label} saved.`, 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save provider';
      updateDraft(provider, { saving: false });
      showToast(message, 'error');
    }
  };

  const clearProvider = async (provider: AiWalletProviderId) => {
    updateDraft(provider, { saving: true });

    try {
      const res = await fetch('/api/user/ai-wallet', {
        method: 'PUT',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({
          provider,
          action: 'clear',
        }),
      });

      const data = (await res.json()) as { error?: string; provider?: AiWalletProviderSummary };
      if (!res.ok || !data.provider) {
        throw new Error(data.error || 'Failed to clear provider');
      }

      updateDraft(provider, {
        ...createDraftState(data.provider),
        enabled: true,
        saving: false,
      });
      showToast(`${AI_WALLET_PROVIDER_METADATA[provider].label} cleared.`, 'info');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to clear provider';
      updateDraft(provider, { saving: false });
      showToast(message, 'error');
    }
  };

  const testProvider = async (provider: AiWalletProviderId) => {
    updateDraft(provider, { testing: true });

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({
          provider,
          prompt: 'Reply with READY and one short sentence confirming the provider is reachable.',
        }),
      });

      const data = (await res.json()) as { error?: string; text?: string; model?: string };
      if (!res.ok || !data.text) {
        throw new Error(data.error || 'Provider test failed');
      }

      showToast(`${AI_WALLET_PROVIDER_METADATA[provider].label}: ${data.text.slice(0, 120)}`, 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Provider test failed';
      showToast(message, 'error');
    } finally {
      updateDraft(provider, { testing: false });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center text-slate-900 dark:text-slate-100">
        <KeyIcon className="mr-2 h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold">AI Wallet</h3>
      </div>

      <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        <div className="mb-2 flex items-center font-semibold">
          <ShieldIcon className="mr-2 h-4 w-4" />
          Server-side encrypted storage
        </div>
        Raw secrets are stored on the server under the local data directory and are not returned to
        the browser after save. This is the base layer for future DeepMine, assistant, and agent
        provider routing.
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading wallet...</div>
      ) : (
        <div className="space-y-4">
          {providerSections.map(({ sectionId, meta, providers }) => (
            <section
              key={sectionId}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {meta.label}
                </h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
              </div>

              <div className="space-y-4">
                {providers.map((provider) => {
                  const metadata = AI_WALLET_PROVIDER_METADATA[provider];
                  const draft = drafts[provider];
                  const inputLabel = metadata.mode === 'auth_key' ? 'Authorization Key' : 'API Key';

                  return (
                    <div
                      key={provider}
                      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {metadata.label}
                            </h4>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {metadata.family}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                draft.configured
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {draft.configured ? 'Configured' : 'Not Connected'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {metadata.helperText}
                          </p>
                          {draft.secretHint ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Stored secret: {draft.secretHint}
                              {draft.updatedAt ? ` • updated ${new Date(draft.updatedAt).toLocaleString()}` : ''}
                            </p>
                          ) : null}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(event) => updateDraft(provider, { enabled: event.target.checked })}
                          />
                          Enabled
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                            {inputLabel}
                          </label>
                          <input
                            type="password"
                            value={draft.secret}
                            onChange={(event) => updateDraft(provider, { secret: event.target.value })}
                            placeholder={draft.configured ? 'Leave blank to keep current secret' : metadata.placeholder}
                            className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>

                        {metadata.endpointLabel ? (
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                              {metadata.endpointLabel}
                            </label>
                            <input
                              type="text"
                              value={draft.endpoint}
                              onChange={(event) => updateDraft(provider, { endpoint: event.target.value })}
                              placeholder="https://..."
                              className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                          </div>
                        ) : (
                          <div />
                        )}

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                            Preferred Model
                          </label>
                          <input
                            type="text"
                            value={draft.preferredModel}
                            onChange={(event) =>
                              updateDraft(provider, { preferredModel: event.target.value })
                            }
                            placeholder="Optional"
                            className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void saveProvider(provider)}
                          disabled={draft.saving || draft.testing}
                          className="rounded bg-amber-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                        >
                          {draft.saving ? 'Saving...' : 'Save Provider'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void testProvider(provider)}
                          disabled={draft.saving || draft.testing || !draft.configured}
                          className="rounded border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300"
                        >
                          {draft.testing ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void clearProvider(provider)}
                          disabled={draft.saving || draft.testing || !draft.configured}
                          className="rounded border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
