import { createAuthToken } from '@/__tests__/helpers/auth'
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchAiLaneStatusesMock,
  refreshAiLanesMock,
} = vi.hoisted(() => ({
  fetchAiLaneStatusesMock: vi.fn(),
  refreshAiLanesMock: vi.fn(),
}));

vi.mock('@/lib/ai/controlSurface', () => ({
  fetchAiLaneStatuses: fetchAiLaneStatusesMock,
  refreshAiLanes: refreshAiLanesMock,
}));

import { GET, POST } from '@/app/api/ai/control-state/route';

describe('app/api/ai/control-state/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns lane states for authorized requests', async () => {
    fetchAiLaneStatusesMock.mockResolvedValue([
      {
        id: 'symphony',
        label: 'Symphony',
        origin: 'http://127.0.0.1:4310',
        state_url: 'http://127.0.0.1:4310/api/v1/state',
        refresh_url: 'http://127.0.0.1:4310/api/v1/refresh',
        status: 'online',
        snapshot: {
          generated_at: '2026-03-06T18:00:00.000Z',
          counts: { running: 1, retrying: 0 },
        },
        error: null,
      },
    ]);

    const request = new Request('http://localhost/api/ai/control-state', {
      headers: {
        Authorization: `Bearer ${createAuthToken()}`,
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.lanes).toHaveLength(1);
  });

  it('refreshes the requested lane set for authorized requests', async () => {
    refreshAiLanesMock.mockResolvedValue([
      {
        id: 'ninfinity',
        label: 'N-Infinity',
        ok: true,
        origin: 'http://127.0.0.1:4311',
        response: { queued: true },
        error: null,
      },
    ]);

    const request = new Request('http://localhost/api/ai/control-state', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lane: 'ninfinity',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(refreshAiLanesMock).toHaveBeenCalledWith('ninfinity');
  });
});
