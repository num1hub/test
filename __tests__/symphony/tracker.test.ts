// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StructuredLogger } from '@/lib/symphony/logger';
import { CapsuleGraphTrackerClient, LinearTrackerClient } from '@/lib/symphony/tracker';
import type { SymphonyConfig } from '@/lib/symphony/types';

function createConfig(): SymphonyConfig {
  return {
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
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('LinearTrackerClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('paginates candidate issues and normalizes labels and blockers', async () => {
    const requestBodies: Array<{ query: string; variables: Record<string, unknown> }> = [];

    fetchMock
      .mockImplementationOnce(async (_url: string, init?: RequestInit) => {
        requestBodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({
          data: {
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  identifier: 'ABC-1',
                  title: 'First',
                  description: null,
                  priority: 1,
                  branchName: null,
                  url: null,
                  createdAt: '2026-03-01T00:00:00.000Z',
                  updatedAt: '2026-03-02T00:00:00.000Z',
                  state: { name: 'Todo' },
                  labels: { nodes: [{ name: 'Backend' }] },
                  inverseRelations: {
                    nodes: [
                      {
                        issue: {
                          id: 'blocker-1',
                          identifier: 'ABC-0',
                          state: { name: 'In Progress' },
                        },
                      },
                    ],
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
            },
          },
        });
      })
      .mockImplementationOnce(async (_url: string, init?: RequestInit) => {
        requestBodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({
          data: {
            issues: {
              nodes: [
                {
                  id: 'issue-2',
                  identifier: 'ABC-2',
                  title: 'Second',
                  description: 'desc',
                  priority: 2,
                  branchName: 'feature/abc-2',
                  url: 'https://linear.app/issue/ABC-2',
                  createdAt: '2026-03-03T00:00:00.000Z',
                  updatedAt: '2026-03-04T00:00:00.000Z',
                  state: { name: 'In Progress' },
                  labels: { nodes: [] },
                  inverseRelations: { nodes: [] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      });

    const client = new LinearTrackerClient(createConfig(), new StructuredLogger());
    const issues = await client.fetchCandidateIssues();

    expect(issues.map((issue) => issue.identifier)).toEqual(['ABC-1', 'ABC-2']);
    expect(issues[0]?.labels).toEqual(['backend']);
    expect(issues[0]?.blocked_by).toEqual([
      {
        id: 'blocker-1',
        identifier: 'ABC-0',
        state: 'In Progress',
      },
    ]);
    expect(requestBodies[0]?.variables).toMatchObject({
      projectSlug: 'proj',
      stateNames: ['Todo', 'In Progress'],
      after: null,
    });
    expect(requestBodies[1]?.variables).toMatchObject({
      after: 'cursor-1',
    });
  });

  it('uses GraphQL ID typing when refreshing issue states', async () => {
    const requestBodies: Array<{ query: string; variables: Record<string, unknown> }> = [];
    fetchMock.mockImplementationOnce(async (_url: string, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> });
      return jsonResponse({
        data: {
          issues: {
            nodes: [],
          },
        },
      });
    });

    const client = new LinearTrackerClient(createConfig(), new StructuredLogger());
    await client.fetchIssueStatesByIds(['issue-1']);

    const requestBody = requestBodies[0];
    expect(requestBody).not.toBeNull();
    if (!requestBody) {
      throw new Error('request body was not captured');
    }

    expect(requestBody.query).toContain('query SymphonyIssueStates($ids: [ID!])');
    expect(requestBody.variables).toEqual({ ids: ['issue-1'] });
  });

  it('builds local capsule_graph issues only inside the configured night window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T11:30:00.000Z'));

    const config = createConfig();
    config.tracker.kind = 'capsule_graph';
    config.tracker.active_states = ['Night Shift'];
    const client = new CapsuleGraphTrackerClient(config, new StructuredLogger());
    const issues = await client.fetchCandidateIssues();

    expect(issues).toHaveLength(1);
    expect(issues[0]?.identifier).toContain('NINF-WEAVER');
    expect(issues[0]?.labels).toContain('capsule-graph');

    vi.setSystemTime(new Date('2026-03-06T18:30:00.000Z'));
    const pausedIssues = await client.fetchCandidateIssues();
    expect(pausedIssues).toEqual([]);

    vi.useRealTimers();
  });
});
