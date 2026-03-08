// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { SovereignCapsule } from '@/types/capsule';
import {
  applyQueueCooldownToSummary,
  buildFallbackJobsFromTargets,
  computeAdaptiveDaemonDelay,
  filterNewJobsAgainstQueue,
  isVaultStewardProcessCommand,
  mergeJobs,
  rankSwarmApiProviders,
  shouldBypassCodexForemanCadenceHold,
  shouldRunCodexForeman,
  selectExecutorJobsForRun,
  summarizeVaultSignals,
} from '@/lib/agents/vaultSteward';
import { computeIntegrityHash } from '@/lib/validator/utils';

function makeCapsule(
  capsuleId: string,
  overrides: Partial<SovereignCapsule> = {},
): SovereignCapsule {
  const base: SovereignCapsule = {
    metadata: {
      capsule_id: capsuleId,
      type: 'foundation',
      subtype: 'atomic',
      status: 'sovereign',
      name: capsuleId,
      progress: 80,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# ${capsuleId}`,
    },
    neuro_concentrate: {
      summary: 'Short summary',
      keywords: ['one', 'two'],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
    },
    recursive_layer: {
      links: [],
    },
    integrity_sha3_512: '',
  };

  const merged: SovereignCapsule = {
    ...base,
    ...overrides,
    metadata: {
      ...base.metadata,
      ...(overrides.metadata ?? {}),
    },
    core_payload: {
      ...base.core_payload,
      ...(overrides.core_payload ?? {}),
    },
    neuro_concentrate: {
      ...base.neuro_concentrate,
      ...(overrides.neuro_concentrate ?? {}),
    },
    recursive_layer: {
      ...base.recursive_layer,
      ...(overrides.recursive_layer ?? {}),
    },
    integrity_sha3_512: '',
  };

  merged.integrity_sha3_512 = computeIntegrityHash(merged);
  return merged;
}

describe('summarizeVaultSignals', () => {
  it('surfaces high-signal maintenance candidates from the current graph', () => {
    const hub = makeCapsule('capsule.foundation.big-hub.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.big-hub.v1',
        subtype: 'hub',
        progress: 25,
        name: 'Big Hub',
      },
      recursive_layer: {
        links: Array.from({ length: 12 }, (_, index) => ({
          target_id: `capsule.foundation.child-${index}.v1`,
          relation_type: 'references',
        })),
      },
      neuro_concentrate: {
        summary: 'Tiny',
        keywords: ['hub'],
      },
    });
    const weak = makeCapsule('capsule.foundation.lonely.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.lonely.v1',
        progress: 20,
        name: 'Lonely Capsule',
      },
      neuro_concentrate: {
        summary: 'Short',
        keywords: ['lonely'],
      },
    });
    const linked = makeCapsule('capsule.foundation.healthy.v1', {
      neuro_concentrate: {
        summary:
          'This capsule already has a longer summary and better metadata coverage than the others in this test harness.',
        keywords: ['healthy', 'capsule', 'graph', 'coverage', 'links', 'metadata'],
      },
      recursive_layer: {
        links: [{ target_id: weak.metadata.capsule_id, relation_type: 'references' }],
      },
    });

    const summary = summarizeVaultSignals([hub, weak, linked], 4);

    expect(summary.total_capsules).toBe(3);
    expect(summary.by_type.foundation).toBe(3);
    expect(summary.candidates.map((entry) => entry.capsule_id)).toContain(hub.metadata.capsule_id);
    expect(summary.candidates.map((entry) => entry.capsule_id)).toContain(weak.metadata.capsule_id);
    expect(summary.candidates[0]?.reasons.length).toBeGreaterThan(0);
  });
});

describe('vault inventory summary', () => {
  it('includes the full capsule inventory so the agent can plan against the whole vault', () => {
    const capsules = [
      makeCapsule('capsule.foundation.example-a.v1'),
      makeCapsule('capsule.project.example-b.v1', {
        metadata: {
          capsule_id: 'capsule.project.example-b.v1',
          type: 'project',
          status: 'active',
          progress: 40,
        },
      }),
    ];

    const summary = summarizeVaultSignals(capsules, 4);

    expect(summary.inventory).toHaveLength(2);
    expect(summary.inventory.map((entry) => entry.capsule_id)).toEqual(
      expect.arrayContaining(['capsule.foundation.example-a.v1', 'capsule.project.example-b.v1']),
    );
    expect(summary.inventory.find((entry) => entry.capsule_id === 'capsule.project.example-b.v1')?.type).toBe(
      'project',
    );
  });
});

