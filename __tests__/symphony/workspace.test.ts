// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { StructuredLogger } from '@/lib/symphony/logger';
import type { SymphonyConfig } from '@/lib/symphony/types';
import { WorkspaceManager } from '@/lib/symphony/workspace';

async function makeTempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'symphony-workspace-test-'));
}

function createConfig(root: string): SymphonyConfig {
  return {
    workflow_path: '/tmp/WORKFLOW.md',
    tracker: {
      kind: 'linear',
      endpoint: 'https://api.linear.app/graphql',
      api_key: 'token',
      project_slug: 'proj',
      active_states: ['Todo'],
      terminal_states: ['Done'],
      branch: 'real',
      agent_capsules: ['capsule.foundation.n-infinity.weaver.v1'],
      mode: 'nightly',
      night_start_hour: 1,
      night_end_hour: 5,
      timezone: 'America/Los_Angeles',
      cooldown_hours: 20,
    },
    polling: { interval_ms: 30000 },
    workspace: { root },
    hooks: {
      after_create: 'printf "%s|%s" "$SYMPHONY_ISSUE_IDENTIFIER" "$SYMPHONY_PROJECT_ROOT" > created.txt',
      before_run: 'mkdir -p marker && echo before > marker/before.txt',
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

describe('WorkspaceManager', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
    roots.length = 0;
  });

  it('creates deterministic sanitized workspaces and runs hooks', async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const manager = new WorkspaceManager(createConfig(root), new StructuredLogger());

    const workspace = await manager.createForIssue('ABC/123');
    expect(workspace.workspace_key).toBe('ABC_123');
    expect(workspace.created_now).toBe(true);
    expect(await fs.readFile(path.join(workspace.path, 'created.txt'), 'utf-8')).toContain('ABC/123|/tmp');

    const reused = await manager.createForIssue('ABC/123');
    expect(reused.created_now).toBe(false);

    await fs.mkdir(path.join(workspace.path, 'tmp'), { recursive: true });
    await fs.mkdir(path.join(workspace.path, '.elixir_ls'), { recursive: true });
    await manager.runBeforeRun(workspace.path);

    await expect(fs.stat(path.join(workspace.path, 'tmp'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(workspace.path, '.elixir_ls'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(
      await fs.readFile(path.join(workspace.path, 'marker', 'before.txt'), 'utf-8'),
    ).toContain('before');
  });
});
