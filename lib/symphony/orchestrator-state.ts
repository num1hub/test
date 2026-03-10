import type {
  Issue,
  OrchestratorRuntimeState,
  RuntimeSnapshot,
  WorkflowRuntime,
} from './types';
import { isoNow, monotonicNowMs } from './utils';

export function nextAttempt(value: number | null): number {
  return (value ?? 0) + 1;
}

export function buildInitialState(runtime: WorkflowRuntime): OrchestratorRuntimeState {
  return {
    poll_interval_ms: runtime.config.polling.interval_ms,
    max_concurrent_agents: runtime.config.agent.max_concurrent_agents,
    running: new Map(),
    claimed: new Set(),
    retry_attempts: new Map(),
    completed: new Set(),
    codex_totals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0,
    },
    codex_rate_limits: null,
  };
}

export function issueFields(issue: Issue): { issue_id: string; issue_identifier: string } {
  return {
    issue_id: issue.id,
    issue_identifier: issue.identifier,
  };
}

function toDueAtIso(
  dueAtMs: number,
  nowMs = Date.now(),
  nowMonotonicMs = monotonicNowMs(),
): string {
  return new Date(nowMs + Math.max(dueAtMs - nowMonotonicMs, 0)).toISOString();
}

export function buildRuntimeSnapshot(
  state: OrchestratorRuntimeState,
  options: { generatedAt?: string; nowMs?: number; nowMonotonicMs?: number } = {},
): RuntimeSnapshot {
  const nowMs = options.nowMs ?? Date.now();
  const nowMonotonicMs = options.nowMonotonicMs ?? monotonicNowMs();
  const generatedAt = options.generatedAt ?? isoNow();
  const activeSeconds = [...state.running.values()].reduce((sum, entry) => {
    return sum + (nowMs - new Date(entry.started_at).valueOf()) / 1000;
  }, 0);

  return {
    generated_at: generatedAt,
    counts: {
      running: state.running.size,
      retrying: state.retry_attempts.size,
    },
    running: [...state.running.values()].map((entry) => ({
      issue_id: entry.issue_id,
      issue_identifier: entry.identifier,
      state: entry.issue.state,
      session_id: entry.session_id,
      turn_count: entry.turn_count,
      last_event: entry.last_codex_event,
      last_message: entry.last_codex_message,
      started_at: entry.started_at,
      last_event_at: entry.last_codex_timestamp,
      tokens: {
        input_tokens: entry.codex_input_tokens,
        output_tokens: entry.codex_output_tokens,
        total_tokens: entry.codex_total_tokens,
      },
    })),
    retrying: [...state.retry_attempts.values()].map((entry) => ({
      issue_id: entry.issue_id,
      issue_identifier: entry.identifier,
      attempt: entry.attempt,
      due_at: toDueAtIso(entry.due_at_ms, nowMs, nowMonotonicMs),
      error: entry.error,
    })),
    codex_totals: {
      ...state.codex_totals,
      seconds_running: state.codex_totals.seconds_running + activeSeconds,
    },
    rate_limits: state.codex_rate_limits,
  };
}

export function buildIssueDetails(
  state: OrchestratorRuntimeState,
  identifier: string,
  options: { nowMs?: number; nowMonotonicMs?: number } = {},
): Record<string, unknown> | null {
  const nowMs = options.nowMs ?? Date.now();
  const nowMonotonicMs = options.nowMonotonicMs ?? monotonicNowMs();
  const running = [...state.running.values()].find((entry) => entry.identifier === identifier);
  const retry = [...state.retry_attempts.values()].find((entry) => entry.identifier === identifier);

  if (!running && !retry) return null;

  return {
    issue_identifier: identifier,
    issue_id: running?.issue_id ?? retry?.issue_id ?? null,
    status: running ? 'running' : retry ? 'retrying' : 'unknown',
    workspace: running
      ? {
          path: running.workspace_path,
        }
      : null,
    attempts: {
      restart_count: running?.retry_attempt ?? retry?.attempt ?? 0,
      current_retry_attempt: retry?.attempt ?? running?.retry_attempt ?? 0,
    },
    running: running
      ? {
          session_id: running.session_id,
          turn_count: running.turn_count,
          state: running.issue.state,
          started_at: running.started_at,
          last_event: running.last_codex_event,
          last_message: running.last_codex_message,
          last_event_at: running.last_codex_timestamp,
          tokens: {
            input_tokens: running.codex_input_tokens,
            output_tokens: running.codex_output_tokens,
            total_tokens: running.codex_total_tokens,
          },
        }
      : null,
    retry: retry
      ? {
          attempt: retry.attempt,
          due_at: toDueAtIso(retry.due_at_ms, nowMs, nowMonotonicMs),
          error: retry.error,
        }
      : null,
    last_error: running?.last_error ?? retry?.error ?? null,
  };
}