describe('applyQueueCooldownToSummary', () => {
  it('suppresses candidates that already have full maintenance coverage in queue history', () => {
    const dense = makeCapsule('capsule.foundation.personal-ai-assistant.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.personal-ai-assistant.v1',
        subtype: 'hub',
        progress: 43,
        name: 'Personal AI Assistant',
      },
      recursive_layer: {
        links: Array.from({ length: 14 }, (_, index) => ({
          target_id: `capsule.foundation.assistant-child-${index}.v1`,
          relation_type: 'references',
        })),
      },
      neuro_concentrate: {
        summary: 'Dense assistant hub',
        keywords: ['assistant'],
      },
    });
    const nextCandidate = makeCapsule('capsule.foundation.workspace.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.workspace.v1',
        subtype: 'hub',
        progress: 40,
        name: 'Workspace',
      },
      recursive_layer: {
        links: Array.from({ length: 12 }, (_, index) => ({
          target_id: `capsule.foundation.workspace-child-${index}.v1`,
          relation_type: 'references',
        })),
      },
      neuro_concentrate: {
        summary: 'Dense workspace hub',
        keywords: ['workspace'],
      },
    });

    const summary = summarizeVaultSignals([dense, nextCandidate], 6);
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-decomp',
          label: 'Decompose Personal AI Assistant',
          goal: 'Decompose',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-08T02:00:00.000Z',
          source_run_id: 'run-1',
          status: 'completed' as const,
        },
        {
          id: 'job-markup',
          label: 'Markup Personal AI Assistant',
          goal: 'Markup',
          workstream: 'markup' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-08T03:00:00.000Z',
          source_run_id: 'run-2',
          status: 'completed' as const,
        },
        {
          id: 'job-graph',
          label: 'Graph Personal AI Assistant',
          goal: 'Graph refactor',
          workstream: 'graph_refactor' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-08T04:00:00.000Z',
          source_run_id: 'run-3',
          status: 'completed' as const,
        },
        {
          id: 'job-mixed',
          label: 'Mixed Personal AI Assistant',
          goal: 'Mixed',
          workstream: 'mixed' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-08T05:00:00.000Z',
          source_run_id: 'run-4',
          status: 'completed' as const,
        },
      ],
    };

    const cooled = applyQueueCooldownToSummary(summary, queue, Date.parse('2026-03-08T07:30:00.000Z'));

    expect(cooled.candidates.map((entry) => entry.capsule_id)).not.toContain(
      'capsule.foundation.personal-ai-assistant.v1',
    );
    expect(cooled.candidates.map((entry) => entry.capsule_id)).toContain(
      'capsule.foundation.workspace.v1',
    );
  });

  it('allows previously fully covered capsules to resurface after the recent-activity window expires', () => {
    const dense = makeCapsule('capsule.foundation.personal-ai-assistant.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.personal-ai-assistant.v1',
        subtype: 'hub',
        progress: 43,
        name: 'Personal AI Assistant',
      },
      recursive_layer: {
        links: Array.from({ length: 14 }, (_, index) => ({
          target_id: `capsule.foundation.assistant-child-${index}.v1`,
          relation_type: 'references',
        })),
      },
      neuro_concentrate: {
        summary: 'Dense assistant hub',
        keywords: ['assistant'],
      },
    });

    const summary = summarizeVaultSignals([dense], 6);
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-decomp',
          label: 'Decompose Personal AI Assistant',
          goal: 'Decompose',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T02:00:00.000Z',
          source_run_id: 'run-1',
          status: 'completed' as const,
        },
        {
          id: 'job-markup',
          label: 'Markup Personal AI Assistant',
          goal: 'Markup',
          workstream: 'markup' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T03:00:00.000Z',
          source_run_id: 'run-2',
          status: 'completed' as const,
        },
        {
          id: 'job-graph',
          label: 'Graph Personal AI Assistant',
          goal: 'Graph refactor',
          workstream: 'graph_refactor' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T04:00:00.000Z',
          source_run_id: 'run-3',
          status: 'completed' as const,
        },
        {
          id: 'job-mixed',
          label: 'Mixed Personal AI Assistant',
          goal: 'Mixed',
          workstream: 'mixed' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T05:00:00.000Z',
          source_run_id: 'run-4',
          status: 'completed' as const,
        },
      ],
    };

    const cooled = applyQueueCooldownToSummary(summary, queue, Date.parse('2026-03-08T18:30:00.000Z'));

    expect(cooled.candidates.map((entry) => entry.capsule_id)).toContain(
      'capsule.foundation.personal-ai-assistant.v1',
    );
  });
});

