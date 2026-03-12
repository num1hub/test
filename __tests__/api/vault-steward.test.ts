import { createAuthToken } from '@/__tests__/helpers/auth'
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getVaultStewardStateMock,
  updateVaultStewardConfigMock,
  startVaultStewardMock,
  stopVaultStewardMock,
  runVaultStewardOnceMock,
} = vi.hoisted(() => ({
  getVaultStewardStateMock: vi.fn(),
  updateVaultStewardConfigMock: vi.fn(),
  startVaultStewardMock: vi.fn(),
  stopVaultStewardMock: vi.fn(),
  runVaultStewardOnceMock: vi.fn(),
}));

vi.mock('@/lib/agents/vaultSteward', () => ({
  getVaultStewardState: getVaultStewardStateMock,
  updateVaultStewardConfig: updateVaultStewardConfigMock,
  startVaultSteward: startVaultStewardMock,
  stopVaultSteward: stopVaultStewardMock,
  runVaultStewardOnce: runVaultStewardOnceMock,
}));

import { GET, POST, PUT } from '@/app/api/agents/vault-steward/route';

const AUTH_HEADER = {
  Authorization: `Bearer ${createAuthToken()}`,
};

describe('app/api/agents/vault-steward/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Vault Steward state for authorized requests', async () => {
    getVaultStewardStateMock.mockResolvedValue({
      config: { enabled: true },
      runtime: { status: 'running' },
      latest_run: null,
      queue: { jobs: [] },
    });

    const response = await GET(
      new Request('http://localhost/api/agents/vault-steward', {
        headers: AUTH_HEADER,
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.runtime.status).toBe('running');
  });

  it('updates config and normalizes auto provider', async () => {
    updateVaultStewardConfigMock.mockResolvedValue({
      config: { enabled: true, provider: null },
      runtime: { status: 'starting' },
      latest_run: null,
      queue: { jobs: [] },
    });

    const response = await PUT(
      new Request('http://localhost/api/agents/vault-steward', {
        method: 'PUT',
        headers: {
          ...AUTH_HEADER,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: true,
          provider: 'auto',
          mode: 'nightly',
          interval_minutes: 15,
          night_start_hour: 1,
          night_end_hour: 6,
          max_targets_per_run: 4,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateVaultStewardConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        provider: 'auto',
        interval_minutes: 15,
      }),
    );
  });

  it('runs a one-off cycle on demand', async () => {
    runVaultStewardOnceMock.mockResolvedValue({
      run_id: 'vault-steward-1',
      status: 'completed',
      overview: 'Run completed',
    });

    const response = await POST(
      new Request('http://localhost/api/agents/vault-steward', {
        method: 'POST',
        headers: {
          ...AUTH_HEADER,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run_once' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(runVaultStewardOnceMock).toHaveBeenCalledTimes(1);
    const payload = await response.json();
    expect(payload.run.run_id).toBe('vault-steward-1');
  });
});
