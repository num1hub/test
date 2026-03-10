// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getLocalCodexAvailabilityMock,
  runLocalCodexStructuredTaskMock,
} = vi.hoisted(() => ({
  getLocalCodexAvailabilityMock: vi.fn(),
  runLocalCodexStructuredTaskMock: vi.fn(),
}));

vi.mock('@/lib/agents/localCodex', () => ({
  getLocalCodexAvailability: getLocalCodexAvailabilityMock,
  runLocalCodexStructuredTask: runLocalCodexStructuredTaskMock,
}));

import { runVaultStewardCodexReviewer } from '@/lib/agents/vaultSteward';

describe('runVaultStewardCodexReviewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips cleanly when the local codex lane is unavailable', async () => {
    getLocalCodexAvailabilityMock.mockResolvedValue({
      available: false,
      reason: 'missing local codex binary',
    });

    const result = await runVaultStewardCodexReviewer({
      summary: {
        total_capsules: 1,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
        inventory: [],
        candidates: [],
      },
      overview: 'Overview',
      workstream: 'mixed',
      observations: [],
      suggestedActions: [],
      targets: [],
      proposedJobs: [],
      executedJobs: [],
    });

    expect(result.available).toBe(false);
    expect(result.lane.status).toBe('skipped');
    expect(result.lane.error).toBe('missing local codex binary');
  });

  it('returns a completed reviewer lane when structured review succeeds', async () => {
    getLocalCodexAvailabilityMock.mockResolvedValue({
      available: true,
      reason: null,
    });
    runLocalCodexStructuredTaskMock.mockResolvedValue({
      data: {
        review_summary: 'Reviewer summary',
        operator_focus: ['watch queue freshness'],
        risk_flags: ['none'],
        cancel_job_ids: [],
      },
      text: '{"review_summary":"Reviewer summary"}',
      model: 'gpt-5.3-codex',
    });

    const result = await runVaultStewardCodexReviewer({
      summary: {
        total_capsules: 2,
        orphaned_capsules: 1,
        by_type: { foundation: 2 },
        inventory: [],
        candidates: [],
      },
      overview: 'Overview',
      workstream: 'mixed',
      observations: ['obs'],
      suggestedActions: ['action'],
      targets: [],
      proposedJobs: [],
      executedJobs: [],
    });

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.output.review_summary).toBe('Reviewer summary');
      expect(result.lane.status).toBe('completed');
      expect(result.lane.model).toBe('gpt-5.3-codex');
    }
  });
});