describe('selectExecutorJobsForRun', () => {
  it('diversifies executor workstreams instead of always taking the first queued jobs', () => {
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-decomp-oldest',
          label: 'Decompose alpha',
          goal: 'Split pressure',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.alpha.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:00:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
        {
          id: 'job-markup-next',
          label: 'Markup beta',
          goal: 'Improve clarity',
          workstream: 'markup' as const,
          capsule_ids: ['capsule.foundation.beta.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:01:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
        {
          id: 'job-graph-latest',
          label: 'Refactor gamma graph notes',
          goal: 'Improve graph-facing clarity',
          workstream: 'graph_refactor' as const,
          capsule_ids: ['capsule.foundation.gamma.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:02:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
      ],
    };

    const selected = selectExecutorJobsForRun(queue, 2);

    expect(selected).toHaveLength(2);
    expect(selected.map((job) => job.workstream)).toEqual(['graph_refactor', 'markup']);
  });

  it('ignores non-dream and non-queued jobs when selecting executor work', () => {
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-completed',
          label: 'Completed one',
          goal: 'Already done',
          workstream: 'markup' as const,
          capsule_ids: ['capsule.foundation.done.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:00:00.000Z',
          source_run_id: 'run-1',
          status: 'completed' as const,
        },
        {
          id: 'job-real',
          label: 'Real branch',
          goal: 'Should not execute',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.real.v1'],
          suggested_branch: 'real' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:01:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
        {
          id: 'job-dream',
          label: 'Dream branch',
          goal: 'Should execute',
          workstream: 'mixed' as const,
          capsule_ids: ['capsule.foundation.dream.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-07T00:02:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
      ],
    };

    const selected = selectExecutorJobsForRun(queue, 2);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.id).toBe('job-dream');
  });
});

describe('buildFallbackJobsFromTargets', () => {
  it('seeds follow-up workstreams when the original workstream was already completed', () => {
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-completed-decomposition',
          label: 'Done decomposition',
          goal: 'Already handled',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.alpha.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T00:00:00.000Z',
          source_run_id: 'run-1',
          status: 'completed' as const,
        },
      ],
    };

    const jobs = buildFallbackJobsFromTargets(
      [
        {
          capsule_id: 'capsule.foundation.alpha.v1',
          reason: 'hub with high link density may need decomposition review',
          priority: 'high' as const,
        },
      ],
      'run-next',
      queue,
      'decomposition',
      2,
    );

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.workstream).toBe('graph_refactor');
    expect(jobs[0]?.needs_human_confirmation).toBe(false);
  });

  it('does not reseed a fallback job that already exists in queue history', () => {
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-existing-markup',
          label: 'Existing markup',
          goal: 'Already queued',
          workstream: 'markup' as const,
          capsule_ids: ['capsule.foundation.beta.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T00:00:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
      ],
    };

    const jobs = buildFallbackJobsFromTargets(
      [
        {
          capsule_id: 'capsule.foundation.beta.v1',
          reason: 'summary is short enough to justify markup or enrichment',
          priority: 'medium' as const,
        },
      ],
      'run-next',
      queue,
      'markup',
      2,
    );

    expect(jobs).toHaveLength(0);
  });
});

