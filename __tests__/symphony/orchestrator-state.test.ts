// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  buildInitialState,
  buildIssueDetails,
  buildRuntimeSnapshot,
  nextAttempt,
} from '@/lib/symphony/orchestrator-state';
import type {
  Issue,
  OrchestratorRuntimeState,
  RunningEntry,
  WorkflowRuntime,
} from '@/lib/symphony/types';

function createRuntime(): WorkflowRuntime {
  return {
    definition: {
      config: {},
      prompt_template: 'Issue {{ issue.identifier }}',
    },
    config: {
      workflow_path: '/tmp/WORKFLOW.md',
      tracker: {
        kind: 'linear',
        endpoint: 'https://api.linear.app/graphql',
        api_key: 'token',
        project_slug: 'proj',
        active_states: ['Todo', 'In Progress'],
        terminal_states: ['Done', 'Cancelled'],
        branch: 'real',
        agent_capsules: ['capsule.foundation.n-infinity.weaver.v1'],
        mode: 'nightly',
        night_start_hour: 1,
        night_end_hour: 5,
        timezone: 'America/Los_Angeles',
        cooldown_hours: 20,
      },
      polling: { interval_ms: 30000 },
      workspace: { root: '/tmp/symphony-workspaces' },
      hooks: {
        after_create: null,
        before_run: null,
        after_run: null,
        before_remove: null,
        timeout_ms: 1000,
      },
      agent: {
        max_concurrent_agents: 2,
        max_turns: 1,
        max_retry_backoff_ms: 300000,
        max_concurrent_agents_by_state: {},
        continue_after_success: true,
      },
      codex: {
        command: 'codex app-server',
        approval_policy: null,
        thread_sandbox: null,
        turn_sandbox_policy: null,
        turn_timeout_ms: 1000,
        read_timeout_ms: 1000,
        stall_timeout_ms: 1000,
      },
      server: {
        port: null,
      },
    },
  };
}

function createIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'issue-1',
    identifier: 'ABC-1',
    title: 'Example',
    description: null,
    priority: 1,
    state: 'Todo',
    branch_name: null,
    url: null,
    labels: [],
    blocked_by: [],
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function createRunningEntry(issue: Issue): RunningEntry {
  return {
    issue,
    issue_id: issue.id,
    identifier: issue.identifier,
    worker: null,
    stop: null,
    retry_attempt: 2,
    started_at: '2026-03-10T00:00:00.000Z',
    workspace_path: '/tmp/symphony-workspaces/ABC-1',
    last_error: 'stalled session',
    session_id: 'session-1',
    thread_id: 'thread-1',
    turn_id: 'turn-1',
    codex_app_server_pid: '123',
    last_codex_event: 'turn_completed',
    last_codex_timestamp: '2026-03-10T00:05:00.000Z',
    last_codex_message: 'ok',
    codex_input_tokens: 11,
    codex_output_tokens: 7,
    codex_total_tokens: 18,
    last_reported_input_tokens: 11,
    last_reported_output_tokens: 7,
    last_reported_total_tokens: 18,
    turn_count: 3,
    stop_requested: false,
    release_on_exit: false,
    cleanup_on_exit: false,
    desired_retry_attempt: null,
    desired_retry_error: null,
  };
}

describe('Symphony orchestrator-state seam', () => {
  it('builds the initial orchestrator state from runtime config', () => {
    const state = buildInitialState(createRuntime());

    expect(state.poll_interval_ms).toBe(30000);
    expect(state.max_concurrent_agents).toBe(2);
    expect(state.running.size).toBe(0);
    expect(state.retry_attempts.size).toBe(0);
    expect(nextAttempt(null)).toBe(1);
    expect(nextAttempt(2)).toBe(3);
  });

  it('renders runtime snapshots with running and retry entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:10:00.000Z'));

    const issue = createIssue();
    const running = createRunningEntry(issue);
    const state: OrchestratorRuntimeState = buildInitialState(createRuntime());
    state.codex_totals.seconds_running = 4;
    state.running.set(issue.id, running);
    state.retry_attempts.set(issue.id, {
      issue_id: issue.id,
      identifier: issue.identifier,
      attempt: 3,
      due_at_ms: 1000,
      timer_handle: null,
      error: 'retry me',
    });

    const snapshot = buildRuntimeSnapshot(state, {
      generatedAt: '2026-03-10T00:10:00.000Z',
      nowMs: Date.now(),
      nowMonotonicMs: 500,
    });

    expect(snapshot.generated_at).toBe('2026-03-10T00:10:00.000Z');
    expect(snapshot.counts).toEqual({ running: 1, retrying: 1 });
    expect(snapshot.running[0]).toEqual(
      expect.objectContaining({
        issue_id: 'issue-1',
        issue_identifier: 'ABC-1',
        session_id: 'session-1',
        turn_count: 3,
      }),
    );
    expect(snapshot.retrying[0]).toEqual(
      expect.objectContaining({
        issue_id: 'issue-1',
        issue_identifier: 'ABC-1',
        attempt: 3,
        error: 'retry me',
        due_at: '2026-03-10T00:10:00.500Z',
      }),
    );
    expect(snapshot.codex_totals.seconds_running).toBe(604);

    vi.useRealTimers();
  });

  it('renders issue details for running and retrying entries', () => {
    const runningIssue = createIssue();
    const retryIssue = createIssue({ id: 'issue-2', identifier: 'ABC-2' });
    const state: OrchestratorRuntimeState = buildInitialState(createRuntime());
    state.running.set(runningIssue.id, createRunningEntry(runningIssue));
    state.retry_attempts.set(retryIssue.id, {
      issue_id: retryIssue.id,
      identifier: retryIssue.identifier,
      attempt: 4,
      due_at_ms: 1200,
      timer_handle: null,
      error: 'slots busy',
    });

    const runningDetails = buildIssueDetails(state, 'ABC-1', {
      nowMs: new Date('2026-03-10T00:10:00.000Z').valueOf(),
      nowMonotonicMs: 1000,
    });
    const retryDetails = buildIssueDetails(state, 'ABC-2', {
      nowMs: new Date('2026-03-10T00:10:00.000Z').valueOf(),
      nowMonotonicMs: 1000,
    });

    expect(runningDetails).toEqual(
      expect.objectContaining({
        issue_identifier: 'ABC-1',
        status: 'running',
        last_error: 'stalled session',
      }),
    );
    expect(retryDetails).toEqual(
      expect.objectContaining({
        issue_identifier: 'ABC-2',
        status: 'retrying',
        last_error: 'slots busy',
        retry: expect.objectContaining({
          attempt: 4,
          due_at: '2026-03-10T00:10:00.200Z',
          error: 'slots busy',
        }),
      }),
    );
  });
});
