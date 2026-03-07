import os from 'os';
import path from 'path';
import { DEFAULT_NINFINITY_CAPSULE_AGENT_IDS } from '@/lib/ninfinity/registry';
import type { SymphonyConfig, ValidationError, WorkflowDefinition, WorkflowRuntime } from './types';
import {
  asRecord,
  coerceStringList,
  normalizeIssueState,
  parseInteger,
  resolveEnvToken,
  resolvePathValue,
} from './utils';
import { loadWorkflowDefinition, resolveWorkflowPath } from './workflow';

const DEFAULT_ACTIVE_STATES = ['Todo', 'In Progress'];
const DEFAULT_TERMINAL_STATES = ['Closed', 'Cancelled', 'Canceled', 'Duplicate', 'Done'];

function parseStateConcurrency(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) return {};

  const parsed: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(record)) {
    const amount = parseInteger(rawValue, Number.NaN);
    if (Number.isFinite(amount) && amount > 0) {
      parsed[normalizeIssueState(key)] = amount;
    }
  }

  return parsed;
}

export function parseWorkflowConfig(
  definition: WorkflowDefinition,
  workflowPath?: string,
): SymphonyConfig {
  const root = definition.config;
  const tracker = asRecord(root.tracker) ?? {};
  const polling = asRecord(root.polling) ?? {};
  const workspace = asRecord(root.workspace) ?? {};
  const hooks = asRecord(root.hooks) ?? {};
  const agent = asRecord(root.agent) ?? {};
  const codex = asRecord(root.codex) ?? {};
  const server = asRecord(root.server) ?? {};

  const hookTimeout = parseInteger(hooks.timeout_ms, 60_000);

  return {
    workflow_path: resolveWorkflowPath(workflowPath),
    tracker: {
      kind: typeof tracker.kind === 'string' ? tracker.kind.trim() : '',
      endpoint:
        typeof tracker.endpoint === 'string' && tracker.endpoint.trim()
          ? tracker.endpoint.trim()
          : 'https://api.linear.app/graphql',
      api_key:
        resolveEnvToken(tracker.api_key) ??
        resolveEnvToken('$LINEAR_API_KEY'),
      project_slug: resolveEnvToken(tracker.project_slug),
      active_states: coerceStringList(tracker.active_states, DEFAULT_ACTIVE_STATES),
      terminal_states: coerceStringList(tracker.terminal_states, DEFAULT_TERMINAL_STATES),
      branch:
        typeof tracker.branch === 'string' && tracker.branch.trim()
          ? tracker.branch.trim()
          : 'real',
      agent_capsules: coerceStringList(
        tracker.agent_capsules,
        [...DEFAULT_NINFINITY_CAPSULE_AGENT_IDS],
      ),
      mode: tracker.mode === 'continuous' ? 'continuous' : 'nightly',
      night_start_hour: Math.min(Math.max(parseInteger(tracker.night_start_hour, 1), 0), 23),
      night_end_hour: Math.min(Math.max(parseInteger(tracker.night_end_hour, 5), 0), 23),
      timezone:
        typeof tracker.timezone === 'string' && tracker.timezone.trim()
          ? tracker.timezone.trim()
          : null,
      cooldown_hours: Math.max(parseInteger(tracker.cooldown_hours, 20), 1),
    },
    polling: {
      interval_ms: Math.max(parseInteger(polling.interval_ms, 30_000), 1_000),
    },
    workspace: {
      root: resolvePathValue(workspace.root, path.join(os.tmpdir(), 'symphony_workspaces')),
    },
    hooks: {
      after_create: typeof hooks.after_create === 'string' ? hooks.after_create : null,
      before_run: typeof hooks.before_run === 'string' ? hooks.before_run : null,
      after_run: typeof hooks.after_run === 'string' ? hooks.after_run : null,
      before_remove: typeof hooks.before_remove === 'string' ? hooks.before_remove : null,
      timeout_ms: hookTimeout > 0 ? hookTimeout : 60_000,
    },
    agent: {
      max_concurrent_agents: Math.max(parseInteger(agent.max_concurrent_agents, 10), 1),
      max_turns: Math.max(parseInteger(agent.max_turns, 20), 1),
      max_retry_backoff_ms: Math.max(parseInteger(agent.max_retry_backoff_ms, 300_000), 1_000),
      max_concurrent_agents_by_state: parseStateConcurrency(agent.max_concurrent_agents_by_state),
      continue_after_success: agent.continue_after_success !== false,
    },
    codex: {
      command:
        typeof codex.command === 'string' && codex.command.trim()
          ? codex.command.trim()
          : 'codex app-server',
      approval_policy: codex.approval_policy ?? null,
      thread_sandbox: codex.thread_sandbox ?? null,
      turn_sandbox_policy: codex.turn_sandbox_policy ?? null,
      turn_timeout_ms: Math.max(parseInteger(codex.turn_timeout_ms, 3_600_000), 1_000),
      read_timeout_ms: Math.max(parseInteger(codex.read_timeout_ms, 5_000), 1_000),
      stall_timeout_ms: parseInteger(codex.stall_timeout_ms, 300_000),
    },
    server: {
      port:
        server.port === undefined || server.port === null
          ? null
          : parseInteger(server.port, Number.NaN),
    },
  };
}

export function validateDispatchConfig(runtime: WorkflowRuntime): ValidationError[] {
  const errors: ValidationError[] = [];
  const { config } = runtime;

  if (!config.tracker.kind) {
    errors.push({ code: 'unsupported_tracker_kind', message: 'tracker.kind is required' });
  } else if (config.tracker.kind !== 'linear' && config.tracker.kind !== 'capsule_graph') {
    errors.push({
      code: 'unsupported_tracker_kind',
      message: `Unsupported tracker.kind: ${config.tracker.kind}`,
    });
  }

  if (config.tracker.kind === 'linear') {
    if (!config.tracker.api_key) {
      errors.push({
        code: 'missing_tracker_api_key',
        message: 'tracker.api_key is required after environment resolution',
      });
    }

    if (!config.tracker.project_slug) {
      errors.push({
        code: 'missing_tracker_project_slug',
        message: 'tracker.project_slug is required for Linear',
      });
    }
  }

  if (config.tracker.kind === 'capsule_graph' && config.tracker.agent_capsules.length === 0) {
    errors.push({
      code: 'missing_capsule_graph_agents',
      message: 'tracker.agent_capsules must contain at least one N-Infinity agent capsule',
    });
  }

  if (!config.codex.command.trim()) {
    errors.push({
      code: 'missing_codex_command',
      message: 'codex.command must be present and non-empty',
    });
  }

  return errors;
}

export async function loadWorkflowRuntime(inputPath?: string): Promise<WorkflowRuntime> {
  const definition = await loadWorkflowDefinition(inputPath);
  return {
    definition,
    config: parseWorkflowConfig(definition, inputPath),
  };
}