describe('filterNewJobsAgainstQueue', () => {
  it('allows reopening a completed job after the recent-activity window has expired', () => {
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-old-completed',
          label: 'Old mixed pass',
          goal: 'Already handled long ago',
          workstream: 'mixed' as const,
          capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: false,
          created_at: '2026-03-07T00:00:00.000Z',
          source_run_id: 'run-1',
          status: 'completed' as const,
        },
      ],
    };

    const proposed = [
      {
        id: 'job-new-mixed',
        label: 'New mixed pass',
        goal: 'Revisit after cooldown',
        workstream: 'mixed' as const,
        capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
        suggested_branch: 'dream' as const,
        needs_human_confirmation: false,
        created_at: '2026-03-08T18:30:00.000Z',
        source_run_id: 'run-2',
        status: 'queued' as const,
      },
    ];

    const filtered = filterNewJobsAgainstQueue(proposed, queue);

    expect(filtered.jobs).toHaveLength(1);
    expect(filtered.skipped).toHaveLength(0);
  });
});

describe('mergeJobs', () => {
  it('lets a new queued revisit replace an old completed duplicate after cooldown expiry', () => {
    const existing = [
      {
        id: 'job-old-completed',
        label: 'Old mixed pass',
        goal: 'Already handled long ago',
        workstream: 'mixed' as const,
        capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
        suggested_branch: 'dream' as const,
        needs_human_confirmation: false,
        created_at: '2026-03-07T00:00:00.000Z',
        source_run_id: 'run-1',
        status: 'completed' as const,
      },
    ];

    const incoming = [
      {
        id: 'job-new-queued',
        label: 'New mixed pass',
        goal: 'Revisit after cooldown',
        workstream: 'mixed' as const,
        capsule_ids: ['capsule.foundation.personal-ai-assistant.v1'],
        suggested_branch: 'dream' as const,
        needs_human_confirmation: false,
        created_at: '2026-03-08T18:30:00.000Z',
        source_run_id: 'run-2',
        status: 'queued' as const,
      },
    ];

    const merged = mergeJobs(existing, incoming);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe('job-new-queued');
    expect(merged[0]?.status).toBe('queued');
  });
});

describe('computeAdaptiveDaemonDelay', () => {
  it('backs off when a cycle completed with no actionable capsule work', () => {
    const config = {
      version: 1 as const,
      enabled: true,
      provider: null,
      model: null,
      mode: 'continuous' as const,
      interval_minutes: 1,
      night_start_hour: 1,
      night_end_hour: 6,
      timezone: null,
      max_targets_per_run: 6,
      updated_at: new Date().toISOString(),
    };

    const run = {
      run_id: 'vault-steward-idle',
      started_at: '2026-03-08T00:00:00.000Z',
      completed_at: '2026-03-08T00:00:05.000Z',
      status: 'completed' as const,
      reason: 'hybrid_swarm_completed_with_codex_review',
      provider: null,
      model: null,
      overview: 'Monitor only.',
      workstream: 'mixed' as const,
      observations: [],
      suggested_actions: [],
      targets: [],
      proposed_jobs: [],
      executed_jobs: [],
      lane_reports: [],
      raw_text: null,
      graph_snapshot: {
        total_capsules: 176,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
      },
    };

    const next = computeAdaptiveDaemonDelay(config, run, 2);

    expect(next.idleStreak).toBe(3);
    expect(next.delayMs).toBe(4 * 60 * 1000);
  });

  it('resets back to the configured interval when actionable work exists', () => {
    const config = {
      version: 1 as const,
      enabled: true,
      provider: null,
      model: null,
      mode: 'continuous' as const,
      interval_minutes: 30,
      night_start_hour: 1,
      night_end_hour: 6,
      timezone: null,
      max_targets_per_run: 6,
      updated_at: new Date().toISOString(),
    };

    const run = {
      run_id: 'vault-steward-active',
      started_at: '2026-03-08T00:00:00.000Z',
      completed_at: '2026-03-08T00:00:05.000Z',
      status: 'completed' as const,
      reason: 'hybrid_swarm_completed',
      provider: null,
      model: null,
      overview: 'Actionable work found.',
      workstream: 'decomposition' as const,
      observations: [],
      suggested_actions: [],
      targets: [
        {
          capsule_id: 'capsule.foundation.capsuleos.v1',
          reason: 'Needs decomposition review',
          priority: 'high' as const,
        },
      ],
      proposed_jobs: [],
      executed_jobs: [],
      lane_reports: [],
      raw_text: null,
      graph_snapshot: {
        total_capsules: 176,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
      },
    };

    const next = computeAdaptiveDaemonDelay(config, run, 3);

    expect(next.idleStreak).toBe(0);
    expect(next.delayMs).toBe(30 * 60 * 1000);
  });
});

