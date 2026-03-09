import path from 'path';

import { dataPath } from '@/lib/dataPath';
import { type AiWalletProviderId } from '@/lib/aiWalletSchema';

export const AGENTS_DIR = dataPath('private', 'agents');
export const VAULT_STEWARD_CONFIG_PATH = path.join(AGENTS_DIR, 'vault-steward.config.json');
export const VAULT_STEWARD_RUNTIME_PATH = path.join(AGENTS_DIR, 'vault-steward.runtime.json');
export const VAULT_STEWARD_HISTORY_PATH = path.join(AGENTS_DIR, 'vault-steward.history.jsonl');
export const VAULT_STEWARD_QUEUE_PATH = path.join(AGENTS_DIR, 'vault-steward.queue.json');
export const VAULT_STEWARD_LATEST_PATH = path.join(AGENTS_DIR, 'vault-steward.latest.json');
export const VAULT_STEWARD_LOG_PATH = path.join(AGENTS_DIR, 'vault-steward.log');
export const VAULT_STEWARD_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'vault-steward.ts');
export const TSX_CLI_PATH = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

export const MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN = 2;
export const CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS = 30 * 60 * 1000;
export const CODEX_FOREMAN_MIN_INTERVAL_MS = 20 * 60 * 1000;
export const CAPSULE_RECENT_ACTIVITY_WINDOW_MS = 12 * 60 * 60 * 1000;
export const CAPSULE_RECENT_ACTIVITY_MAX_COMPLETED = 2;
export const CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS = 5;
export const CODEX_FOREMAN_MAX_SCOUT_ACTIONS = 5;
export const CODEX_FOREMAN_MAX_SCOUT_TARGETS = 4;
export const CODEX_FOREMAN_MAX_SCOUT_JOBS = 4;
export const CODEX_FOREMAN_MAX_QUEUE_CONTEXT = 4;
export const SWARM_API_PROVIDER_EXCLUSIONS = new Set<AiWalletProviderId>([
  'codex_subscription',
  'claude_subscription',
  'n1_subscription',
]);
