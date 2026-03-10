// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const tempRoots: string[] = [];
const originalCwd = process.cwd();

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-steward-lifecycle-'));
  tempRoots.push(root);
  return root;
}

async function loadVaultSteward(root: string) {
  process.chdir(root);
  vi.resetModules();
  return import('@/lib/agents/vaultSteward');
}

afterEach(() => {
  process.chdir(originalCwd);
  vi.resetModules();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe('vaultSteward lifecycle seam', () => {
  it('records a failed start when the tsx runtime is missing under the current repo root', async () => {
    const root = makeTempRoot();
    const { startVaultSteward, getVaultStewardState } = await loadVaultSteward(root);

    const runtime = await startVaultSteward();
    const state = await getVaultStewardState();

    expect(runtime.status).toBe('stopped');
    expect(runtime.last_error).toContain('tsx runtime not found');
    expect(state.runtime.status).toBe('stopped');
    expect(state.runtime.last_error).toContain('tsx runtime not found');
  });

  it('writes heartbeat state and then stops cleanly through the public surface', async () => {
    const root = makeTempRoot();
    const runtimePath = path.join(root, 'data/private/agents/vault-steward.runtime.json');
    const { markVaultStewardHeartbeat, stopVaultSteward } = await loadVaultSteward(root);

    await markVaultStewardHeartbeat({
      status: 'running',
      pid: null,
      started_at: '2026-03-10T10:00:00.000Z',
      last_heartbeat_at: '2026-03-10T10:05:00.000Z',
      updated_at: '2026-03-10T10:05:00.000Z',
    });

    const heartbeatRuntime = JSON.parse(fs.readFileSync(runtimePath, 'utf8')) as {
      status: string;
      last_heartbeat_at: string | null;
    };
    expect(heartbeatRuntime.status).toBe('running');
    expect(heartbeatRuntime.last_heartbeat_at).toBe('2026-03-10T10:05:00.000Z');

    const stopped = await stopVaultSteward();
    const stoppedRuntime = JSON.parse(fs.readFileSync(runtimePath, 'utf8')) as {
      status: string;
      pid: number | null;
      next_scheduled_at: string | null;
    };

    expect(stopped.status).toBe('stopped');
    expect(stopped.pid).toBeNull();
    expect(stoppedRuntime.status).toBe('stopped');
    expect(stoppedRuntime.pid).toBeNull();
    expect(stoppedRuntime.next_scheduled_at).toBeNull();
  });
});