describe('shouldRunCodexForeman', () => {
  it('enters recovery mode when fallback analysis still surfaced concrete targets', () => {
    const scout = {
      normalized: {
        overview: 'Fallback overview',
        workstream: 'mixed' as const,
        observations: [],
        suggested_actions: [],
        targets: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            reason: 'hub pressure',
            priority: 'high' as const,
          },
        ],
        proposed_jobs: [],
      },
      provider: 'github_models' as const,
      model: 'openai/gpt-4.1',
      rawText: null,
      reason: 'used_fallback_analysis',
      lane: {
        id: 'scout' as const,
        label: 'Scout',
        engine: 'provider' as const,
        status: 'failed' as const,
        provider: 'github_models',
        model: 'openai/gpt-4.1',
        summary: 'Fallback',
        error: 'not json',
      },
    };

    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [],
    };

    const readiness = shouldRunCodexForeman(scout, queue);

    expect(readiness.run).toBe(true);
    expect(readiness.summary).toContain('recovery mode');
  });
});

describe('shouldBypassCodexForemanCadenceHold', () => {
  it('allows codex foreman to break cadence hold for degraded cycles with concrete targets', () => {
    const scout = {
      normalized: {
        overview: 'Fallback overview',
        workstream: 'mixed' as const,
        observations: [],
        suggested_actions: [],
        targets: [
          {
            capsule_id: 'capsule.foundation.background-agent-runtime.v1',
            reason: 'hub pressure',
            priority: 'high' as const,
          },
        ],
        proposed_jobs: [],
      },
      provider: 'github_models' as const,
      model: 'openai/gpt-4.1',
      rawText: null,
      reason: 'used_fallback_analysis',
      lane: {
        id: 'scout' as const,
        label: 'Scout',
        engine: 'provider' as const,
        status: 'failed' as const,
        provider: 'github_models',
        model: 'openai/gpt-4.1',
        summary: 'Fallback',
        error: 'not json',
      },
    };

    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [],
    };

    expect(shouldBypassCodexForemanCadenceHold(scout, queue)).toBe(true);
  });
});

describe('rankSwarmApiProviders', () => {
  it('prefers the explicit provider and excludes subscription lanes', () => {
    const ranked = rankSwarmApiProviders(
      [
        { provider: 'codex_subscription', available: true, selectedByDefault: true },
        { provider: 'github_models', available: true, selectedByDefault: false },
        { provider: 'openrouter', available: true, selectedByDefault: false },
      ],
      'openrouter',
    );

    expect(ranked).toEqual(['openrouter', 'github_models']);
  });

  it('falls back to the selected default API lane when no explicit provider is set', () => {
    const ranked = rankSwarmApiProviders([
      { provider: 'github_models', available: true, selectedByDefault: true },
      { provider: 'openrouter', available: true, selectedByDefault: false },
      { provider: 'n1_subscription', available: true, selectedByDefault: false },
    ]);

    expect(ranked).toEqual(['github_models', 'openrouter']);
  });
});

describe('isVaultStewardProcessCommand', () => {
  it('matches detached tsx command lines that use absolute script paths', () => {
    expect(
      isVaultStewardProcessCommand(
        '/home/n1/.nvm/versions/node/v24.14.0/bin/node /home/n1/n1hub.com/node_modules/tsx/dist/cli.mjs /home/n1/n1hub.com/scripts/vault-steward.ts',
      ),
    ).toBe(true);
    expect(
      isVaultStewardProcessCommand(
        '/home/n1/.nvm/versions/node/v24.14.0/bin/node --require /home/n1/n1hub.com/node_modules/tsx/dist/preflight.cjs --import file:///home/n1/n1hub.com/node_modules/tsx/dist/loader.mjs /home/n1/n1hub.com/scripts/vault-steward.ts',
      ),
    ).toBe(true);
    expect(isVaultStewardProcessCommand('node /tmp/other-script.ts')).toBe(false);
  });
});
