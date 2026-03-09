import { z } from 'zod';

import { getResolvedAiProviderCatalog } from '@/lib/ai/providerRuntime';
import { getLocalCodexAvailability } from '@/lib/agents/localCodex';
import { CODEX_FOREMAN_MIN_INTERVAL_MS, CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS } from './constants';
import {
  vaultStewardLaneReportSchema,
  vaultStewardLaneStateSchema,
  vaultStewardSwarmSchema,
  type VaultStewardConfig,
  type VaultStewardRun,
} from './schemas';

type SwarmLane = z.infer<typeof vaultStewardLaneReportSchema>;

function getLatestLane(run: VaultStewardRun | null, laneId: string): SwarmLane | null {
  return run?.lane_reports.find((lane) => lane.id === laneId) ?? null;
}

function getCodexForemanCooldown(
  latestRun: VaultStewardRun | null,
): { active: boolean; cooldownUntil: string | null; error: string | null } {
  const previousForemanFailure = getLatestLane(latestRun, 'foreman');
  if (
    previousForemanFailure?.status === 'failed' &&
    previousForemanFailure.error?.toLowerCase().includes('timed out') &&
    latestRun?.completed_at
  ) {
    const cooldownUntilMs =
      new Date(latestRun.completed_at).getTime() + CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS;
    return {
      active: Date.now() < cooldownUntilMs,
      cooldownUntil: new Date(cooldownUntilMs).toISOString(),
      error: previousForemanFailure.error,
    };
  }

  return {
    active: false,
    cooldownUntil: null,
    error: null,
  };
}

function getCodexForemanCadenceHold(
  latestRun: VaultStewardRun | null,
): { active: boolean; holdUntil: string | null } {
  const previousForeman = getLatestLane(latestRun, 'foreman');
  if (previousForeman?.status === 'completed' && latestRun?.completed_at) {
    const holdUntilMs = new Date(latestRun.completed_at).getTime() + CODEX_FOREMAN_MIN_INTERVAL_MS;
    return {
      active: Date.now() < holdUntilMs,
      holdUntil: new Date(holdUntilMs).toISOString(),
    };
  }

  return {
    active: false,
    holdUntil: null,
  };
}

function getProviderModel(
  provider: string | null,
  configModel: string | null,
  readyProviders: Array<{ provider: string; defaultModel?: string | null }>,
): string | null {
  const selected = readyProviders.find((entry) => entry.provider === provider);
  return configModel ?? selected?.defaultModel ?? null;
}

async function buildVaultStewardSwarmState(
  config: VaultStewardConfig,
  latestRun: VaultStewardRun | null,
): Promise<z.infer<typeof vaultStewardSwarmSchema>> {
  const [providerCatalog, codexAvailability] = await Promise.all([
    getResolvedAiProviderCatalog(),
    getLocalCodexAvailability(),
  ]);

  const readyProviders = providerCatalog.filter((provider) => provider.available);
  const activeProvider =
    (config.provider
      ? readyProviders.find((provider) => provider.provider === config.provider)?.provider
      : null) ??
    readyProviders.find((provider) => provider.selectedByDefault)?.provider ??
    readyProviders[0]?.provider ??
    null;
  const cooldown = getCodexForemanCooldown(latestRun);
  const cadenceHold = getCodexForemanCadenceHold(latestRun);
  const recentLocalCodexSuccess =
    latestRun?.lane_reports.some(
      (lane) => lane.engine === 'local_codex' && lane.status === 'completed',
    ) ?? false;

  const providerLane = vaultStewardLaneStateSchema.parse({
    id: 'scout',
    label: 'Scout',
    engine: 'provider',
    state: readyProviders.length > 0 ? 'ready' : 'unavailable',
    available: readyProviders.length > 0,
    provider: activeProvider,
    model: getProviderModel(activeProvider, config.model, readyProviders),
    plan_type: null,
    detail:
      readyProviders.length > 0
        ? `API lane is ready with ${readyProviders.length} configured provider${readyProviders.length === 1 ? '' : 's'}.`
        : 'No wallet-backed API provider is ready for swarm work.',
    cooldown_until: null,
  });

  const foremanLane = vaultStewardLaneStateSchema.parse({
    id: 'foreman',
    label: 'Codex Foreman',
    engine: 'local_codex',
    state:
      cooldown.active || cadenceHold.active
        ? 'cooldown'
        : codexAvailability.available
          ? 'ready'
          : 'unavailable',
    available: codexAvailability.available && !cooldown.active && !cadenceHold.active,
    provider: 'chatgpt_local_codex',
    model: null,
    plan_type: codexAvailability.planType,
    detail: cooldown.active
      ? 'Subscription-backed foreman lane is cooling down after a recent timeout.'
      : cadenceHold.active
        ? 'Subscription-backed foreman lane is holding cadence because a recent strategic pass already completed.'
        : codexAvailability.available
        ? 'Subscription-backed foreman lane is ready for strategic supervisory passes.'
        : codexAvailability.reason ?? 'Codex foreman lane is unavailable.',
    cooldown_until: cooldown.cooldownUntil ?? cadenceHold.holdUntil,
  });

  const reviewerLane = vaultStewardLaneStateSchema.parse({
    id: 'reviewer',
    label: 'Codex Reviewer',
    engine: 'local_codex',
    state: codexAvailability.available ? 'ready' : 'unavailable',
    available: codexAvailability.available,
    provider: 'chatgpt_local_codex',
    model: null,
    plan_type: codexAvailability.planType,
    detail: codexAvailability.available
      ? 'Subscription-backed reviewer lane is ready for compact quality-control passes on swarm output.'
      : codexAvailability.reason ?? 'Codex reviewer lane is unavailable.',
    cooldown_until: null,
  });

  const maintainerLane = vaultStewardLaneStateSchema.parse({
    id: 'maintainer',
    label: 'Executor',
    engine: 'provider',
    state: readyProviders.length > 0 ? 'ready' : 'unavailable',
    available: readyProviders.length > 0,
    provider: activeProvider,
    model: getProviderModel(activeProvider, config.model, readyProviders),
    plan_type: null,
    detail:
      readyProviders.length > 0
        ? 'API-backed executor lane can execute bounded Dream-side capsule work across decomposition, markup, and graph refactor streams.'
        : 'Executor lane is blocked until an API provider is configured.',
    cooldown_until: null,
  });

  const mode =
    readyProviders.length === 0
      ? 'unavailable'
      : codexAvailability.available
        ? recentLocalCodexSuccess
          ? 'hybrid_active'
          : 'hybrid_ready'
        : 'provider_only';

  const summary =
    mode === 'unavailable'
      ? 'The swarm is offline because no API provider is currently ready.'
      : mode === 'provider_only'
        ? 'The swarm can work through API lanes only. ChatGPT/Codex subscription help is currently unavailable.'
        : mode === 'hybrid_active'
          ? 'The swarm is operating in hybrid mode with both API lanes and ChatGPT/Codex subscription lanes participating.'
          : 'The swarm is ready for hybrid mode: API lanes are online and ChatGPT/Codex subscription lanes are available.';

  return vaultStewardSwarmSchema.parse({
    mode,
    summary,
    ready_provider_count: readyProviders.length,
    default_provider: activeProvider,
    codex_available: codexAvailability.available,
    codex_plan_type: codexAvailability.planType,
    lanes: [providerLane, foremanLane, reviewerLane, maintainerLane],
  });
}

export { getCodexForemanCadenceHold, getCodexForemanCooldown, buildVaultStewardSwarmState };
