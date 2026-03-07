// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Issue, Logger, WorkflowRuntime } from '@/lib/symphony/types';

const { runAgentAttemptMock } = vi.hoisted(() => ({
  runAgentAttemptMock: vi.fn(),
}));

vi.mock('@/lib/symphony/runner', () => ({
  runAgentAttempt: runAgentAttemptMock,
}));

import { SymphonyOrchestrator } from '@/lib/symphony/orchestrator';

const noopLogger: Logger = {
  log() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};

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
        max_concurrent_agents: 1,
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

describe('SymphonyOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runAgentAttemptMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules a continuation retry after a successful worker exit', async () => {
    runAgentAttemptMock.mockResolvedValue({
      success: true,
      reason: 'completed',
      error: null,
      turn_count: 1,
    });

    const runtime = createRuntime();
    const issue = createIssue();
    const tracker = {
      fetchCandidateIssues: vi
        .fn()
        .mockResolvedValueOnce([issue])
        .mockResolvedValue([]),
      fetchIssuesByStates: vi.fn().mockResolvedValue([]),
      fetchIssueStatesByIds: vi.fn().mockResolvedValue([issue]),
    };
    const workspaceManager = {
      getWorkspacePath: vi.fn().mockReturnValue('/tmp/symphony-workspaces/ABC-1'),
      removeWorkspace: vi.fn().mockResolvedValue(undefined),
    };

    const orchestrator = new SymphonyOrchestrator(runtime, noopLogger) as unknown as {
      tracker: typeof tracker;
      workspaceManager: typeof workspaceManager;
      start(): Promise<void>;
      stop(): Promise<void>;
      getSnapshot(): ReturnType<SymphonyOrchestrator['getSnapshot']>;
    };
    orchestrator.tracker = tracker;
    orchestrator.workspaceManager = workspaceManager;

    await orchestrator.start();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    const snapshot = orchestrator.getSnapshot();
    expect(runAgentAttemptMock).toHaveBeenCalledTimes(1);
    expect(snapshot.retrying).toEqual([
      expect.objectContaining({
        issue_id: 'issue-1',
        issue_identifier: 'ABC-1',
        attempt: 1,
        error: null,
      }),
    ]);

    await orchestrator.stop();
  });

  it('does not dispatch blocked Todo issues', async () => {
    const blockedIssue = createIssue({
      blocked_by: [
        {
          id: 'issue-0',
          identifier: 'ABC-0',
          state: 'In Progress',
        },
      ],
    });

    const tracker = {
      fetchCandidateIssues: vi.fn().mockResolvedValue([blockedIssue]),
      fetchIssuesByStates: vi.fn().mockResolvedValue([]),
      fetchIssueStatesByIds: vi.fn().mockResolvedValue([]),
    };
    const workspaceManager = {
      getWorkspacePath: vi.fn().mockReturnValue('/tmp/symphony-workspaces/ABC-1'),
      removeWorkspace: vi.fn().mockResolvedValue(undefined),
    };

    const orchestrator = new SymphonyOrchestrator(createRuntime(), noopLogger) as unknown as {
      tracker: typeof tracker;
      workspaceManager: typeof workspaceManager;
      start(): Promise<void>;
      stop(): Promise<void>;
    };
    orchestrator.tracker = tracker;
    orchestrator.workspaceManager = workspaceManager;

    await orchestrator.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(runAgentAttemptMock).not.toHaveBeenCalled();

    await orchestrator.stop();
  });
});
