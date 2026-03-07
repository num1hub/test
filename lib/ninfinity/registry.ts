export interface NInfinityAgentSpec {
  capsuleId: string;
  slug: string;
  displayName: string;
  priority: number;
  title: string;
  mission: string;
  focus: string[];
}

export const N_INFINITY_AGENT_SPECS: Record<string, NInfinityAgentSpec> = {
  'capsule.foundation.n-infinity.weaver.v1': {
    capsuleId: 'capsule.foundation.n-infinity.weaver.v1',
    slug: 'weaver',
    displayName: 'Weaver',
    priority: 1,
    title: 'Weave and strengthen capsule graph links',
    mission:
      'Inspect the capsule graph, identify weakly linked or isolated knowledge, and create careful structural improvements that strengthen graph coherence without breaking validation invariants.',
    focus: ['links', 'graph coherence', 'hub-to-atom mapping', 'orphan capsules'],
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    capsuleId: 'capsule.foundation.n-infinity.gardener.v1',
    slug: 'gardener',
    displayName: 'Gardener',
    priority: 2,
    title: 'Prune stale capsule structures and maintain graph hygiene',
    mission:
      'Review capsule hygiene, stale metadata, low-quality branch leftovers, and maintenance opportunities that keep the graph healthy, navigable, and validator-friendly.',
    focus: ['graph hygiene', 'stale capsules', 'legacy cleanup', 'maintenance'],
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    capsuleId: 'capsule.foundation.n-infinity.parliament.v1',
    slug: 'parliament',
    displayName: 'Parliament',
    priority: 1,
    title: 'Arbitrate contradictions and quarantine-worthy knowledge',
    mission:
      'Inspect contradiction pressure, quarantine candidates, and epistemic conflicts across capsules, then produce conservative, auditable remediation changes or escalation artifacts.',
    focus: ['contradictions', 'quarantine', 'epistemic audit', 'governance'],
  },
  'capsule.foundation.n-infinity.innovator.v1': {
    capsuleId: 'capsule.foundation.n-infinity.innovator.v1',
    slug: 'innovator',
    displayName: 'Innovator',
    priority: 3,
    title: 'Compound new capsule insights and structural opportunities',
    mission:
      'Synthesize new high-value capsule opportunities, bridge disconnected themes, and propose structural graph expansions grounded in actual repository reality.',
    focus: ['synthesis', 'new capsules', 'cross-links', 'compounding insights'],
  },
  'capsule.foundation.n-infinity.suggestion-agent.v1': {
    capsuleId: 'capsule.foundation.n-infinity.suggestion-agent.v1',
    slug: 'suggestion',
    displayName: 'Suggestion Agent',
    priority: 2,
    title: 'Generate concrete graph-improvement suggestions',
    mission:
      'Review the current capsule graph and generate concrete, implementation-ready suggestions for planners, maintainers, and future automation flows.',
    focus: ['suggestions', 'planner support', 'improvements'],
  },
  'capsule.foundation.n-infinity.risk-detector.v1': {
    capsuleId: 'capsule.foundation.n-infinity.risk-detector.v1',
    slug: 'risk-detector',
    displayName: 'Risk Detector',
    priority: 1,
    title: 'Detect at-risk capsule structures and execution weak points',
    mission:
      'Scan the graph for unstable areas, missing links, suspicious metadata patterns, or execution risks that need early detection before they become graph debt.',
    focus: ['risk detection', 'weak points', 'missing links'],
  },
  'capsule.foundation.n-infinity.reminder-agent.v1': {
    capsuleId: 'capsule.foundation.n-infinity.reminder-agent.v1',
    slug: 'reminder',
    displayName: 'Reminder Agent',
    priority: 3,
    title: 'Protect time-bound graph commitments and reminders',
    mission:
      'Review reminder, due date, and schedule-related capsule structures and keep temporal execution commitments visible and internally coherent.',
    focus: ['reminders', 'deadlines', 'time-bound graph state'],
  },
};

export const DEFAULT_NINFINITY_CAPSULE_AGENT_IDS = [
  'capsule.foundation.n-infinity.weaver.v1',
  'capsule.foundation.n-infinity.gardener.v1',
  'capsule.foundation.n-infinity.parliament.v1',
  'capsule.foundation.n-infinity.innovator.v1',
] as const;

export function resolveNInfinityAgentSpec(capsuleId: string): NInfinityAgentSpec {
  return (
    N_INFINITY_AGENT_SPECS[capsuleId] ?? {
      capsuleId,
      slug: capsuleId.split('.').slice(-2, -1)[0] ?? 'agent',
      displayName: capsuleId,
      priority: 4,
      title: 'Run capsule graph agent task',
      mission:
        'Inspect the capsule graph conservatively, make validated improvements when justified, and leave auditable outcomes for follow-up.',
      focus: ['capsule graph'],
    }
  );
}
