#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import type { CapsuleTier, SovereignCapsule } from '../types/capsule';
import { computeIntegrityHash } from '../lib/validator/utils';
import { validateCapsule } from '../lib/validator';
import {
  createBranch,
  loadOverlayGraph,
  readBranchManifest,
  readOverlayCapsule,
  writeOverlayCapsule,
} from '../lib/diff/branch-manager';

const CAPSULES_DIR = path.join(process.cwd(), 'data', 'capsules');
const BRANCHES_DIR = path.join(process.cwd(), 'data', 'branches');

const subtypeHubIds = new Set([
  'capsule.core.compass.v1',
  'capsule.foundation.workspace.v1',
  'capsule.foundation.capsuleos.16-gates.v1',
  'capsule.foundation.a2c.v1',
  'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.capsule-graph-maintenance.v1',
  'capsule.foundation.n-infinity.v1',
  'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.security.v1',
  'capsule.foundation.n1hub.v1',
  'capsule.foundation.personal-ai-assistant.v1',
  'capsule.foundation.key-agents.v1',
  'capsule.foundation.symphony.v1',
  'capsule.foundation.tracker.v1',
  'capsule.foundation.integrations.v1',
  'capsule.foundation.marketplace.v1',
  'capsule.foundation.dashboard.v1',
  'capsule.foundation.planner.v1',
  'capsule.foundation.team.v1',
  'capsule.foundation.profile.v1',
  'capsule.foundation.tilesims.v1',
]);

const namePatch: Record<string, string> = {
  'capsule.access.egor-n1-n1hub-v0.v1': 'Egor N1 Access',
  'capsule.concept.generative-ai-tile.v1': 'Generative AI Tile',
  'capsule.concept.lidar-scanning.v1': 'LiDAR Scanning',
  'capsule.concept.tile-layout-algorithm.v1': 'Tile Layout Algorithm',
  'capsule.core.atom.v1': 'Atom',
  'capsule.foundation.workspace.v1': 'Workspace',
  'capsule.core.constitution.v1': 'Constitution',
  'capsule.foundation.capsuleos.v1': 'CapsuleOS Foundation',
  'capsule.core.first-spark.v1': 'First Spark',
  'capsule.core.manifesto.v1': 'Manifesto',
  'capsule.foundation.capsuleos.16-gates.v1': 'CapsuleOS Validation Gates',
  'capsule.foundation.capsule-generation-protocol.v1': 'Capsule Generation Protocol',
  'capsule.foundation.capsuleos-schema.v1': 'CapsuleOS Schema',
  'capsule.foundation.capsuleos-spec.v1': 'CapsuleOS Specification',
  'capsule.foundation.capsuleos.5-element-law.v1': 'CapsuleOS 5-Element Law',
  'capsule.foundation.capsuleos.capsule-concept.v1': 'CapsuleOS Capsule Concept',
  'capsule.foundation.capsuleos.confidence-vector.v1': 'CapsuleOS Confidence Vector',
  'capsule.foundation.capsuleos.relation-types.v1': 'CapsuleOS Relation Types',
  'capsule.foundation.capsuleos.semantic-hash.v1': 'CapsuleOS Semantic Hash',
  'capsule.foundation.capsuleos.status-active.v1': 'CapsuleOS Status: Active',
  'capsule.foundation.capsuleos.status-archived.v1': 'CapsuleOS Status: Archived',
  'capsule.foundation.capsuleos.status-draft.v1': 'CapsuleOS Status: Draft',
  'capsule.foundation.capsuleos.status-frozen.v1': 'CapsuleOS Status: Frozen',
  'capsule.foundation.capsuleos.status-legacy.v1': 'CapsuleOS Status: Legacy',
  'capsule.foundation.capsuleos.status-quarantined.v1': 'CapsuleOS Status: Quarantined',
  'capsule.foundation.capsuleos.status-sovereign.v1': 'CapsuleOS Status: Sovereign',
  'capsule.foundation.capsuleos.subtype-atomic.v1': 'CapsuleOS Subtype: Atomic',
  'capsule.foundation.capsuleos.subtype-hub.v1': 'CapsuleOS Subtype: Hub',
  'capsule.foundation.capsuleos.type-concept.v1': 'CapsuleOS Type: Concept',
  'capsule.foundation.capsuleos.type-foundation.v1': 'CapsuleOS Type: Foundation',
  'capsule.foundation.capsuleos.type-operations.v1': 'CapsuleOS Type: Operations',
  'capsule.foundation.capsuleos.type-physical-object.v1': 'CapsuleOS Type: Physical Object',
  'capsule.foundation.capsuleos.versioning-protocol.v1': 'CapsuleOS Versioning Protocol',
  'capsule.foundation.a2c.v1': 'A2C Pipeline',
  'capsule.foundation.access-models.v1': 'Access Models',
  'capsule.foundation.n-infinity.v1': 'N-Infinity',
  'capsule.foundation.blockchain-opensource.v1': 'Blockchain Open Source',
  'capsule.foundation.deepmine.v1': 'DeepMine',
  'capsule.foundation.graph-3d-visualization.v1': '3D Graph Visualization',
  'capsule.foundation.tilesims.v1': 'TileSims Foundation',
  'capsule.core.compass.v1': 'Core Compass',
  'capsule.foundation.hub-atomic.v1': 'Hub / Atomic Topology',
  'capsule.project.n1hub-v0.v1': 'N1Hub v0',
  'capsule.foundation.n-infinity.gardener.v1': 'N-Infinity Gardener',
  'capsule.foundation.n-infinity.innovator.v1': 'N-Infinity Innovator',
  'capsule.foundation.n-infinity.parliament.v1': 'N-Infinity Parliament',
  'capsule.foundation.n-infinity.weaver.v1': 'N-Infinity Weaver',
  'capsule.foundation.n1-coin-tokenomics.v1': 'N1 Coin Tokenomics',
  'capsule.foundation.n1hub-gold-master.v1': 'N1Hub Gold Master',
  'capsule.foundation.n1hub-projects.v1': 'N1Hub Projects',
  'capsule.foundation.n1hub.v1': 'N1Hub Runtime',
  'capsule.foundation.project.v1': 'Project Blueprint',
  'capsule.foundation.sovereign-intellectual-capital.v1': 'Sovereign Intellectual Capital',
  'capsule.foundation.to-dig-deep.v1': 'To Dig Deep',
  'capsule.foundation.between-zero-and-one.v1': 'Between Zero and One',
  'capsule.project.tilesims.v1': 'TileSims',
  'capsule.person.egor-n1.v1': 'Egor N1',
};

type ParentSpec = string | string[];

const parentMap: Record<string, ParentSpec> = {
  'capsule.core.compass.v1': 'capsule.project.capsuleos.v1',
  'capsule.core.atom.v1': 'capsule.core.compass.v1',
  'capsule.core.constitution.v1': 'capsule.core.compass.v1',
  'capsule.core.first-spark.v1': 'capsule.core.compass.v1',
  'capsule.core.manifesto.v1': 'capsule.core.compass.v1',
  'capsule.foundation.to-dig-deep.v1': 'capsule.core.compass.v1',
  'capsule.foundation.between-zero-and-one.v1': 'capsule.core.compass.v1',

  'capsule.foundation.capsuleos.v1': 'capsule.project.capsuleos.v1',
  'capsule.foundation.capsuleos-spec.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.16-gates.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos-schema.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsule-generation-protocol.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.versioning-protocol.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.5-element-law.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.capsule-concept.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.confidence-vector.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.relation-types.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.semantic-hash.v1': 'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.status-active.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-archived.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-draft.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-frozen.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-legacy.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-quarantined.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.status-sovereign.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.subtype-atomic.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.subtype-hub.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.type-concept.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.type-foundation.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.type-operations.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos.type-physical-object.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.hub-atomic.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.security.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.audit-log.v1': 'capsule.foundation.security.v1',
  'capsule.foundation.architect-override.v1': 'capsule.foundation.security.v1',
  'capsule.foundation.quarantine-buffer.v1': 'capsule.foundation.security.v1',

  'capsule.foundation.workspace.v1': 'capsule.project.workspace.v1',
  'capsule.foundation.project.v1': 'capsule.foundation.workspace.v1',
  'capsule.foundation.agent-soul.v1': [
    'capsule.foundation.personal-ai-assistant.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.agent-skills-registry.v1': [
    'capsule.foundation.personal-ai-assistant.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.ai-wallet.v1': [
    'capsule.foundation.deepmine.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.ai-control-surface.v1': [
    'capsule.foundation.background-agent-runtime.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.chat-to-capsules.v1': [
    'capsule.foundation.personal-ai-assistant.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.key-agents.v1': [
    'capsule.foundation.n1hub.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.agent-delegation.v1': [
    'capsule.foundation.background-agent-runtime.v1',
    'capsule.foundation.personal-ai-assistant.v1',
  ],
  'capsule.foundation.goal.v1': 'capsule.foundation.planner.v1',
  'capsule.foundation.milestone.v1': 'capsule.foundation.planner.v1',
  'capsule.foundation.task.v1': 'capsule.foundation.planner.v1',
  'capsule.foundation.calendar.v1': 'capsule.foundation.planner.v1',
  'capsule.foundation.analytics.v1': 'capsule.foundation.dashboard.v1',
  'capsule.foundation.archive.v1': 'capsule.foundation.tracker.v1',
  'capsule.foundation.api-gateway.v1': 'capsule.foundation.integrations.v1',
  'capsule.foundation.permission.v1': 'capsule.foundation.team.v1',
  'capsule.foundation.role.v1': 'capsule.foundation.team.v1',

  'capsule.person.egor-n1.v1': 'capsule.foundation.profile.v1',
  'capsule.foundation.user-preferences.v1': 'capsule.foundation.profile.v1',
  'capsule.access.egor-n1-n1hub-v0.v1': 'capsule.foundation.n1hub.v1',
  'capsule.foundation.n1hub.v1': 'capsule.project.n1hub-v0.v1',
  'capsule.foundation.n1hub-projects.v1': 'capsule.foundation.n1hub.v1',
  'capsule.foundation.n1hub-gold-master.v1': 'capsule.foundation.n1hub.v1',
  'capsule.project.n1hub-v0.v1': 'capsule.project.workspace.v1',

  'capsule.foundation.a2c.v1': 'capsule.project.a2c.v1',
  'capsule.foundation.deepmine.v1': 'capsule.project.deepmine.v1',
  'capsule.foundation.n-infinity.v1': 'capsule.project.n-infinity.v1',
  'capsule.foundation.background-agent-runtime.v1': [
    'capsule.project.n-infinity.v1',
    'capsule.project.symphony.v1',
  ],
  'capsule.foundation.agent-daemon.v1': 'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.agent-memory-state.v1': 'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.capsule-job.v1': 'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.night-shift-autonomy.v1': 'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.deepmine-prospector-agent.v1': [
    'capsule.foundation.deepmine.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.deepmine-miner-agent.v1': [
    'capsule.foundation.deepmine.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.deepmine-foreman-agent.v1': [
    'capsule.foundation.deepmine.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.vault-update-agent.v1': [
    'capsule.foundation.a2c.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.daily-planner-agent.v1': [
    'capsule.foundation.planner.v1',
    'capsule.foundation.personal-ai-assistant.v1',
  ],
  'capsule.foundation.roadmap-planner-agent.v1': [
    'capsule.foundation.planner.v1',
    'capsule.foundation.personal-ai-assistant.v1',
  ],
  'capsule.foundation.capsule-librarian-agent.v1': [
    'capsule.foundation.personal-ai-assistant.v1',
    'capsule.foundation.workspace.v1',
  ],
  'capsule.foundation.branch-steward-agent.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.validation-gatekeeper-agent.v1': [
    'capsule.foundation.a2c.v1',
    'capsule.foundation.background-agent-runtime.v1',
  ],
  'capsule.foundation.review-agent.v1': [
    'capsule.foundation.personal-ai-assistant.v1',
    'capsule.foundation.capsule-graph-maintenance.v1',
  ],
  'capsule.foundation.capsule-graph-maintenance.v1': [
    'capsule.foundation.background-agent-runtime.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.foundation.n-infinity.gardener.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.foundation.n-infinity.innovator.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.foundation.n-infinity.parliament.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.foundation.n-infinity.suggestion-agent.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.foundation.n-infinity.weaver.v1': [
    'capsule.foundation.capsule-graph-maintenance.v1',
    'capsule.foundation.n-infinity.v1',
  ],
  'capsule.project.symphony.v1': 'capsule.project.capsuleos.v1',
  'capsule.foundation.symphony.v1': [
    'capsule.foundation.workspace.v1',
    'capsule.project.symphony.v1',
  ],
  'capsule.foundation.symphony-workflow.v1': 'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-agent-session.v1': 'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-run-attempt.v1': 'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-retry-entry.v1': 'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-approval-sandbox-policy.v1': 'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-observability.v1': 'capsule.foundation.symphony.v1',

  'capsule.foundation.tilesims.v1': 'capsule.project.tilesims.v1',
  'capsule.project.tilesimsv2.v1': 'capsule.project.tilesims.v1',
  'capsule.concept.generative-ai-tile.v1': 'capsule.foundation.tilesims.v1',
  'capsule.concept.lidar-scanning.v1': 'capsule.foundation.tilesims.v1',
  'capsule.concept.tile-layout-algorithm.v1': 'capsule.foundation.tilesims.v1',

  'capsule.foundation.graph-3d-visualization.v1': 'capsule.foundation.dashboard.v1',
  'capsule.foundation.marketplace.v1': 'capsule.project.mining-company.v1',
  'capsule.foundation.n1-pass.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.access-models.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.blockchain-opensource.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.boost.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.epistemic-ledger.v1': 'capsule.foundation.capsuleos.v1',
  'capsule.foundation.n1-coin-tokenomics.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.royalty-engine.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.siaf-governance.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.sovereign-intellectual-capital.v1': 'capsule.foundation.marketplace.v1',
  'capsule.foundation.sovereign-template.v1': 'capsule.foundation.marketplace.v1',
};

const dreamDraftIds = new Set([
  'capsule.project.a2c.v1',
  'capsule.project.apsnytravel.v1',
  'capsule.project.from-zero-to-megabytes.v1',
  'capsule.project.deepmine.v1',
  'capsule.project.mining-company.v1',
  'capsule.project.n-infinity.v1',
  'capsule.project.symphony.v1',
  'capsule.project.restart-challenge.v1',
  'capsule.project.tilesims.v1',
  'capsule.project.tilesimsv2.v1',
  'capsule.foundation.a2c.v1',
  'capsule.foundation.a2c-emit.v1',
  'capsule.foundation.a2c-extract.v1',
  'capsule.foundation.a2c-hash.v1',
  'capsule.foundation.a2c-ingest.v1',
  'capsule.foundation.a2c-link.v1',
  'capsule.foundation.a2c-normalize.v1',
  'capsule.foundation.a2c-segment.v1',
  'capsule.foundation.a2c-synthesize.v1',
  'capsule.foundation.a2c-validate.v1',
  'capsule.foundation.tilesims.v1',
  'capsule.concept.generative-ai-tile.v1',
  'capsule.concept.lidar-scanning.v1',
  'capsule.concept.tile-layout-algorithm.v1',
  'capsule.foundation.deepmine.v1',
  'capsule.foundation.graph-3d-visualization.v1',
  'capsule.foundation.n-infinity.v1',
  'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.agent-daemon.v1',
  'capsule.foundation.agent-delegation.v1',
  'capsule.foundation.agent-memory-state.v1',
  'capsule.foundation.agent-skills-registry.v1',
  'capsule.foundation.agent-soul.v1',
  'capsule.foundation.ai-control-surface.v1',
  'capsule.foundation.ai-wallet.v1',
  'capsule.foundation.capsule-graph-maintenance.v1',
  'capsule.foundation.capsule-job.v1',
  'capsule.foundation.chat-to-capsules.v1',
  'capsule.foundation.night-shift-autonomy.v1',
  'capsule.foundation.n-infinity.gardener.v1',
  'capsule.foundation.n-infinity.innovator.v1',
  'capsule.foundation.n-infinity.parliament.v1',
  'capsule.foundation.n-infinity.reminder-agent.v1',
  'capsule.foundation.n-infinity.risk-detector.v1',
  'capsule.foundation.n-infinity.suggestion-agent.v1',
  'capsule.foundation.n-infinity.weaver.v1',
  'capsule.foundation.personal-ai-assistant.v1',
  'capsule.foundation.key-agents.v1',
  'capsule.foundation.deepmine-prospector-agent.v1',
  'capsule.foundation.deepmine-miner-agent.v1',
  'capsule.foundation.deepmine-foreman-agent.v1',
  'capsule.foundation.vault-update-agent.v1',
  'capsule.foundation.daily-planner-agent.v1',
  'capsule.foundation.roadmap-planner-agent.v1',
  'capsule.foundation.capsule-librarian-agent.v1',
  'capsule.foundation.branch-steward-agent.v1',
  'capsule.foundation.validation-gatekeeper-agent.v1',
  'capsule.foundation.review-agent.v1',
  'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-agent-session.v1',
  'capsule.foundation.symphony-approval-sandbox-policy.v1',
  'capsule.foundation.symphony-observability.v1',
  'capsule.foundation.symphony-retry-entry.v1',
  'capsule.foundation.symphony-run-attempt.v1',
  'capsule.foundation.symphony-workflow.v1',
  'capsule.ai.conversation.v1',
  'capsule.ai.prompt.v1',
  'capsule.ai.suggestion.v1',
  'capsule.foundation.planner.v1',
  'capsule.foundation.calendar.v1',
  'capsule.foundation.goal.v1',
  'capsule.foundation.milestone.v1',
  'capsule.foundation.roadmap.v1',
  'capsule.foundation.task.v1',
  'capsule.foundation.tracker.v1',
  'capsule.foundation.archive.v1',
  'capsule.foundation.metric.v1',
  'capsule.foundation.notification.v1',
  'capsule.foundation.reminder.v1',
  'capsule.foundation.access-models.v1',
  'capsule.foundation.blockchain-opensource.v1',
  'capsule.foundation.boost.v1',
  'capsule.foundation.marketplace.v1',
  'capsule.foundation.n1-coin-tokenomics.v1',
  'capsule.foundation.n1-pass.v1',
  'capsule.foundation.royalty-engine.v1',
  'capsule.foundation.siaf-governance.v1',
  'capsule.foundation.sovereign-intellectual-capital.v1',
  'capsule.foundation.sovereign-template.v1',
]);

type PlanningMetadataPatch = Partial<{
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  estimatedHours: number;
  actualHours: number;
}>;

type EditorialPatch = {
  summary?: string;
  keywords?: string[];
};

type SupplementalLink = {
  target_id: string;
  relation_type: string;
};

const supplementalLinks: Record<string, SupplementalLink[]> = {
  'capsule.project.deepmine.v1': [
    { target_id: 'capsule.foundation.ai-wallet.v1', relation_type: 'depends_on' },
    { target_id: 'capsule.foundation.chat-to-capsules.v1', relation_type: 'supports' },
    { target_id: 'capsule.foundation.agent-delegation.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'supports' },
    { target_id: 'capsule.foundation.ai-control-surface.v1', relation_type: 'references' },
  ],
  'capsule.ai.prompt.v1': [
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-soul.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-skills-registry.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-workflow.v1', relation_type: 'references' },
  ],
  'capsule.ai.conversation.v1': [
    { target_id: 'capsule.foundation.agent-soul.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-memory-state.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
  ],
  'capsule.ai.suggestion.v1': [
    { target_id: 'capsule.foundation.tracker.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-delegation.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.ai-control-surface.v1', relation_type: 'references' },
  ],
  'capsule.foundation.dashboard.v1': [
    { target_id: 'capsule.foundation.ai-control-surface.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-observability.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.notification.v1', relation_type: 'references' },
  ],
  'capsule.foundation.analytics.v1': [
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-observability.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
  ],
  'capsule.foundation.notification.v1': [
    { target_id: 'capsule.foundation.ai-control-surface.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-observability.v1', relation_type: 'references' },
  ],
  'capsule.foundation.metric.v1': [
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-run-attempt.v1', relation_type: 'references' },
  ],
  'capsule.foundation.archive.v1': [
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
  ],
  'capsule.foundation.roadmap.v1': [
    { target_id: 'capsule.foundation.chat-to-capsules.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-delegation.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    { target_id: 'capsule.ai.suggestion.v1', relation_type: 'references' },
  ],
  'capsule.foundation.chat-to-capsules.v1': [
    { target_id: 'capsule.ai.prompt.v1', relation_type: 'depends_on' },
    { target_id: 'capsule.foundation.deepmine.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.ai-wallet.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.agent-soul.v1', relation_type: 'references' },
  ],
  'capsule.foundation.personal-ai-assistant.v1': [
    { target_id: 'capsule.foundation.key-agents.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.daily-planner-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.roadmap-planner-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.capsule-librarian-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-foreman-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.branch-steward-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.review-agent.v1', relation_type: 'references' },
  ],
  'capsule.foundation.agent-delegation.v1': [
    { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'depends_on' },
    { target_id: 'capsule.foundation.agent-memory-state.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.symphony-run-attempt.v1', relation_type: 'references' },
  ],
  'capsule.foundation.deepmine.v1': [
    { target_id: 'capsule.foundation.key-agents.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-prospector-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-miner-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-foreman-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.vault-update-agent.v1', relation_type: 'references' },
  ],
  'capsule.foundation.a2c.v1': [
    { target_id: 'capsule.foundation.vault-update-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.validation-gatekeeper-agent.v1', relation_type: 'references' },
  ],
  'capsule.foundation.planner.v1': [
    { target_id: 'capsule.foundation.key-agents.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.daily-planner-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.roadmap-planner-agent.v1', relation_type: 'references' },
  ],
  'capsule.foundation.background-agent-runtime.v1': [
    { target_id: 'capsule.foundation.key-agents.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-prospector-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-miner-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.deepmine-foreman-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.vault-update-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.branch-steward-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.validation-gatekeeper-agent.v1', relation_type: 'references' },
    { target_id: 'capsule.foundation.review-agent.v1', relation_type: 'references' },
  ],
};

const tier1Ids = new Set([
  'capsule.access.egor-n1-n1hub-v0.v1',
  'capsule.core.atom.v1',
  'capsule.core.compass.v1',
  'capsule.core.constitution.v1',
  'capsule.core.first-spark.v1',
  'capsule.core.manifesto.v1',
  'capsule.foundation.audit-log.v1',
  'capsule.foundation.architect-override.v1',
  'capsule.foundation.between-zero-and-one.v1',
  'capsule.foundation.capsule-generation-protocol.v1',
  'capsule.foundation.capsuleos-schema.v1',
  'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos.16-gates.v1',
  'capsule.foundation.capsuleos.5-element-law.v1',
  'capsule.foundation.capsuleos.capsule-concept.v1',
  'capsule.foundation.capsuleos.confidence-vector.v1',
  'capsule.foundation.capsuleos.relation-types.v1',
  'capsule.foundation.capsuleos.semantic-hash.v1',
  'capsule.foundation.capsuleos.versioning-protocol.v1',
  'capsule.foundation.capsuleos.v1',
  'capsule.foundation.epistemic-ledger.v1',
  'capsule.foundation.g01.v1',
  'capsule.foundation.g02.v1',
  'capsule.foundation.g03.v1',
  'capsule.foundation.g04.v1',
  'capsule.foundation.g05.v1',
  'capsule.foundation.g06.v1',
  'capsule.foundation.g07.v1',
  'capsule.foundation.g08.v1',
  'capsule.foundation.g09.v1',
  'capsule.foundation.g10.v1',
  'capsule.foundation.g11.v1',
  'capsule.foundation.g12.v1',
  'capsule.foundation.g13.v1',
  'capsule.foundation.g14.v1',
  'capsule.foundation.g15.v1',
  'capsule.foundation.g16.v1',
  'capsule.foundation.hybrid-database.v1',
  'capsule.foundation.n1hub-gold-master.v1',
  'capsule.foundation.n1hub.v1',
  'capsule.foundation.quarantine-buffer.v1',
  'capsule.foundation.security.v1',
  'capsule.foundation.testing.v1',
  'capsule.foundation.to-dig-deep.v1',
  'capsule.project.capsuleos.v1',
]);

const tier2Ids = new Set([
  'capsule.foundation.a2c.v1',
  'capsule.foundation.capsuleos.status-active.v1',
  'capsule.foundation.capsuleos.status-archived.v1',
  'capsule.foundation.capsuleos.status-draft.v1',
  'capsule.foundation.capsuleos.status-frozen.v1',
  'capsule.foundation.capsuleos.status-legacy.v1',
  'capsule.foundation.capsuleos.status-quarantined.v1',
  'capsule.foundation.capsuleos.status-sovereign.v1',
  'capsule.foundation.capsuleos.subtype-atomic.v1',
  'capsule.foundation.capsuleos.subtype-hub.v1',
  'capsule.foundation.capsuleos.type-concept.v1',
  'capsule.foundation.capsuleos.type-foundation.v1',
  'capsule.foundation.capsuleos.type-operations.v1',
  'capsule.foundation.capsuleos.type-physical-object.v1',
  'capsule.foundation.dashboard.v1',
  'capsule.foundation.deepmine.v1',
  'capsule.foundation.background-agent-runtime.v1',
  'capsule.foundation.key-agents.v1',
  'capsule.foundation.capsule-graph-maintenance.v1',
  'capsule.foundation.hub-atomic.v1',
  'capsule.foundation.integrations.v1',
  'capsule.foundation.invitation.v1',
  'capsule.foundation.marketplace.v1',
  'capsule.foundation.n-infinity.v1',
  'capsule.foundation.n1hub-projects.v1',
  'capsule.foundation.permission.v1',
  'capsule.foundation.personal-ai-assistant.v1',
  'capsule.foundation.planner.v1',
  'capsule.foundation.profile.v1',
  'capsule.foundation.project.v1',
  'capsule.foundation.role.v1',
  'capsule.foundation.symphony.v1',
  'capsule.foundation.symphony-workflow.v1',
  'capsule.foundation.team.v1',
  'capsule.foundation.tracker.v1',
  'capsule.foundation.workspace.v1',
  'capsule.person.egor-n1.v1',
  'capsule.project.a2c.v1',
  'capsule.project.deepmine.v1',
  'capsule.project.n-infinity.v1',
  'capsule.project.n1hub-v0.v1',
  'capsule.project.symphony.v1',
  'capsule.project.workspace.v1',
]);

const tier4Ids = new Set([
  'capsule.concept.generative-ai-tile.v1',
  'capsule.concept.lidar-scanning.v1',
  'capsule.concept.tile-layout-algorithm.v1',
  'capsule.foundation.blockchain-opensource.v1',
  'capsule.foundation.graph-3d-visualization.v1',
  'capsule.foundation.n1-coin-tokenomics.v1',
  'capsule.foundation.royalty-engine.v1',
  'capsule.foundation.siaf-governance.v1',
  'capsule.foundation.sovereign-intellectual-capital.v1',
  'capsule.foundation.sovereign-template.v1',
  'capsule.project.apsnytravel.v1',
  'capsule.project.from-zero-to-megabytes.v1',
  'capsule.project.mining-company.v1',
  'capsule.project.restart-challenge.v1',
  'capsule.project.tilesimsv2.v1',
]);

function resolveCapsuleTier(capsuleId: string): CapsuleTier {
  if (tier1Ids.has(capsuleId)) return 1;
  if (tier2Ids.has(capsuleId)) return 2;
  if (tier4Ids.has(capsuleId)) return 4;
  return 3;
}

const editorialPatch: Record<string, EditorialPatch> = {
  'capsule.project.capsuleos.v1': {
    summary:
      'CapsuleOS Project is the umbrella execution program for the sovereign-knowledge operating system. It coordinates validator hardening, schema and protocol evolution, graph governance, persistence, security, and the downstream subsystem projects that turn doctrine into running software. The hub exists so Workspace, A2C, DeepMine, and N-Infinity can evolve independently without losing architectural coherence or shared release discipline. It is therefore both the strategic portfolio root for core platform work and the operational place where CapsuleOS principles are translated into audited engineering decisions, milestones, and cross-module integration.',
    keywords: [
      'capsuleos',
      'platform-root',
      'validator',
      'governance',
      'workspace',
      'a2c',
      'deepmine',
      'n-infinity',
      'architecture',
      'release-discipline',
    ],
  },
  'capsule.project.workspace.v1': {
    summary:
      'Workspace Project is the user-facing product stream of N1Hub: the place where planning, tracking, dashboards, collaboration, profiles, and project navigation become an operational habitat rather than abstract doctrine. It coordinates the practical surfaces through which a user turns capsules into daily work, visible progress, and team communication. By grouping these modules under one project hub, the vault distinguishes product-experience work from lower-level platform work while still keeping lineage to CapsuleOS. This makes feature prioritization, UX refinement, and integration with Planner, Tracker, and the Assistant explicit and governable.',
    keywords: [
      'workspace',
      'product-surface',
      'planner',
      'tracker',
      'dashboard',
      'assistant',
      'collaboration',
      'ux',
      'project-navigation',
      'n1hub',
    ],
  },
  'capsule.project.a2c.v1': {
    summary:
      'A2C Pipeline Project governs the execution stack that converts raw inputs into validated sovereign capsules. It frames ingest, normalization, segmentation, extraction, synthesis, linking, hashing, validation, and emission as one coordinated delivery stream with measurable reliability, throughput, and quality targets. The project exists to turn the A2C doctrine into resilient runtime behavior, observability, and rollout discipline rather than leaving it as a conceptual pipeline only. It is therefore the practical bridge between DeepMine extraction, CapsuleOS validation law, and the vault surfaces that receive structured knowledge artifacts.',
    keywords: [
      'a2c',
      'pipeline',
      'ingest',
      'normalize',
      'extract',
      'validate',
      'emit',
      'capsule-production',
      'observability',
      'throughput',
    ],
  },
  'capsule.project.deepmine.v1': {
    summary:
      'DeepMine Project delivers the extraction and routing infrastructure that supplies the rest of the ecosystem with high-value raw material. It covers provider abstraction, queue orchestration, caching, cost-aware model selection, and background compute policy for large-scale intelligence workloads. The hub separates this execution stream from the rest of CapsuleOS so latency, reliability, budget controls, and connector strategy can be managed as first-class concerns. In practice, DeepMine is the industrial quarry feeding A2C, the Personal AI Assistant, and future marketplace intelligence flows with sourced, ranked, and computable input.',
    keywords: [
      'deepmine',
      'extraction',
      'routing',
      'queues',
      'caching',
      'llm-infrastructure',
      'budget-control',
      'connectors',
      'background-compute',
      'source-material',
    ],
  },
  'capsule.project.n-infinity.v1': {
    summary:
      'N-Infinity Project coordinates the autonomous-agent layer that sits on top of the capsule graph. It organizes role design, orchestration policy, safety controls, and feedback loops for specialized agents such as Parliament, Weaver, Reminder, Risk Detector, Gardener, and Suggestion Agent. The project hub exists so autonomy can be expanded deliberately, with governance and measurable behavior, instead of leaking unpredictably into user-facing flows. It is the execution stream that turns graph-grounded assistance from a philosophical promise into a controlled operating capability for Workspace, Planner, Tracker, and the Assistant.',
    keywords: [
      'n-infinity',
      'agent-swarm',
      'orchestration',
      'autonomy',
      'safety-controls',
      'planner',
      'tracker',
      'assistant',
      'governance',
      'feedback-loops',
    ],
  },
  'capsule.project.mining-company.v1': {
    summary:
      'Mining Company is the strategic portfolio hub that interprets To Dig Deep as an organization, not just a slogan. It groups the economic and intellectual-capital initiatives concerned with extracting signal, refining it into durable assets, and compounding value through governance, marketplace distribution, and long-term stewardship. The project is intentionally broader than a single product: it is the container for monetization logic, capital policy, and reusable asset infrastructure. In that sense it acts as the executive layer connecting Marketplace, sovereign templates, royalties, and institutional growth.',
    keywords: [
      'mining-company',
      'portfolio',
      'intellectual-capital',
      'marketplace',
      'royalties',
      'governance',
      'capital-policy',
      'asset-infrastructure',
      'to-dig-deep',
      'institutional-growth',
    ],
  },
  'capsule.project.apsnytravel.v1': {
    summary:
      'ApsnyTravel is a sovereign root project for a travel-oriented product line with its own roadmap, ownership, and success metrics. It is kept outside the CapsuleOS execution tree on purpose: the vault treats it as an independent initiative that may reuse shared tooling without being subordinated to the core platform. This hub therefore represents domain autonomy first and integration second. It is the right place to accumulate itinerary logic, travel workflows, local knowledge, and future commercialization artifacts while preserving clean boundaries from the core N1Hub architecture.',
    keywords: [
      'apsnytravel',
      'travel-product',
      'independent-project',
      'roadmap',
      'local-knowledge',
      'workflows',
      'commercialization',
      'domain-autonomy',
      'sovereign-root',
    ],
  },
  'capsule.project.from-zero-to-megabytes.v1': {
    summary:
      'From Zero to Megabytes is a sovereign learning-and-production initiative focused on turning first-principles study into durable digital artifacts and measurable output. The project is structurally independent because its main job is compounding capability, publication, and evidence of growth rather than delivering a subsystem of CapsuleOS. As a root hub it can collect phases, artifacts, retrospectives, and throughput metrics without being diluted by platform concerns. It therefore captures a disciplined path from sparse initial skill to compounding creative and technical production.',
    keywords: [
      'from-zero-to-megabytes',
      'learning',
      'production',
      'digital-artifacts',
      'growth',
      'publication',
      'retrospectives',
      'throughput',
      'independent-project',
    ],
  },
  'capsule.project.restart-challenge.v1': {
    summary:
      'Restart Challenge is a sovereign execution-reboot initiative centered on habit recovery, measurable weekly output, and honest self-accountability. It remains a root project because its primary value is behavioral transformation rather than platform functionality. The hub is designed to accumulate phase plans, checkpoints, retrospective evidence, and challenge metrics in one place so progress can be reviewed as a coherent campaign. Within the vault it serves as the capsule-native container for rebuilding momentum through structured planning, tracking, and repeated recommitment.',
    keywords: [
      'restart-challenge',
      'habit-reboot',
      'accountability',
      'execution',
      'weekly-output',
      'retrospectives',
      'planning',
      'tracking',
      'independent-project',
    ],
  },
  'capsule.project.tilesimsv2.v1': {
    summary:
      'TileSims V2 is the forward execution hub for the next generation of the TileSims line. It captures migration planning, architecture upgrades, and release sequencing beyond the earlier TileSims concept surface while preserving explicit lineage to the existing project. The project remains inside the TileSims family rather than floating as an unrelated root because it represents a continuation and refinement, not a disconnected venture. In practice this hub is the place where next-version simulation workflows, product validation, and rollout milestones can converge into one accountable branch of work.',
    keywords: [
      'tilesimsv2',
      'next-generation',
      'migration',
      'architecture-upgrade',
      'simulation',
      'release-sequencing',
      'product-validation',
      'tilesims-lineage',
      'roadmap',
    ],
  },
  'capsule.foundation.marketplace.v1': {
    summary:
      'Marketplace is the economic exchange hub of the vault. It connects listing, licensing, pricing, reputation, settlement, and distribution so projects and templates can circulate as accountable assets instead of informal one-off transfers. The capsule matters because the economic layer in N1Hub is not an afterthought: it is where sovereign artifacts become discoverable, monetizable, and governable without losing provenance. By sitting above N1 Pass, royalties, templates, boosts, and tokenomics, Marketplace acts as the commercial operating surface for durable knowledge capital.',
    keywords: [
      'marketplace',
      'economic-hub',
      'licensing',
      'pricing',
      'settlement',
      'distribution',
      'templates',
      'royalties',
      'tokenomics',
      'knowledge-capital',
    ],
  },
  'capsule.foundation.security.v1': {
    summary:
      'Security is the protective governance hub for identity, access control, cryptography, incident handling, and trust boundaries across the CapsuleOS stack. It exists as a hub rather than a single policy note because the vault needs one place where auditability, override discipline, and quarantine semantics converge. The capsule gives architectural weight to defensive posture, making security a navigable subsystem with child artifacts instead of scattered controls. In operational terms it is the trust anchor that keeps sovereign knowledge, privileged actions, and system integrity from drifting into implicit or undocumented behavior.',
    keywords: [
      'security',
      'trust-boundary',
      'access-control',
      'cryptography',
      'incident-response',
      'auditability',
      'quarantine',
      'override-discipline',
      'system-integrity',
    ],
  },
  'capsule.foundation.audit-log.v1': {
    summary:
      'Audit Log is the forensic memory of the system. It defines how protected actions are recorded so capsule creation, mutation, validation failures, overrides, and governance decisions remain reconstructable after the fact. This capsule matters because sovereignty is not only about what exists now, but also about whether the path that produced it can be inspected and challenged. By standardizing event identity, actor attribution, subject references, and retention discipline, Audit Log turns trust from a promise into an evidentiary record usable by Security, Validator workflows, and long-term archive policy.',
    keywords: [
      'audit-log',
      'forensics',
      'event-recording',
      'validation-failures',
      'override-history',
      'retention',
      'evidence',
      'security',
      'archive-policy',
    ],
  },
  'capsule.foundation.hybrid-database.v1': {
    summary:
      'Hybrid Database captures the two-store persistence strategy underpinning the vault: relational durability where structured transactions matter and graph-native traversal where link intelligence matters. The capsule formalizes why PostgreSQL and Neo4j coexist, where each store is authoritative, and how synchronization, recovery, and query routing are kept intelligible over time. It is therefore less a storage preference than a boundary-setting artifact for consistency and performance. By making the persistence split explicit, the system preserves both operational rigor and rich graph reasoning without collapsing into a shallow one-store compromise.',
    keywords: [
      'hybrid-database',
      'postgresql',
      'neo4j',
      'persistence-strategy',
      'synchronization',
      'query-routing',
      'consistency',
      'graph-reasoning',
      'recovery',
    ],
  },
  'capsule.foundation.sleep-time-compute.v1': {
    summary:
      'Sleep-Time Compute defines the off-peak execution policy that lets the ecosystem compound work without stealing attention from active use. It governs which heavy workloads may be deferred, how cost and priority are balanced, and how quiet windows or timezone-aware rules influence scheduling. The capsule is strategically important because DeepMine, A2C, analytics, and suggestion generation can all become expensive or distracting if they compete directly with interactive flows. By encoding background execution as a first-class concept, the vault makes invisible progress accountable, tunable, and philosophically aligned with disciplined deep work.',
    keywords: [
      'sleep-time-compute',
      'off-peak',
      'background-execution',
      'scheduling',
      'quiet-windows',
      'cost-control',
      'deep-work',
      'a2c',
      'deepmine',
    ],
  },
  'capsule.foundation.testing.v1': {
    summary:
      'Testing is the evidence discipline of the platform. It defines how the vault checks schema conformance, graph integrity, runtime behavior, regressions, and release readiness across modules rather than relying on intuition or one-off manual confidence. The capsule is intentionally broad because trust in CapsuleOS requires coordinated quality signals across validator logic, APIs, storage, UI flows, and security boundaries. In practice it anchors the expectation that knowledge and code are challenged before they are trusted, making reliability a governed subsystem instead of a hopeful side effect.',
    keywords: [
      'testing',
      'quality-assurance',
      'schema-conformance',
      'graph-integrity',
      'regression',
      'release-safety',
      'validator',
      'reliability',
      'evidence-discipline',
    ],
  },
  'capsule.foundation.n1-pass.v1': {
    summary:
      'N1 Pass is the subscription and entitlement capsule for premium access across the ecosystem. It formalizes how recurring payment maps to capability unlocks, billing cadence, queue priority, premium models, and bundled benefits such as boosts or marketplace privileges. The capsule matters because monetization is only sustainable if access rules remain explicit, auditable, and composable with the rest of the graph. In effect, N1 Pass is the contract that translates economic commitment into runtime permissions without hiding business logic outside the sovereign knowledge model.',
    keywords: [
      'n1-pass',
      'subscription',
      'entitlements',
      'billing',
      'premium-access',
      'queue-priority',
      'boost-bundles',
      'marketplace-privileges',
      'runtime-permissions',
    ],
  },
  'capsule.foundation.royalty-engine.v1': {
    summary:
      'Royalty Engine is the payout and attribution subsystem that keeps derivative value from breaking lineage. It defines how revenue is split across creators or upstream contributors when templates, assets, or marketplace listings generate economic activity. This capsule is strategically important because the ecosystem promises reusable sovereign artifacts, and reuse only remains fair if distribution rules stay transparent and computable. By binding payouts to ancestry evidence, settlement logs, and dispute policy, Royalty Engine turns long-tail contribution economics into a governed mechanism rather than an informal promise.',
    keywords: [
      'royalty-engine',
      'payouts',
      'attribution',
      'lineage',
      'settlement',
      'creator-economics',
      'templates',
      'marketplace',
      'dispute-policy',
    ],
  },
  'capsule.foundation.siaf-governance.v1': {
    summary:
      'SIAF Governance is the policy layer for capital allocation inside the sovereign intellectual asset fund. It defines how proposals are introduced, how votes are weighted, what transparency is required after allocation, and which interventions are allowed when risk or urgency is high. The capsule matters because tokenomics and marketplace value need an institutional decision process, not just a treasury balance. In practical terms it links economic coordination to explicit rules, ensuring that capital deployment around knowledge assets remains reviewable, evidence-backed, and resistant to opaque discretion.',
    keywords: [
      'siaf-governance',
      'capital-allocation',
      'proposals',
      'voting',
      'treasury',
      'tokenomics',
      'transparency',
      'asset-fund',
      'policy-layer',
    ],
  },
  'capsule.foundation.sovereign-template.v1': {
    summary:
      'Sovereign Template captures the reusable blueprint model for turning hard-earned structure into distributable capital. It defines how a project or workflow can be packaged, forked, versioned, licensed, and monetized without losing lineage to its source. The capsule is important because templates are the point where internal execution knowledge becomes a portable external asset. By combining reuse, provenance, and optional royalty binding, Sovereign Template gives the ecosystem a way to scale know-how without sacrificing attribution, control, or long-term value capture.',
    keywords: [
      'sovereign-template',
      'blueprint',
      'forking',
      'versioning',
      'licensing',
      'lineage',
      'monetization',
      'reusable-knowledge',
      'royalty-binding',
    ],
  },
  'capsule.foundation.boost.v1': {
    summary:
      'Boost is the controlled acceleration mechanism for moments when ordinary queueing or budget limits are too slow. It formalizes short-term bursts of extra throughput, priority, or model budget so users can push critical A2C, DeepMine, or AI-assistant workloads without permanently distorting the system. The capsule matters because urgency exists, but unmanaged urgency becomes chaos. By treating acceleration as a policy-governed asset instead of an informal override, Boost lets the ecosystem increase execution intensity while keeping costs, fairness, and entitlement logic explicit.',
    keywords: [
      'boost',
      'acceleration',
      'queue-priority',
      'model-budget',
      'throughput',
      'a2c',
      'deepmine',
      'entitlements',
      'fairness',
    ],
  },
  'capsule.ai.conversation.v1': {
    summary:
      'AI Conversation Session models a bounded assistant dialogue with enough structure to preserve chronology, grounding references, and intent shifts across time. It is more than a chat transcript: the capsule records the continuity required for follow-up prompts, suggestions, delegated actions, and later audit review. This matters because N1Hub depends on persistent reasoning context rather than disconnected one-off completions. By treating a session as an explicit operational object, the vault can reconstruct why the assistant acted, what evidence it saw, and how a conversation eventually turned into accountable work.',
  },
  'capsule.ai.prompt.v1': {
    summary:
      'AI Prompt captures the instruction artifact that shapes model behavior across conversations, agents, and background automation. It stores constraints, expected output style, and routing hints so prompt logic becomes inspectable and versionable instead of disappearing inside opaque runtime code. The capsule matters because prompt quality directly affects trust, determinism, and the ability to debug or improve assistant behavior over time. By representing prompts as first-class operational knowledge, the vault can compare variants, audit outcomes, and refine model interaction with the same rigor applied to any other sovereign artifact.',
  },
  'capsule.ai.suggestion.v1': {
    summary:
      'AI Suggestion models a recommendation as a reviewable object with rationale, expected impact, and observable outcome rather than as disposable assistant chatter. It gives the workspace a clean bridge between model output and human decision-making by preserving why a suggestion was made, whether it was accepted, and what changed after adoption. That structure matters because useful guidance must be testable, not merely persuasive. By storing suggestions as capsules, N1Hub can learn from rejected advice, measure recommendation quality, and tie optimization back to evidence instead of intuition.',
  },
  'capsule.foundation.a2c-ingest.v1': {
    summary:
      'A2C Stage: Ingest is the capture boundary of the pipeline. It receives raw files, chats, APIs, and streams, preserves source context, and produces the first deterministic artifact passed to later stages. The stage matters because every downstream transformation depends on faithful intake rather than reconstructed memory or lossy shortcuts. By anchoring provenance fields, trace identifiers, and immutable raw payload references at the moment of arrival, Ingest ensures the Anything-to-Capsules flow begins from evidence and not assumption.',
  },
  'capsule.foundation.a2c-normalize.v1': {
    summary:
      'A2C Stage: Normalize turns heterogeneous input into a canonical intermediate form that the rest of the pipeline can trust. It harmonizes encodings, field conventions, and structural shape so segmentation and extraction operate on stable material instead of source-specific noise. This stage matters because many failures that look semantic are actually formatting or schema drift problems upstream. By making normalization explicit, the vault preserves warnings about ambiguity while still producing a predictable substrate for later reasoning, validation, and synthesis.',
  },
  'capsule.foundation.a2c-segment.v1': {
    summary:
      'A2C Stage: Segment chooses the granularity at which large inputs become processable knowledge. It breaks normalized material into bounded semantic chunks, tracks ordering, and preserves enough neighboring context that later stages can reconstruct meaning instead of treating text as isolated fragments. The stage matters because segmentation that is too coarse wastes compute, while segmentation that is too fine destroys causality and coherence. By managing chunk boundaries deliberately, Segment protects the quality of extraction, token efficiency, and the fidelity of evidence carried through the pipeline.',
  },
  'capsule.foundation.a2c-extract.v1': {
    summary:
      'A2C Stage: Extract identifies entities, claims, relations, and evidence spans inside segmented material. It is the point where raw content begins turning into machine-actionable signal, but only under explicit confidence tracking and provenance discipline. The stage matters because extracted fragments become the building blocks of every later capsule candidate; if they are vague or untraceable, synthesis inherits that weakness. By pairing candidate statements with source anchors and ambiguity notes, Extract keeps the pipeline grounded in observable evidence rather than optimistic interpretation.',
  },
  'capsule.foundation.a2c-synthesize.v1': {
    summary:
      'A2C Stage: Synthesize converts extracted fragments into coherent capsule candidates. It reconciles evidence into draft payload, metadata, summary, and link intentions while preserving open questions where the source material does not justify false certainty. The stage matters because useful capsules require integration, not mere accumulation of extracted facts. By making synthesis a dedicated step, the pipeline can optimize coherence, track lineage back to source fragments, and separate unresolved ambiguity from information that is ready to become structured sovereign knowledge.',
  },
  'capsule.foundation.a2c-link.v1': {
    summary:
      'A2C Stage: Link is where capsule candidates are connected back into the graph. It resolves target IDs, chooses canonical relation types, and filters weak or misleading topological edges before a capsule is sealed and stored. The stage matters because over-linking creates noise while under-linking destroys computability and context. By treating link inference as its own discipline, Link ensures that Anything-to-Capsules produces artifacts that are not only internally coherent but also meaningfully situated inside the wider CapsuleOS knowledge topology.',
  },
  'capsule.foundation.a2c-hash.v1': {
    summary:
      'A2C Stage: Hash computes the semantic and cryptographic seals that turn a capsule candidate into a deterministic identity-bearing artifact. It synchronizes canonical serialization, semantic hash generation, and integrity hashing before validation proceeds. This stage matters because meaning and integrity both need explicit, reproducible signatures; without them, downstream systems cannot reliably compare, trust, or version artifacts. By making sealing a separate step, Hash exposes mismatches early and prevents silent drift between what a capsule claims to represent and what its payload actually contains.',
  },
  'capsule.foundation.a2c-validate.v1': {
    summary:
      'A2C Stage: Validate is the quality gate where sealed candidates either earn entry into the sovereign graph or are stopped. It runs the 16 Validation Gates, records failures, applies safe autofixes when policy allows, and routes unresolved problems to quarantine rather than letting malformed knowledge leak into reality. This stage matters because the pipeline must be rigorous precisely where it is most tempting to be convenient. Validate is therefore the disciplined checkpoint that separates structured output from trustworthy structured knowledge.',
  },
  'capsule.foundation.a2c-emit.v1': {
    summary:
      'A2C Stage: Emit is the commit boundary where accepted candidates become durable system state. It writes validated capsules to target storage, preserves commit identifiers, and hands successful artifacts to downstream indexing, activity, or UI workflows without confusing them with rejected material. The stage matters because a valid candidate is still not reality until persistence and publication are controlled. By isolating emission from the rest of the pipeline, Emit provides idempotent write discipline, clearer rollback boundaries, and an accountable transition from validation success to live graph presence.',
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    summary:
      'N-Infinity Gardener is the graph ecologist of the swarm. It patrols for dead links, structural decay, stale active capsules, and other signs that the knowledge topology is drifting toward entropy. The agent matters because long-lived graphs do not stay healthy by accident: without pruning, archiving, and low-impact hygiene work, navigation degrades and trust erodes. Gardener therefore protects continuity by maintaining graph cleanliness non-destructively, producing reports and state transitions that keep the cognitive plane traversable without erasing historical provenance.',
  },
  'capsule.foundation.n-infinity.innovator.v1': {
    summary:
      'N-Infinity Innovator is the swarm role responsible for controlled novelty. It scans dense, high-confidence regions of the graph to propose new hypotheses, refactor overly broad hubs, and surface ideas that are implied by existing knowledge but not yet crystallized into capsules. The agent matters because a healthy system must expand its frontier without confusing speculation with truth. By minting outputs as reviewable drafts instead of forcing them directly into the active graph, Innovator turns creative synthesis into an accountable source of compound intelligence.',
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    summary:
      'N-Infinity Parliament is the epistemic arbitrator of the swarm. It investigates contradiction pressure, reviews contested links or claims, and decides whether tension should be resolved through synthesis, quarantine, or governance escalation. This role matters because a sovereign graph must know how to handle conflict, not just store parallel assertions and hope users sort them out later. Parliament provides that discipline by combining evidence review, multi-agent reasoning, and auditable resolution paths so disagreement becomes structured deliberation rather than hidden systemic drift.',
  },
  'capsule.foundation.n-infinity.weaver.v1': {
    summary:
      'N-Infinity Weaver is the relational architect that looks for connections the graph does not yet explicitly encode. It proposes soft links with probabilistic weight, helping isolated capsules find meaningful context without prematurely asserting hard truth. The agent matters because innovation and navigation often depend on seeing plausible adjacency before certainty is available. By generating reviewable hypotheses instead of irreversible structure, Weaver expands the graph’s exploratory surface while preserving the stricter integrity demanded of canonical relation types.',
  },
  'capsule.foundation.n-infinity.reminder-agent.v1': {
    summary:
      'N-Infinity Reminder Agent protects commitments from being forgotten. It scans deadlines, lateness windows, and user policy preferences to trigger reminders across the right channels at the right time. The agent matters because planning quality collapses when execution signals arrive too late or too noisily. By treating reminders as an explicit autonomous function instead of scattered notification logic, the vault can tune escalation, respect quiet hours, and preserve a durable history of nudges that shaped follow-through and accountability.',
  },
  'capsule.foundation.n-infinity.risk-detector.v1': {
    summary:
      'N-Infinity Risk Detector watches for weak signals that indicate a task, milestone, or project is drifting toward failure. It combines deadline pressure, dependency context, progress drift, and confidence signals into early warnings that humans or other agents can act on before problems become obvious. The agent matters because deep work benefits from anticipation, not just post-hoc diagnosis. By turning execution fragility into explicit risk profiles and mitigation suggestions, Risk Detector helps the graph move from passive record-keeping to active operational foresight.',
  },
  'capsule.foundation.n-infinity.suggestion-agent.v1': {
    summary:
      'N-Infinity Suggestion Agent turns analysis into options. It observes planner and tracker signals, synthesizes next actions or sequencing changes, and presents them as evidence-aware recommendations that can be accepted, rejected, or refined. This role matters because risk detection alone does not improve outcomes unless it produces plausible interventions. By connecting graph context, expected impact, and user feedback into one recommendation loop, Suggestion Agent helps the ecosystem convert complex telemetry into tractable decisions instead of generic advice.',
  },
  'capsule.foundation.architect-override.v1': {
    summary:
      'Architect Override Protocol defines the narrow path by which exceptional authority can bypass ordinary rules without becoming invisible power. It requires signed rationale, explicit scope, timestamped evidence, and mandatory review so urgent intervention remains auditable instead of informal. The capsule matters because real systems encounter deadlocks and emergencies, yet those moments are precisely where trust can be damaged most easily. By formalizing overrides as accountable governance artifacts, the vault preserves both flexibility under pressure and the long-term discipline needed to return to canonical policy.',
  },
  'capsule.foundation.quarantine-buffer.v1': {
    summary:
      'Quarantine Buffer is the isolation boundary for capsules that fail critical validation or governance checks. It preserves the rejected artifact, diagnostic context, remediation attempts, and release conditions without letting contaminated state quietly enter the live graph. The capsule matters because failure should remain inspectable, not disappear into logs or silent deletion. By turning rejection into a governed holding pattern, Quarantine Buffer protects the integrity of active knowledge while still giving maintainers and agents a structured path to repair, arbitrate, or archive problematic artifacts.',
  },
  'capsule.foundation.epistemic-ledger.v1': {
    summary:
      'Epistemic Ledger is the durable reasoning trail of the ecosystem. It records contradiction events, uncertainty notes, overrides, and arbitration outcomes so the system can explain not only what a capsule says, but why that claim was accepted, challenged, revised, or quarantined. The capsule matters because sovereign knowledge requires accountable epistemic history, not just current state snapshots. By preserving evidence references and resolution status over time, the ledger gives Parliament, Validator workflows, and human maintainers a common memory for difficult decisions.',
  },
  'capsule.foundation.g01.v1': {
    summary:
      'Validation Gate G01 protects the 5-Element Law at the outermost boundary of every capsule. It checks that exactly the five canonical root keys exist and that no stray container or missing top-level element slips through before deeper rules run. This gate matters because every other validator assumes the same structural frame; if the frame drifts, all downstream semantics become unreliable. In practice G01 is the hard stop that prevents arbitrary JSON blobs from masquerading as sovereign capsules inside CapsuleOS.',
  },
  'capsule.foundation.g02.v1': {
    summary:
      'Validation Gate G02 verifies that each root element contains the mandatory nested subfields needed for computation, provenance, and lifecycle control. It matters because a capsule with the right outer shell can still be unusable if essential metadata, neuro, or recursive-layer details are absent. G02 therefore protects completeness at the level where later stages expect specific anchors to exist. By catching missing substructure early, the gate prevents partial capsules from moving deeper into validation and becoming harder to diagnose or safely repair.',
  },
  'capsule.foundation.g03.v1': {
    summary:
      'Validation Gate G03 enforces type correctness, canonical enums, and basic value-shape sanity across the capsule. Its purpose is to stop semantic drift caused by near-miss values, invalid status labels, malformed versions, or fields stored in the wrong type altogether. That matters because higher-level reasoning depends on predictable machine semantics, not merely human-readable intent. G03 turns informal conventions into enforceable structure, ensuring that capsules remain computable and interoperable across validators, APIs, graph tools, and future automation layers.',
  },
  'capsule.foundation.g04.v1': {
    summary:
      'Validation Gate G04 checks provenance coverage and source support so claims cannot enter the graph without enough traceable grounding. It matters because sovereign knowledge is supposed to be inspectable back to origin, not accepted on rhetorical confidence alone. By enforcing thresholds around evidence linkage and provenance metadata, G04 distinguishes deeply rooted artifacts from convenient but weakly sourced assertions. The gate therefore protects the ecosystem from epistemic inflation, where polished capsules appear trustworthy despite lacking the documented path required for serious review.',
  },
  'capsule.foundation.g05.v1': {
    summary:
      'Validation Gate G05 standardizes `content_type` usage so payload semantics remain legible across tools and modules. This may look cosmetic, but it directly affects downstream rendering, ingestion policy, and interpretation of the payload surface. The gate matters because uncontrolled labels eventually become compatibility bugs disguised as harmless variation. By constraining how content type is expressed, G05 preserves a stable contract between capsule authors, validators, and consumers, keeping format expectations explicit instead of hidden in ad hoc conventions.',
  },
  'capsule.foundation.g06.v1': {
    summary:
      'Validation Gate G06 verifies that payload content is safely encoded and structurally sane before the system treats it as trustworthy material. It catches malformed encodings, invalid truncation metadata, and other payload-shape problems that can corrupt later processing or misrepresent what was actually captured. The gate matters because a capsule may look valid at the metadata level while still carrying unusable or deceptive core content. G06 therefore defends the semantic center of the artifact, ensuring the payload itself deserves further computation and storage.',
  },
  'capsule.foundation.g07.v1': {
    summary:
      'Validation Gate G07 enforces a bounded summary length so the neuro-concentrate remains informative without becoming either vacuous or bloated. The gate matters because summaries are operational compression artifacts: too short and they lose meaning, too long and they stop functioning as reliable cognitive handles for humans and agents. By fixing an acceptable range, G07 protects the balance between precision and usability. It ensures that capsule summaries remain dense enough to guide navigation, clustering, and review without collapsing into either slogans or miniature essays.',
  },
  'capsule.foundation.g08.v1': {
    summary:
      'Validation Gate G08 keeps keyword sets focused and bounded. It exists because keywords are meant to sharpen retrieval, clustering, and graph discovery, but they quickly lose value when authors overstuff them or provide too little signal. The gate matters as a discipline on semantic indexing: it prevents keyword lists from becoming either meaningless noise or anemic labels. By forcing a reasonable range, G08 improves searchability and topic clarity while keeping neuro-concentrate metadata compact enough to remain useful across interfaces and automation.',
  },
  'capsule.foundation.g09.v1': {
    summary:
      'Validation Gate G09 enforces the canonical format of the semantic hash, including token count and allowed character shape. This matters because the semantic hash is not merely decorative; it is a compact cognitive fingerprint used for recognition, grouping, and parity checks across the ecosystem. If its structure drifts, tools and humans lose a stable shorthand for meaning. G09 therefore protects the readability and comparability of capsule identity signals, ensuring semantic hashes stay predictable wherever they appear.',
  },
  'capsule.foundation.g10.v1': {
    summary:
      'Validation Gate G10 checks semantic hash parity between the metadata layer and the neuro-concentrate layer. The gate matters because a mismatch means the capsule is presenting two competing compressed identities, which undermines trust in both discoverability and downstream reasoning. By requiring exact agreement, G10 turns semantic identity into a single coherent contract instead of a loosely synchronized convenience field. It is the rule that keeps high-level capsule labeling from silently diverging across internal representations.',
  },
  'capsule.foundation.g11.v1': {
    summary:
      'Validation Gate G11 constrains graph edges to the canonical set of supported relation types. It matters because relation drift breaks computability faster than prose drift: once arbitrary edge labels appear, traversal logic, contradiction handling, and topology-aware automation become inconsistent. G11 therefore protects the shared grammar of the recursive layer by rejecting unsupported or deprecated relation semantics. The result is a graph whose links remain interpretable by validators, interfaces, and agents rather than becoming an uncontrolled folk taxonomy.',
  },
  'capsule.foundation.g12.v1': {
    summary:
      'Validation Gate G12 verifies that every linked target actually resolves to a known capsule. The gate matters because a graph full of broken references becomes both misleading and fragile, especially for automated reasoning and navigation. By checking target existence at validation time, G12 prevents dead edges from becoming normalized as acceptable structure. It is therefore a key anti-entropy rule: the graph should point to real knowledge artifacts, not imagined destinations or stale identifiers that slowly degrade systemic trust.',
  },
  'capsule.foundation.g13.v1': {
    summary:
      'Validation Gate G13 requires non-draft capsules to participate in the graph through at least one link. It matters because sovereign knowledge in CapsuleOS is not meant to live as isolated prose blobs after publication; it should relate to a wider lineage, dependency, or conceptual neighborhood. By enforcing minimal connectedness, G13 fights orphaned artifacts and encourages explicit topology. The gate therefore protects the principle that mature capsules are part of a living knowledge system, not just independently sealed documents.',
  },
  'capsule.foundation.g14.v1': {
    summary:
      'Validation Gate G14 is a defense against polished emptiness. For long or seemingly complete capsules, it checks for the deeper signs that genuine semantic work occurred rather than only cosmetic structure. The gate matters because systems often reward surface neatness while overlooking contradiction handling, tension, or genuine conceptual integration. G14 exists to catch that failure mode. It preserves epistemic seriousness by making it harder for verbose but shallow artifacts to pass as high-quality knowledge merely because they look complete at first glance.',
  },
  'capsule.foundation.g15.v1': {
    summary:
      'Validation Gate G15 enforces the canonical shape and bounds of the confidence vector. This matters because confidence data is supposed to be comparable across capsules, branches, and tools; once dimensions or ranges drift, confidence stops behaving like structured signal and becomes decorative metadata. G15 therefore keeps uncertainty representation machine-meaningful by requiring the expected dimensional contract and acceptable numeric bounds. In doing so, it preserves the ability to reason consistently about ambiguity, contradiction pressure, and evidence strength across the graph.',
  },
  'capsule.foundation.g16.v1': {
    summary:
      'Validation Gate G16 recomputes the integrity seal over canonical JSON and checks that the stored digest matches the actual capsule content. It matters because every other assurance in the system assumes that the artifact being evaluated is exactly the artifact being stored. If the seal does not verify, structural correctness is irrelevant. G16 is therefore the final cryptographic backstop that turns CapsuleOS from a merely well-organized data model into a tamper-evident sovereign knowledge system.',
  },
  'capsule.foundation.dashboard.v1': {
    summary:
      'Dashboard is the operational cockpit of the workspace. It composes widgets, filters, and refresh rules into a single surface where a user can see deadlines, risks, progress, and analytical signals without losing access to the deeper capsule graph underneath. The hub matters because execution quality depends on seeing the right information at the right level of compression. By treating dashboards as explicit graph objects rather than ad hoc UI layouts, the vault can version, personalize, and audit the way attention is directed across projects, plans, and ongoing work.',
  },
  'capsule.dashboard.widget.v1': {
    summary:
      'Dashboard Widget is the smallest visual intelligence block inside the workspace cockpit. It binds a focused query or metric slice to a specific rendering mode so users can inspect one operational question at a glance without flattening the rest of the graph into noise. The capsule matters because dashboards only stay useful when their components remain modular, composable, and tied to traceable source capsules. By modeling widgets explicitly, the vault can personalize layouts, preserve drill-down behavior, and keep each visual summary accountable to the underlying knowledge it represents.',
  },
  'capsule.foundation.analytics.v1': {
    summary:
      'Analytics is the aggregation layer that converts events, metrics, and historical capsule data into interpretable trends. It matters because planning and tracking become shallow if they rely only on immediate intuition or isolated events rather than longitudinal evidence. This capsule gives the workspace a place where rollups, trend models, retention rules, and report definitions can be coordinated as one governed capability. In practical terms, Analytics is what turns raw telemetry from Tracker, Planner, and project flows into decision support, retrospective learning, and higher-quality dashboard surfaces.',
  },
  'capsule.foundation.archive.v1': {
    summary:
      'Archive is the long-memory subsystem of the workspace. It decides how completed or inactive capsules move out of active attention without disappearing from institutional history. The capsule matters because deep systems need both focus and recall: active views should stay clean, but finished work must remain searchable, restorable, and auditable. By modeling archival rules explicitly, the vault preserves continuity across project lifecycles and lets Tracker, Analytics, and Audit Log reason over older material without cluttering live execution surfaces. Archive is therefore retention discipline, not mere cold storage.',
  },
  'capsule.foundation.calendar.v1': {
    summary:
      'Calendar is the temporal projection of the graph. It turns due dates, reminders, milestones, and scheduled commitments into a navigable time surface so execution can be understood not only structurally but chronologically. The capsule matters because work that is clearly modeled in the graph can still fail if it is weakly anchored in time. By combining planner intent, tracker signals, timezone rules, and optional external sync, Calendar keeps commitments visible at the moment they matter. It is the bridge between abstract planning structure and lived scheduling reality.',
  },
  'capsule.foundation.metric.v1': {
    summary:
      'Metric is the canonical measurable signal used to evaluate health, velocity, quality, and drift across the workspace. It matters because without explicit measurement units and aggregation windows, analytics collapses into opinion and dashboards become decorative. This capsule gives the ecosystem a durable place to define what is being measured, over which period, and against which thresholds or trends. In effect, Metric transforms scattered observations into a reusable evidence primitive that Tracker, Analytics, and project hubs can all depend on when making operational or governance decisions.',
  },
  'capsule.foundation.notification.v1': {
    summary:
      'Notification is the channel-agnostic delivery event that carries significant signals from the graph into user attention. It separates message payload, urgency, channel, and delivery result from the domain object that triggered the alert, allowing the system to route reminders, assistant nudges, and tracker warnings consistently. The capsule matters because reliable attention management depends on explicit delivery semantics, not just content generation. By modeling notifications as first-class operational artifacts, the vault can audit what was sent, through which channel, with what result, and whether that signal changed behavior.',
  },
  'capsule.foundation.reminder.v1': {
    summary:
      'Reminder is the time-bound commitment nudge that keeps planned work connected to real action. It links tasks, milestones, or goals to a future trigger point and carries the urgency and recurrence semantics needed for Tracker and Notification flows to act predictably. The capsule matters because deadlines and intentions often fail not from bad planning, but from weak follow-through at the moment of execution. By modeling reminders explicitly, the vault gives both humans and agents a durable mechanism for protecting commitments from drift, forgetfulness, and passive schedule decay.',
  },
  'capsule.foundation.user-preferences.v1': {
    summary:
      'User Preferences is the capsule that adapts the workspace to human rhythm without sacrificing rigor. It centralizes timezone, work-hour boundaries, notification policy, locale, and assistant style so scheduling, reminders, and AI behavior can respond to a coherent personal contract instead of scattered settings. The capsule matters because execution systems become noisy and brittle when they ignore the conditions under which a user actually works. By treating preferences as structured knowledge, the vault can make planning and notification behavior more humane while still keeping those adaptations explicit, reviewable, and portable across modules.',
  },
  'capsule.integration.calendar.v1': {
    summary:
      'Calendar Integration defines how internal temporal commitments meet external calendar ecosystems. It governs provider-specific mapping, sync direction, conflict policy, and health monitoring so external scheduling remains useful without silently overriding sovereign graph state. The capsule matters because time coordination quickly becomes fragile when multiple calendars compete to define reality. By modeling integration as an explicit boundary object, the vault can keep Planner and Tracker authoritative while still exporting or importing events in a controlled, auditable way. It is the discipline that makes cross-system scheduling coherent instead of accidental.',
  },
  'capsule.integration.notification.v1': {
    summary:
      'Notification Integration is the outbound connector layer that carries internal graph signals into trusted external channels such as email, push, Telegram, or webhooks. It matters because a notification system is only as useful as its delivery path, and those paths come with rate limits, credentials, retries, and acknowledgment semantics of their own. By representing the connector boundary explicitly, the vault can govern payload adaptation, failure handling, and secret-aware operations without burying them in opaque code. Notification Integration is therefore the operational bridge between internal urgency and real-world delivery reliability.',
  },
  'capsule.access.egor-n1-n1hub-v0.v1': {
    summary:
      'Egor N1 Access is the genesis access license for the private N1Hub v0 environment. It binds the founder identity capsule to root-level operational authority, bypass scope, and perpetual ownership semantics for the first live system. The capsule matters because foundational authority should be inspectable and reconstructable as graph state rather than hidden inside backend assumptions or undocumented bootstrapping. By sealing this access grant as an explicit artifact, the vault preserves a clear provenance trail for who held architect control over the original environment and under which exceptional powers that control was exercised.',
  },
  'capsule.foundation.n1hub-projects.v1': {
    summary:
      'N1Hub Projects is the portfolio view of the ecosystem’s project model. It describes how sovereign projects are instantiated, executed, collaborated on, branched, and eventually monetized without collapsing into ordinary folders or disconnected tickets. The capsule matters because projects are one of the main user-facing units of reality in N1Hub, and their lifecycle needs a coherent blueprint separate from the lower-level runtime description. By capturing project creation, collaboration, branching, and template publication in one place, this capsule serves as the conceptual map for the platform’s project economy.',
  },
  'capsule.foundation.n1hub-gold-master.v1': {
    summary:
      'N1Hub Gold Master is the constitutional doctrine of the ecosystem. It defines destination, non-negotiable principles, and strategic boundaries for turning entropy into sovereign knowledge across CapsuleOS, A2C, DeepMine, N-Infinity, Workspace, and the economic layer. The capsule matters because large systems drift when operational pragmatism is not anchored to a stable architectural north star. Gold Master is that anchor: it preserves the founding doctrine, governance posture, and trust model that downstream runtime capsules are allowed to realize but not quietly rewrite. It is the vision contract behind all later execution.',
  },
  'capsule.core.atom.v1': {
    summary:
      'Core Atom defines the irreducible unit of meaning in CapsuleOS: one capsule with one coherent payload, one identity frame, one neuro-concentrate, one recursive context, and one integrity seal. The capsule matters because graph quality collapses when evidence, action, and aggregation blur into shapeless containers. By protecting atom semantics, the system preserves provenance granularity, precise version lineage, and machine-readable boundaries for later hubs to compose without erasing detail. Atom is therefore the minimum sovereign building block from which tasks, concepts, identities, physical objects, and larger project structures can be assembled responsibly.',
    keywords: [
      'core',
      'atom',
      'irreducible-unit',
      'capsule-boundary',
      'provenance',
      'lineage',
      'payload',
      'integrity',
      'graph-building-block',
    ],
  },
  'capsule.core.constitution.v1': {
    summary:
      'Core Constitution is the non-negotiable law surface of CapsuleOS. It defines which structural, provenance, link, and integrity rules are absolute, and it clarifies that system growth must happen through versioned lineage rather than destructive mutation. The capsule matters because every validator, branch merge, and governance decision ultimately depends on one stable constitutional reference. Without that reference, architecture turns into local preference and trust degrades over time. Constitution therefore anchors the legal boundary of the graph, giving downstream runtime modules freedom to evolve only inside clearly defended systemic constraints.',
    keywords: [
      'core',
      'constitution',
      'non-negotiable-law',
      'governance',
      'lineage',
      'validation',
      'trust-boundary',
      'integrity',
      'capsuleos',
    ],
  },
  'capsule.core.first-spark.v1': {
    summary:
      'First Spark records the controlled bootstrap moment when constitutional doctrine became an active graph rather than a static specification. It matters because genesis should be reconstructable: future maintainers need to know when the system first crossed from authored principles into live, governed execution. This capsule makes that transition explicit without pretending bootstrap exempted the platform from validation or audit discipline. As a provenance checkpoint, First Spark lets the vault explain how CapsuleOS activation began, which laws already applied at that moment, and why later growth can still trace itself back to an accountable origin event.',
    keywords: [
      'core',
      'first-spark',
      'genesis',
      'bootstrap',
      'activation',
      'provenance-checkpoint',
      'auditability',
      'capsuleos',
      'origin-event',
    ],
  },
  'capsule.core.manifesto.v1': {
    summary:
      'Core Manifesto states why CapsuleOS should exist and what standards of depth it refuses to abandon in exchange for speed or convenience. It translates philosophy into explicit commitments: rigor over theater, provenance over unsupported fluency, and compounding knowledge over disposable output. The capsule matters because large systems do not drift only through broken code; they also drift through softened intent. Manifesto is therefore the normative counterweight to shallow optimization. It keeps execution aligned with purpose, ensuring that A2C, validation, and agent behavior continue to serve epistemic seriousness instead of merely producing impressive-looking artifacts.',
    keywords: [
      'core',
      'manifesto',
      'purpose',
      'epistemic-rigor',
      'provenance',
      'a2c',
      'validation',
      'agent-behavior',
      'anti-drift',
    ],
  },
  'capsule.core.compass.v1': {
    summary:
      'Core Compass is the directional governance hub that helps the ecosystem choose execution paths without rewriting constitutional law. It matters because most architectural decisions are not about whether the rules exist, but about how to prioritize within them when scale, usability, and systemic coherence compete. Compass organizes that directional judgment. It keeps long-horizon planning aligned with the Constitution and Manifesto while still leaving room for iteration in schemas, runtime modules, and project sequencing. In practice, it is the guidance layer that prevents tactical wins from slowly steering the platform away from its intended operating logic.',
    keywords: [
      'core',
      'compass',
      'directional-governance',
      'prioritization',
      'architecture',
      'constitution',
      'manifesto',
      'long-horizon',
      'system-coherence',
    ],
  },
  'capsule.foundation.to-dig-deep.v1': {
    summary:
      'To Dig Deep is the cultural operating principle that forces the ecosystem to prefer evidence, structure, and sustained synthesis over fast but hollow output. It explains why DeepMine extracts instead of accepts surface answers, why A2C refines rather than merely stores, and why validation and Dream branches exist before Real state is trusted. The capsule matters because this philosophy is not decorative branding; it is the reason the platform accepts computational and governance cost in exchange for higher-quality knowledge. To Dig Deep is therefore the normative pressure that keeps ambition tied to rigor across the entire vault.',
    keywords: [
      'to-dig-deep',
      'cultural-principle',
      'epistemic-rigor',
      'deepmine',
      'a2c',
      'validation',
      'dream-branching',
      'evidence-over-speed',
      'vault-philosophy',
    ],
  },
  'capsule.foundation.between-zero-and-one.v1': {
    summary:
      'Between Zero and One describes the transformation boundary from raw possibility to trusted sovereign artifact. Zero is not evil; it is simply unrefined input, latent potential, and unresolved noise. One is the state where structure, provenance, linkage, and integrity have become strong enough for the graph to rely on. The capsule matters because N1Hub is fundamentally a conversion system, not a passive archive. By naming this threshold explicitly, the vault can reason about A2C stages, validation requirements, and product value as parts of one coherent passage from entropy toward accountable digital capital.',
    keywords: [
      'between-zero-and-one',
      'transformation-boundary',
      'entropy',
      'negentropy',
      'a2c',
      'validation-threshold',
      'sovereign-artifact',
      'digital-capital',
      'knowledge-conversion',
    ],
  },
  'capsule.foundation.project.v1': {
    summary:
      'Project Blueprint defines how a capsule hub becomes a governed delivery space rather than a folder-shaped container. It establishes lifecycle semantics, participant boundaries, visibility modes, branchability, and the path from internal execution toward template-grade reusable capital. The capsule matters because projects are one of the main units of reality users manipulate inside N1Hub, and weak project semantics would immediately blur work, ownership, and monetization. By making project structure explicit, the vault can treat initiatives, subprojects, and physical-world programs such as TileSims as first-class sovereign graphs with accountable lineage and operational discipline.',
    keywords: [
      'project-blueprint',
      'delivery-space',
      'lifecycle',
      'visibility',
      'branchability',
      'ownership',
      'template-capital',
      'subprojects',
      'sovereign-graph',
    ],
  },
  'capsule.foundation.team.v1': {
    summary:
      'Team is the collaboration container that binds profiles, roles, permissions, and shared project participation into a durable working unit. It matters because collaboration becomes ambiguous when membership exists only as scattered links or interface state. This capsule gives the vault one place to model who works together, under which governance rules, and across which project boundaries. By treating teams as hubs, N1Hub can preserve membership history, invitation flows, accountability lines, and coordinated execution context without confusing organizational structure with either personal identity or individual permission primitives.',
    keywords: [
      'team',
      'collaboration-container',
      'membership',
      'roles',
      'permissions',
      'project-participation',
      'governance',
      'invitation-flow',
      'accountability',
    ],
  },
  'capsule.foundation.permission.v1': {
    summary:
      'Permission is the smallest governable capability unit in the collaboration layer. It defines exactly which action is allowed on which scope, under what conditions, and with which audit expectations. The capsule matters because access control loses precision when systems jump directly from identity to broad role labels without modeling actual rights. By making permissions explicit, N1Hub can reason about least privilege, exceptional overrides, policy drift, and machine-enforced boundaries with far more rigor. Permission is therefore the atomic control surface from which trustworthy roles, teams, and project governance can be assembled.',
    keywords: [
      'permission',
      'capability-unit',
      'least-privilege',
      'access-control',
      'policy',
      'auditability',
      'scope',
      'governance',
      'security',
    ],
  },
  'capsule.foundation.role.v1': {
    summary:
      'Role bundles permissions and accountability into a named collaboration posture such as owner, contributor, reviewer, or investor. It matters because people and agents need higher-level participation models that are stable enough to coordinate around, yet still traceable back to concrete capabilities. The capsule therefore sits one level above Permission: it translates atomic rights into reusable responsibility envelopes that can be assigned, compared, versioned, and audited over time. Role gives teams and projects a durable governance vocabulary for who is expected to act, decide, review, or simply observe within sovereign work.',
    keywords: [
      'role',
      'responsibility-envelope',
      'owner',
      'contributor',
      'reviewer',
      'permissions-bundle',
      'governance-vocabulary',
      'assignment',
      'accountability',
    ],
  },
  'capsule.foundation.profile.v1': {
    summary:
      'Profile is the durable identity envelope for a workspace actor. It matters because actions, authorship, preferences, and access decisions all become harder to trust when the system lacks a stable identity anchor. This capsule holds the continuity layer that lets the vault connect one person or principal across projects, teams, activity history, and personalization behavior without collapsing identity into transient session state. By modeling profiles explicitly, N1Hub preserves accountable authorship, portable user context, and a clean boundary between who someone is, what they can do, and how the workspace adapts around them.',
    keywords: [
      'profile',
      'identity-envelope',
      'authorship',
      'workspace-actor',
      'personalization',
      'portable-context',
      'accountability',
      'principal',
      'user-boundary',
    ],
  },
  'capsule.foundation.invitation.v1': {
    summary:
      'Invitation is the controlled onboarding artifact that moves a collaborator from outside the trust boundary to an explicitly scoped participant state. It matters because collaboration should begin with auditable intent, not with hidden database mutations or informal sharing. The capsule records who invited whom, to which project or team, under which role assumptions, and until what expiry or acceptance outcome. By keeping onboarding as a first-class object, N1Hub can reconstruct membership history, review failed or revoked access attempts, and preserve a clear boundary between identity discovery, permission assignment, and actual participation.',
    keywords: [
      'invitation',
      'onboarding-artifact',
      'trust-boundary',
      'membership-history',
      'role-assignment',
      'expiry',
      'team',
      'project',
      'access-review',
    ],
  },
  'capsule.foundation.access-models.v1': {
    summary:
      'Access Models describes how sovereignty, compute, and monetization are balanced across free, self-hosted, subscription, and burst-capacity tiers. It matters because pricing in N1Hub is not only a business concern; it directly shapes model access, queue priority, storage obligations, and the user’s path from experimentation to serious production. The capsule keeps those tradeoffs explicit so business rules do not leak invisibly into runtime behavior. By formalizing the tier model, the vault can reason coherently about fairness, capability boundaries, and how economic commitment maps to actual system privileges and throughput.',
    keywords: [
      'access-models',
      'tiering',
      'self-hosted',
      'subscription',
      'burst-capacity',
      'queue-priority',
      'monetization',
      'fairness',
      'capability-boundaries',
    ],
  },
  'capsule.person.egor-n1.v1': {
    summary:
      'Egor N1 is the founder-identity anchor of the vault and the primary provenance source for the earliest architectural intent behind N1Hub. The capsule matters because founders influence systems both operationally and constitutionally, and those forms of authorship should remain explicit rather than mythologized or hidden in code comments. By representing Egor N1 as a sovereign identity capsule, the graph can tie genesis access, doctrinal origin, project lineage, and long-horizon intellectual ownership to one accountable node. It is the human provenance reference behind the initial shape of the ecosystem, not merely a profile record.',
    keywords: [
      'egor-n1',
      'founder-identity',
      'provenance-anchor',
      'doctrinal-origin',
      'genesis-access',
      'project-lineage',
      'intellectual-ownership',
      'human-node',
      'n1hub',
    ],
  },
};

const metadataPatch: Record<string, PlanningMetadataPatch> = {
  'capsule.project.capsuleos.v1': {
    priority: 'critical',
    progress: 78,
    estimatedHours: 2400,
    actualHours: 1820,
    dueDate: '2026-08-31',
  },
  'capsule.project.workspace.v1': {
    priority: 'high',
    progress: 70,
    estimatedHours: 1200,
    actualHours: 860,
    dueDate: '2026-06-30',
  },
  'capsule.project.a2c.v1': {
    priority: 'high',
    progress: 56,
    estimatedHours: 900,
    actualHours: 510,
    dueDate: '2026-07-15',
  },
  'capsule.project.deepmine.v1': {
    priority: 'high',
    progress: 48,
    estimatedHours: 760,
    actualHours: 390,
    dueDate: '2026-07-31',
  },
  'capsule.project.n-infinity.v1': {
    priority: 'high',
    progress: 41,
    estimatedHours: 980,
    actualHours: 340,
    dueDate: '2026-08-15',
  },
  'capsule.project.symphony.v1': {
    priority: 'high',
    progress: 44,
    estimatedHours: 420,
    actualHours: 180,
    dueDate: '2026-07-31',
  },
  'capsule.project.tilesims.v1': {
    priority: 'medium',
    progress: 26,
    estimatedHours: 640,
    actualHours: 170,
    dueDate: '2026-09-30',
  },
  'capsule.project.tilesimsv2.v1': {
    priority: 'medium',
    progress: 12,
    estimatedHours: 720,
    actualHours: 80,
    dueDate: '2026-10-31',
  },
  'capsule.project.mining-company.v1': {
    priority: 'medium',
    progress: 18,
    estimatedHours: 540,
    actualHours: 110,
    dueDate: '2026-09-15',
  },
  'capsule.project.apsnytravel.v1': {
    priority: 'medium',
    progress: 16,
    estimatedHours: 420,
    actualHours: 70,
    dueDate: '2026-09-01',
  },
  'capsule.project.from-zero-to-megabytes.v1': {
    priority: 'high',
    progress: 22,
    estimatedHours: 480,
    actualHours: 130,
    dueDate: '2026-07-31',
  },
  'capsule.project.restart-challenge.v1': {
    priority: 'high',
    progress: 28,
    estimatedHours: 220,
    actualHours: 60,
    dueDate: '2026-05-31',
  },
  'capsule.project.n1hub-v0.v1': {
    priority: 'medium',
    progress: 86,
    estimatedHours: 180,
    actualHours: 154,
    dueDate: '2026-05-31',
  },
  'capsule.foundation.capsuleos.v1': {
    priority: 'high',
    progress: 69,
    estimatedHours: 520,
    actualHours: 330,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.n1hub.v1': {
    priority: 'high',
    progress: 72,
    estimatedHours: 420,
    actualHours: 280,
    dueDate: '2026-07-20',
  },
  'capsule.foundation.n1hub-projects.v1': {
    priority: 'medium',
    progress: 55,
    estimatedHours: 170,
    actualHours: 82,
    dueDate: '2026-07-12',
  },
  'capsule.foundation.deepmine.v1': {
    priority: 'high',
    progress: 54,
    estimatedHours: 320,
    actualHours: 160,
    dueDate: '2026-08-05',
  },
  'capsule.foundation.a2c.v1': {
    priority: 'high',
    progress: 63,
    estimatedHours: 310,
    actualHours: 190,
    dueDate: '2026-07-18',
  },
  'capsule.foundation.n-infinity.v1': {
    priority: 'high',
    progress: 46,
    estimatedHours: 360,
    actualHours: 150,
    dueDate: '2026-08-28',
  },
  'capsule.foundation.background-agent-runtime.v1': {
    priority: 'high',
    progress: 34,
    estimatedHours: 280,
    actualHours: 96,
    dueDate: '2026-08-20',
  },
  'capsule.foundation.capsule-graph-maintenance.v1': {
    priority: 'high',
    progress: 26,
    estimatedHours: 260,
    actualHours: 60,
    dueDate: '2026-08-08',
  },
  'capsule.foundation.hybrid-database.v1': {
    priority: 'medium',
    progress: 51,
    estimatedHours: 180,
    actualHours: 95,
    dueDate: '2026-07-08',
  },
  'capsule.foundation.graph-3d-visualization.v1': {
    priority: 'medium',
    progress: 23,
    estimatedHours: 240,
    actualHours: 45,
    dueDate: '2026-09-25',
  },
  'capsule.foundation.blockchain-opensource.v1': {
    priority: 'low',
    progress: 17,
    estimatedHours: 190,
    actualHours: 36,
    dueDate: '2026-10-20',
  },
  'capsule.foundation.workspace.v1': {
    priority: 'high',
    progress: 73,
    estimatedHours: 560,
    actualHours: 410,
    dueDate: '2026-06-15',
  },
  'capsule.foundation.planner.v1': {
    priority: 'high',
    progress: 62,
    estimatedHours: 260,
    actualHours: 140,
    dueDate: '2026-05-31',
  },
  'capsule.foundation.tracker.v1': {
    priority: 'high',
    progress: 58,
    estimatedHours: 240,
    actualHours: 120,
    dueDate: '2026-06-10',
  },
  'capsule.foundation.dashboard.v1': {
    priority: 'medium',
    progress: 64,
    estimatedHours: 210,
    actualHours: 135,
    dueDate: '2026-05-20',
  },
  'capsule.foundation.analytics.v1': {
    priority: 'medium',
    progress: 52,
    estimatedHours: 180,
    actualHours: 90,
    dueDate: '2026-06-20',
  },
  'capsule.foundation.calendar.v1': {
    priority: 'medium',
    progress: 49,
    estimatedHours: 140,
    actualHours: 60,
    dueDate: '2026-06-15',
  },
  'capsule.foundation.team.v1': {
    priority: 'medium',
    progress: 44,
    estimatedHours: 160,
    actualHours: 55,
    dueDate: '2026-07-01',
  },
  'capsule.foundation.notification.v1': {
    priority: 'medium',
    progress: 55,
    estimatedHours: 120,
    actualHours: 65,
    dueDate: '2026-05-25',
  },
  'capsule.foundation.reminder.v1': {
    priority: 'medium',
    progress: 57,
    estimatedHours: 90,
    actualHours: 45,
    dueDate: '2026-05-20',
  },
  'capsule.foundation.metric.v1': {
    priority: 'medium',
    progress: 51,
    estimatedHours: 110,
    actualHours: 50,
    dueDate: '2026-06-05',
  },
  'capsule.foundation.archive.v1': {
    priority: 'low',
    progress: 46,
    estimatedHours: 100,
    actualHours: 40,
    dueDate: '2026-06-30',
  },
  'capsule.foundation.user-preferences.v1': {
    priority: 'medium',
    progress: 66,
    estimatedHours: 100,
    actualHours: 72,
    dueDate: '2026-05-18',
  },
  'capsule.foundation.agent-soul.v1': {
    priority: 'high',
    progress: 42,
    estimatedHours: 120,
    actualHours: 50,
    dueDate: '2026-06-30',
  },
  'capsule.foundation.agent-skills-registry.v1': {
    priority: 'high',
    progress: 46,
    estimatedHours: 160,
    actualHours: 64,
    dueDate: '2026-07-05',
  },
  'capsule.foundation.ai-wallet.v1': {
    priority: 'high',
    progress: 58,
    estimatedHours: 180,
    actualHours: 104,
    dueDate: '2026-06-20',
  },
  'capsule.foundation.ai-control-surface.v1': {
    priority: 'high',
    progress: 37,
    estimatedHours: 220,
    actualHours: 80,
    dueDate: '2026-07-20',
  },
  'capsule.foundation.chat-to-capsules.v1': {
    priority: 'high',
    progress: 28,
    estimatedHours: 210,
    actualHours: 54,
    dueDate: '2026-08-01',
  },
  'capsule.foundation.agent-delegation.v1': {
    priority: 'high',
    progress: 32,
    estimatedHours: 180,
    actualHours: 48,
    dueDate: '2026-07-26',
  },
  'capsule.foundation.personal-ai-assistant.v1': {
    priority: 'high',
    progress: 39,
    estimatedHours: 320,
    actualHours: 110,
    dueDate: '2026-07-20',
  },
  'capsule.foundation.symphony.v1': {
    priority: 'high',
    progress: 46,
    estimatedHours: 320,
    actualHours: 128,
    dueDate: '2026-07-15',
  },
  'capsule.foundation.symphony-workflow.v1': {
    priority: 'high',
    progress: 58,
    estimatedHours: 140,
    actualHours: 80,
    dueDate: '2026-06-30',
  },
  'capsule.foundation.symphony-agent-session.v1': {
    priority: 'high',
    progress: 52,
    estimatedHours: 96,
    actualHours: 44,
    dueDate: '2026-06-25',
  },
  'capsule.foundation.symphony-run-attempt.v1': {
    priority: 'high',
    progress: 55,
    estimatedHours: 112,
    actualHours: 58,
    dueDate: '2026-06-28',
  },
  'capsule.foundation.symphony-retry-entry.v1': {
    priority: 'high',
    progress: 49,
    estimatedHours: 84,
    actualHours: 32,
    dueDate: '2026-06-24',
  },
  'capsule.foundation.symphony-approval-sandbox-policy.v1': {
    priority: 'high',
    progress: 61,
    estimatedHours: 76,
    actualHours: 39,
    dueDate: '2026-06-18',
  },
  'capsule.foundation.symphony-observability.v1': {
    priority: 'high',
    progress: 57,
    estimatedHours: 88,
    actualHours: 42,
    dueDate: '2026-06-22',
  },
  'capsule.foundation.marketplace.v1': {
    priority: 'medium',
    progress: 34,
    estimatedHours: 260,
    actualHours: 90,
    dueDate: '2026-08-20',
  },
  'capsule.foundation.goal.v1': {
    priority: 'high',
    progress: 58,
    estimatedHours: 96,
    actualHours: 54,
    dueDate: '2026-05-25',
  },
  'capsule.foundation.milestone.v1': {
    priority: 'medium',
    progress: 55,
    estimatedHours: 84,
    actualHours: 44,
    dueDate: '2026-05-28',
  },
  'capsule.foundation.roadmap.v1': {
    priority: 'high',
    progress: 53,
    estimatedHours: 120,
    actualHours: 48,
    dueDate: '2026-06-05',
  },
  'capsule.foundation.task.v1': {
    priority: 'high',
    progress: 61,
    estimatedHours: 88,
    actualHours: 57,
    dueDate: '2026-05-20',
  },
  'capsule.foundation.a2c-ingest.v1': {
    priority: 'high',
    progress: 63,
    estimatedHours: 72,
    actualHours: 42,
    dueDate: '2026-05-18',
  },
  'capsule.foundation.a2c-normalize.v1': {
    priority: 'high',
    progress: 59,
    estimatedHours: 84,
    actualHours: 46,
    dueDate: '2026-05-22',
  },
  'capsule.foundation.a2c-segment.v1': {
    priority: 'high',
    progress: 57,
    estimatedHours: 82,
    actualHours: 43,
    dueDate: '2026-05-25',
  },
  'capsule.foundation.a2c-extract.v1': {
    priority: 'high',
    progress: 56,
    estimatedHours: 96,
    actualHours: 47,
    dueDate: '2026-05-30',
  },
  'capsule.foundation.a2c-synthesize.v1': {
    priority: 'high',
    progress: 52,
    estimatedHours: 108,
    actualHours: 44,
    dueDate: '2026-06-05',
  },
  'capsule.foundation.a2c-link.v1': {
    priority: 'medium',
    progress: 54,
    estimatedHours: 86,
    actualHours: 41,
    dueDate: '2026-06-01',
  },
  'capsule.foundation.a2c-hash.v1': {
    priority: 'medium',
    progress: 67,
    estimatedHours: 62,
    actualHours: 39,
    dueDate: '2026-05-20',
  },
  'capsule.foundation.a2c-validate.v1': {
    priority: 'critical',
    progress: 64,
    estimatedHours: 112,
    actualHours: 71,
    dueDate: '2026-05-24',
  },
  'capsule.foundation.a2c-emit.v1': {
    priority: 'medium',
    progress: 58,
    estimatedHours: 78,
    actualHours: 40,
    dueDate: '2026-05-27',
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    priority: 'medium',
    progress: 46,
    estimatedHours: 110,
    actualHours: 38,
    dueDate: '2026-06-15',
  },
  'capsule.foundation.n-infinity.innovator.v1': {
    priority: 'high',
    progress: 33,
    estimatedHours: 160,
    actualHours: 44,
    dueDate: '2026-07-10',
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    priority: 'high',
    progress: 42,
    estimatedHours: 150,
    actualHours: 52,
    dueDate: '2026-06-28',
  },
  'capsule.foundation.n-infinity.reminder-agent.v1': {
    priority: 'medium',
    progress: 51,
    estimatedHours: 96,
    actualHours: 43,
    dueDate: '2026-06-08',
  },
  'capsule.foundation.n-infinity.risk-detector.v1': {
    priority: 'high',
    progress: 38,
    estimatedHours: 144,
    actualHours: 41,
    dueDate: '2026-07-05',
  },
  'capsule.foundation.n-infinity.suggestion-agent.v1': {
    priority: 'medium',
    progress: 41,
    estimatedHours: 124,
    actualHours: 39,
    dueDate: '2026-06-30',
  },
  'capsule.foundation.n-infinity.weaver.v1': {
    priority: 'high',
    progress: 43,
    estimatedHours: 138,
    actualHours: 47,
    dueDate: '2026-07-02',
  },
  'capsule.ai.conversation.v1': {
    priority: 'medium',
    progress: 48,
    estimatedHours: 88,
    actualHours: 36,
    dueDate: '2026-06-12',
  },
  'capsule.ai.prompt.v1': {
    priority: 'medium',
    progress: 52,
    estimatedHours: 80,
    actualHours: 41,
    dueDate: '2026-05-29',
  },
  'capsule.ai.suggestion.v1': {
    priority: 'medium',
    progress: 47,
    estimatedHours: 92,
    actualHours: 35,
    dueDate: '2026-06-10',
  },
  'capsule.foundation.access-models.v1': {
    priority: 'medium',
    progress: 45,
    estimatedHours: 180,
    actualHours: 70,
    dueDate: '2026-07-15',
  },
  'capsule.foundation.boost.v1': {
    priority: 'medium',
    progress: 38,
    estimatedHours: 110,
    actualHours: 35,
    dueDate: '2026-07-05',
  },
  'capsule.foundation.n1-pass.v1': {
    priority: 'medium',
    progress: 42,
    estimatedHours: 140,
    actualHours: 52,
    dueDate: '2026-07-10',
  },
  'capsule.foundation.n1-coin-tokenomics.v1': {
    priority: 'medium',
    progress: 29,
    estimatedHours: 210,
    actualHours: 60,
    dueDate: '2026-08-20',
  },
  'capsule.foundation.royalty-engine.v1': {
    priority: 'medium',
    progress: 31,
    estimatedHours: 190,
    actualHours: 54,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.siaf-governance.v1': {
    priority: 'medium',
    progress: 24,
    estimatedHours: 160,
    actualHours: 42,
    dueDate: '2026-09-01',
  },
  'capsule.foundation.sovereign-template.v1': {
    priority: 'medium',
    progress: 37,
    estimatedHours: 170,
    actualHours: 58,
    dueDate: '2026-07-25',
  },
  'capsule.foundation.sovereign-intellectual-capital.v1': {
    priority: 'medium',
    progress: 28,
    estimatedHours: 150,
    actualHours: 48,
    dueDate: '2026-08-15',
  },
  'capsule.foundation.api-gateway.v1': {
    priority: 'high',
    progress: 49,
    estimatedHours: 150,
    actualHours: 72,
    dueDate: '2026-06-25',
  },
  'capsule.foundation.integrations.v1': {
    priority: 'medium',
    progress: 44,
    estimatedHours: 170,
    actualHours: 63,
    dueDate: '2026-07-05',
  },
  'capsule.integration.calendar.v1': {
    priority: 'medium',
    progress: 46,
    estimatedHours: 120,
    actualHours: 48,
    dueDate: '2026-06-18',
  },
  'capsule.integration.notification.v1': {
    priority: 'medium',
    progress: 47,
    estimatedHours: 118,
    actualHours: 51,
    dueDate: '2026-06-20',
  },
  'capsule.foundation.security.v1': {
    priority: 'high',
    progress: 62,
    estimatedHours: 210,
    actualHours: 130,
    dueDate: '2026-06-15',
  },
  'capsule.foundation.audit-log.v1': {
    priority: 'medium',
    progress: 58,
    estimatedHours: 130,
    actualHours: 72,
    dueDate: '2026-06-12',
  },
  'capsule.foundation.architect-override.v1': {
    priority: 'medium',
    progress: 52,
    estimatedHours: 96,
    actualHours: 55,
    dueDate: '2026-06-10',
  },
  'capsule.foundation.quarantine-buffer.v1': {
    priority: 'medium',
    progress: 54,
    estimatedHours: 110,
    actualHours: 57,
    dueDate: '2026-06-14',
  },
  'capsule.foundation.sleep-time-compute.v1': {
    priority: 'medium',
    progress: 43,
    estimatedHours: 145,
    actualHours: 50,
    dueDate: '2026-07-12',
  },
  'capsule.foundation.testing.v1': {
    priority: 'high',
    progress: 57,
    estimatedHours: 180,
    actualHours: 96,
    dueDate: '2026-06-30',
  },
  'capsule.foundation.tilesims.v1': {
    priority: 'medium',
    progress: 32,
    estimatedHours: 230,
    actualHours: 84,
    dueDate: '2026-08-30',
  },
  'capsule.concept.generative-ai-tile.v1': {
    priority: 'medium',
    progress: 21,
    estimatedHours: 130,
    actualHours: 28,
    dueDate: '2026-09-10',
  },
  'capsule.concept.lidar-scanning.v1': {
    priority: 'medium',
    progress: 26,
    estimatedHours: 120,
    actualHours: 35,
    dueDate: '2026-08-25',
  },
  'capsule.concept.tile-layout-algorithm.v1': {
    priority: 'medium',
    progress: 24,
    estimatedHours: 150,
    actualHours: 32,
    dueDate: '2026-09-05',
  },
  'capsule.dashboard.widget.v1': {
    priority: 'medium',
    progress: 50,
    estimatedHours: 72,
    actualHours: 38,
    dueDate: '2026-06-08',
  },
};

const dreamMetadataPatch: Record<string, PlanningMetadataPatch> = {
  'capsule.project.capsuleos.v1': {
    progress: 61,
    estimatedHours: 3200,
    dueDate: '2026-11-30',
  },
  'capsule.project.workspace.v1': {
    progress: 52,
    estimatedHours: 1650,
    dueDate: '2026-09-15',
  },
  'capsule.project.a2c.v1': {
    progress: 37,
    estimatedHours: 1300,
    dueDate: '2026-10-15',
  },
  'capsule.project.deepmine.v1': {
    progress: 34,
    estimatedHours: 1100,
    dueDate: '2026-10-31',
  },
  'capsule.project.n-infinity.v1': {
    progress: 26,
    estimatedHours: 1500,
    dueDate: '2026-11-30',
  },
  'capsule.project.symphony.v1': {
    progress: 31,
    estimatedHours: 640,
    dueDate: '2026-10-15',
  },
  'capsule.project.tilesims.v1': {
    progress: 18,
    estimatedHours: 980,
    dueDate: '2026-12-15',
  },
  'capsule.project.tilesimsv2.v1': {
    progress: 8,
    estimatedHours: 1200,
    dueDate: '2027-02-15',
  },
  'capsule.project.mining-company.v1': {
    progress: 11,
    estimatedHours: 860,
    dueDate: '2026-12-31',
  },
  'capsule.project.apsnytravel.v1': {
    progress: 9,
    estimatedHours: 700,
    dueDate: '2026-12-01',
  },
  'capsule.project.from-zero-to-megabytes.v1': {
    progress: 14,
    estimatedHours: 760,
    dueDate: '2026-10-31',
  },
  'capsule.project.restart-challenge.v1': {
    progress: 17,
    estimatedHours: 360,
    dueDate: '2026-08-15',
  },
  'capsule.project.n1hub-v0.v1': {
    progress: 63,
    estimatedHours: 260,
    dueDate: '2026-08-15',
  },
  'capsule.foundation.capsuleos.v1': {
    progress: 54,
    estimatedHours: 760,
    dueDate: '2026-10-15',
  },
  'capsule.foundation.n1hub.v1': {
    progress: 58,
    estimatedHours: 620,
    dueDate: '2026-09-20',
  },
  'capsule.foundation.n1hub-projects.v1': {
    progress: 41,
    estimatedHours: 310,
    dueDate: '2026-09-05',
  },
  'capsule.foundation.deepmine.v1': {
    progress: 37,
    estimatedHours: 540,
    dueDate: '2026-10-20',
  },
  'capsule.foundation.a2c.v1': {
    progress: 45,
    estimatedHours: 520,
    dueDate: '2026-09-30',
  },
  'capsule.foundation.n-infinity.v1': {
    progress: 30,
    estimatedHours: 680,
    dueDate: '2026-11-10',
  },
  'capsule.foundation.background-agent-runtime.v1': {
    progress: 18,
    estimatedHours: 480,
    dueDate: '2026-11-20',
  },
  'capsule.foundation.capsule-graph-maintenance.v1': {
    progress: 14,
    estimatedHours: 420,
    dueDate: '2026-11-15',
  },
  'capsule.foundation.hybrid-database.v1': {
    progress: 34,
    estimatedHours: 280,
    dueDate: '2026-09-22',
  },
  'capsule.foundation.graph-3d-visualization.v1': {
    progress: 12,
    estimatedHours: 420,
    dueDate: '2026-12-05',
  },
  'capsule.foundation.blockchain-opensource.v1': {
    progress: 8,
    estimatedHours: 380,
    dueDate: '2027-01-20',
  },
  'capsule.foundation.workspace.v1': {
    progress: 56,
    estimatedHours: 860,
    dueDate: '2026-09-01',
  },
  'capsule.foundation.planner.v1': {
    progress: 44,
    estimatedHours: 430,
    dueDate: '2026-08-31',
  },
  'capsule.foundation.tracker.v1': {
    progress: 39,
    estimatedHours: 400,
    dueDate: '2026-09-01',
  },
  'capsule.foundation.dashboard.v1': {
    progress: 47,
    estimatedHours: 330,
    dueDate: '2026-07-31',
  },
  'capsule.foundation.analytics.v1': {
    progress: 35,
    estimatedHours: 300,
    dueDate: '2026-09-15',
  },
  'capsule.foundation.calendar.v1': {
    progress: 32,
    estimatedHours: 250,
    dueDate: '2026-09-15',
  },
  'capsule.foundation.team.v1': {
    progress: 29,
    estimatedHours: 320,
    dueDate: '2026-10-01',
  },
  'capsule.foundation.notification.v1': {
    progress: 38,
    estimatedHours: 220,
    dueDate: '2026-08-15',
  },
  'capsule.foundation.reminder.v1': {
    progress: 40,
    estimatedHours: 170,
    dueDate: '2026-08-01',
  },
  'capsule.foundation.metric.v1': {
    progress: 34,
    estimatedHours: 190,
    dueDate: '2026-08-30',
  },
  'capsule.foundation.archive.v1': {
    progress: 31,
    estimatedHours: 180,
    dueDate: '2026-09-30',
  },
  'capsule.foundation.user-preferences.v1': {
    progress: 48,
    estimatedHours: 180,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.agent-soul.v1': {
    progress: 28,
    estimatedHours: 190,
    dueDate: '2026-08-25',
  },
  'capsule.foundation.agent-skills-registry.v1': {
    progress: 31,
    estimatedHours: 240,
    dueDate: '2026-09-05',
  },
  'capsule.foundation.ai-wallet.v1': {
    progress: 42,
    estimatedHours: 260,
    dueDate: '2026-08-25',
  },
  'capsule.foundation.ai-control-surface.v1': {
    progress: 22,
    estimatedHours: 360,
    dueDate: '2026-10-10',
  },
  'capsule.foundation.chat-to-capsules.v1': {
    progress: 16,
    estimatedHours: 380,
    dueDate: '2026-10-31',
  },
  'capsule.foundation.agent-delegation.v1': {
    progress: 19,
    estimatedHours: 260,
    dueDate: '2026-09-20',
  },
  'capsule.foundation.personal-ai-assistant.v1': {
    progress: 24,
    estimatedHours: 560,
    dueDate: '2026-10-31',
  },
  'capsule.foundation.symphony.v1': {
    progress: 33,
    estimatedHours: 520,
    dueDate: '2026-09-25',
  },
  'capsule.foundation.symphony-workflow.v1': {
    progress: 41,
    estimatedHours: 220,
    dueDate: '2026-09-10',
  },
  'capsule.foundation.symphony-observability.v1': {
    progress: 38,
    estimatedHours: 150,
    dueDate: '2026-08-25',
  },
  'capsule.foundation.marketplace.v1': {
    progress: 21,
    estimatedHours: 420,
    dueDate: '2026-11-15',
  },
  'capsule.foundation.goal.v1': {
    progress: 36,
    estimatedHours: 150,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.milestone.v1': {
    progress: 34,
    estimatedHours: 132,
    dueDate: '2026-08-20',
  },
  'capsule.foundation.roadmap.v1': {
    progress: 31,
    estimatedHours: 190,
    dueDate: '2026-09-05',
  },
  'capsule.foundation.task.v1': {
    progress: 39,
    estimatedHours: 148,
    dueDate: '2026-07-25',
  },
  'capsule.foundation.a2c-ingest.v1': {
    progress: 42,
    estimatedHours: 120,
    dueDate: '2026-07-10',
  },
  'capsule.foundation.a2c-normalize.v1': {
    progress: 39,
    estimatedHours: 140,
    dueDate: '2026-07-20',
  },
  'capsule.foundation.a2c-segment.v1': {
    progress: 37,
    estimatedHours: 145,
    dueDate: '2026-07-25',
  },
  'capsule.foundation.a2c-extract.v1': {
    progress: 33,
    estimatedHours: 190,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.a2c-synthesize.v1': {
    progress: 28,
    estimatedHours: 230,
    dueDate: '2026-08-31',
  },
  'capsule.foundation.a2c-link.v1': {
    progress: 35,
    estimatedHours: 155,
    dueDate: '2026-08-05',
  },
  'capsule.foundation.a2c-hash.v1': {
    progress: 46,
    estimatedHours: 108,
    dueDate: '2026-07-15',
  },
  'capsule.foundation.a2c-validate.v1': {
    progress: 41,
    estimatedHours: 220,
    dueDate: '2026-08-15',
  },
  'capsule.foundation.a2c-emit.v1': {
    progress: 36,
    estimatedHours: 138,
    dueDate: '2026-07-30',
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    progress: 27,
    estimatedHours: 190,
    dueDate: '2026-09-15',
  },
  'capsule.foundation.n-infinity.innovator.v1': {
    progress: 19,
    estimatedHours: 280,
    dueDate: '2026-10-20',
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    progress: 24,
    estimatedHours: 250,
    dueDate: '2026-10-05',
  },
  'capsule.foundation.n-infinity.reminder-agent.v1': {
    progress: 29,
    estimatedHours: 160,
    dueDate: '2026-08-25',
  },
  'capsule.foundation.n-infinity.risk-detector.v1': {
    progress: 18,
    estimatedHours: 260,
    dueDate: '2026-10-10',
  },
  'capsule.foundation.n-infinity.suggestion-agent.v1': {
    progress: 22,
    estimatedHours: 220,
    dueDate: '2026-09-25',
  },
  'capsule.foundation.n-infinity.weaver.v1': {
    progress: 23,
    estimatedHours: 240,
    dueDate: '2026-09-30',
  },
  'capsule.ai.conversation.v1': {
    progress: 32,
    estimatedHours: 150,
    dueDate: '2026-08-30',
  },
  'capsule.ai.prompt.v1': {
    progress: 35,
    estimatedHours: 132,
    dueDate: '2026-08-05',
  },
  'capsule.ai.suggestion.v1': {
    progress: 29,
    estimatedHours: 158,
    dueDate: '2026-08-22',
  },
  'capsule.foundation.access-models.v1': {
    progress: 28,
    estimatedHours: 300,
    dueDate: '2026-10-15',
  },
  'capsule.foundation.boost.v1': {
    progress: 22,
    estimatedHours: 180,
    dueDate: '2026-09-20',
  },
  'capsule.foundation.n1-pass.v1': {
    progress: 26,
    estimatedHours: 220,
    dueDate: '2026-10-01',
  },
  'capsule.foundation.n1-coin-tokenomics.v1': {
    progress: 15,
    estimatedHours: 360,
    dueDate: '2026-12-10',
  },
  'capsule.foundation.royalty-engine.v1': {
    progress: 17,
    estimatedHours: 340,
    dueDate: '2026-11-25',
  },
  'capsule.foundation.siaf-governance.v1': {
    progress: 12,
    estimatedHours: 280,
    dueDate: '2027-01-15',
  },
  'capsule.foundation.sovereign-template.v1': {
    progress: 23,
    estimatedHours: 290,
    dueDate: '2026-10-25',
  },
  'capsule.foundation.sovereign-intellectual-capital.v1': {
    progress: 18,
    estimatedHours: 260,
    dueDate: '2026-11-20',
  },
  'capsule.foundation.api-gateway.v1': {
    progress: 31,
    estimatedHours: 250,
    dueDate: '2026-09-10',
  },
  'capsule.foundation.integrations.v1': {
    progress: 29,
    estimatedHours: 280,
    dueDate: '2026-09-25',
  },
  'capsule.integration.calendar.v1': {
    progress: 33,
    estimatedHours: 190,
    dueDate: '2026-08-20',
  },
  'capsule.integration.notification.v1': {
    progress: 34,
    estimatedHours: 188,
    dueDate: '2026-08-22',
  },
  'capsule.foundation.security.v1': {
    progress: 44,
    estimatedHours: 330,
    dueDate: '2026-09-15',
  },
  'capsule.foundation.audit-log.v1': {
    progress: 41,
    estimatedHours: 200,
    dueDate: '2026-08-25',
  },
  'capsule.foundation.architect-override.v1': {
    progress: 36,
    estimatedHours: 150,
    dueDate: '2026-08-10',
  },
  'capsule.foundation.quarantine-buffer.v1': {
    progress: 38,
    estimatedHours: 170,
    dueDate: '2026-08-18',
  },
  'capsule.foundation.sleep-time-compute.v1': {
    progress: 27,
    estimatedHours: 230,
    dueDate: '2026-10-10',
  },
  'capsule.foundation.testing.v1': {
    progress: 39,
    estimatedHours: 300,
    dueDate: '2026-09-30',
  },
  'capsule.foundation.tilesims.v1': {
    progress: 19,
    estimatedHours: 420,
    dueDate: '2026-12-20',
  },
  'capsule.concept.generative-ai-tile.v1': {
    progress: 12,
    estimatedHours: 220,
    dueDate: '2026-11-30',
  },
  'capsule.concept.lidar-scanning.v1': {
    progress: 16,
    estimatedHours: 210,
    dueDate: '2026-11-10',
  },
  'capsule.concept.tile-layout-algorithm.v1': {
    progress: 14,
    estimatedHours: 240,
    dueDate: '2026-11-20',
  },
  'capsule.dashboard.widget.v1': {
    progress: 34,
    estimatedHours: 120,
    dueDate: '2026-07-20',
  },
};

const dreamEditorialPatch: Record<string, EditorialPatch> = {
  'capsule.project.capsuleos.v1': {
    summary:
      'CapsuleOS Project in the Dream branch represents the next platform horizon rather than only the current implementation stream. It concentrates on deeper graph governance, broader branch intelligence, stronger validator orchestration, safer automation, and a cleaner operating substrate for every downstream subsystem. The project remains active because the platform is already alive, but Dream reframes it as the architecture program for what CapsuleOS still needs to become. In this branch, the hub is less about preserving the present and more about shaping the future control plane of sovereign knowledge.',
  },
  'capsule.project.workspace.v1': {
    summary:
      'Workspace Project in the Dream branch describes the target user habitat, not just the current product surface. It imagines a more unified command layer where planning, tracking, dashboards, collaboration, profile context, and the assistant feel like one coherent operational instrument instead of adjacent modules. The branch matters because the existing workspace already works, but the desired state is far more adaptive, humane, and graph-native. Dream therefore carries the roadmap for turning the workspace into a fully integrated operating environment for deep execution.',
  },
  'capsule.project.a2c.v1': {
    summary:
      'A2C Pipeline Project in the Dream branch captures the industrialized future of capsule production. It pushes beyond today’s implementation toward higher-throughput ingestion, stronger extraction discipline, better synthesis quality, richer observability, and more reliable human-in-the-loop control where uncertainty remains. The project matters because A2C is not merely a technical pipeline; it is the machine that determines how raw potential becomes sovereign graph state. Dream therefore treats A2C as a refinement factory still climbing toward greater scale, trust, and operational clarity.',
  },
  'capsule.project.deepmine.v1': {
    summary:
      'DeepMine Project in the Dream branch focuses on the aspirational extraction fabric: broader provider routing, more autonomous research sweeps, richer cache intelligence, and tighter cost-to-signal optimization across heavy intelligence workloads. The branch matters because current DeepMine infrastructure is only the first layer of what a true cognitive quarry could become. In Dream, the project evolves toward a disciplined mining engine that can supply the rest of the ecosystem with deeper, cleaner, and more strategically filtered raw material.',
  },
  'capsule.project.n-infinity.v1': {
    summary:
      'N-Infinity Project in the Dream branch is the roadmap for a more capable and better-governed autonomous swarm. It imagines agents that not only react to planner and tracker signals, but coordinate continuously around risk, synthesis, reminders, contradiction handling, and graph curation without losing auditability. The branch matters because current agent design is meaningful but incomplete. Dream preserves the target state where N-Infinity becomes a real operational intelligence lattice rather than a partially implemented family of helpers.',
  },
  'capsule.project.symphony.v1': {
    summary:
      'Symphony Project in the Dream branch represents the future repository-orchestration lane beyond the already working implementation. It imagines stronger policy loading, richer live reconciliation, better branch-aware workspaces, safer approval handling, and tighter handoff between issue intake, coding sessions, and capsule-aware status surfaces. The branch matters because the current project proves the service can run, but the longer-term target is a more durable automation substrate for N1Hub engineering. Dream therefore preserves Symphony as a deeper execution program rather than only the present repository runner.',
  },
  'capsule.project.tilesims.v1': {
    summary:
      'TileSims in the Dream branch captures the product’s intended leap from concept-rich simulation line into a more coherent spatial operating system. It carries the future state where scanning, layout logic, physical-object capsules, and branch-based renovation planning converge into one graph-native workflow. The branch matters because TileSims already has lineage and technical substance, but its strongest commercial and operational form still lives ahead. Dream therefore acts as the container for that fuller spatial product ambition.',
  },
  'capsule.project.tilesimsv2.v1': {
    summary:
      'TileSims V2 in the Dream branch is the explicit successor program for the spatial product line. It treats the next version as a clean execution arc for migration, stronger simulation fidelity, more production-grade workflows, and a clearer bridge from prototype logic to a marketable system. The branch matters because V2 is not maintenance; it is a forward architectural bet. Dream preserves that bet as an accountable project trajectory rather than leaving it as an informal aspiration.',
  },
  'capsule.project.mining-company.v1': {
    summary:
      'Mining Company in the Dream branch represents the future institutional layer around intellectual extraction, asset formation, and value compounding. It imagines a tighter connection between knowledge mining, template economics, governance, royalties, and long-horizon capital policy than the current real branch can justify today. The branch matters because this initiative is inherently strategic and partially pre-operational. Dream therefore carries the more ambitious organizational thesis: turning To Dig Deep into a durable economic institution, not just a product philosophy.',
  },
  'capsule.project.apsnytravel.v1': {
    summary:
      'ApsnyTravel in the Dream branch represents the target state of a travel intelligence product rather than its current conceptual shell. It imagines curated place knowledge, itinerary logic, execution workflows, and monetizable travel artifacts converging into a coherent domain system with clear autonomy from the main N1Hub platform. The branch matters because the initiative is directionally meaningful but still immature. Dream preserves the richer future product shape so it can evolve with explicit intent instead of vague optionality.',
  },
  'capsule.project.from-zero-to-megabytes.v1': {
    summary:
      'From Zero to Megabytes in the Dream branch is the future compounding engine for learning, publishing, and measurable creative throughput. It extends beyond today’s educational initiative toward a disciplined pipeline where study becomes repeated artifact production, publication, and evidence-backed capability growth. The branch matters because the project is less about a fixed product and more about an evolving production system for the self. Dream keeps that more ambitious transformation explicit and reviewable, making creative growth legible inside the graph.',
  },
  'capsule.project.restart-challenge.v1': {
    summary:
      'Restart Challenge in the Dream branch represents the fully realized recovery campaign rather than only the current reboot attempt. It frames habit repair, planning discipline, weekly output, and accountability as a system that should become resilient and self-reinforcing over time. The branch matters because behavioral transformation needs a target pattern, not just a log of present effort. Dream therefore preserves the intended steady-state of regained momentum and structured self-command as a governable project state.',
  },
  'capsule.project.n1hub-v0.v1': {
    summary:
      'N1Hub v0 in the Dream branch is preserved not only as a historical alpha, but as the future-controlled reference lab for migration, doctrine testing, and genesis-grade regression checks. It imagines the first environment becoming a cleaner museum and proving ground where foundational runtime behavior can still be compared against later system layers without losing the original shape of the habitat. The project matters because mature platforms need a trustworthy memory of their first live substrate. Dream therefore keeps N1Hub v0 as a reference sandbox with stronger lineage value, not merely a retired founder environment.',
  },
  'capsule.foundation.capsuleos.v1': {
    summary:
      'CapsuleOS Foundation in the Dream branch describes the next stability layer beneath the platform. It pushes toward stricter branch-aware validation, clearer merge discipline, richer activity provenance, and a more explicit contract between graph law and runtime automation. The capsule matters because future scale will fail if constitutional mechanics remain only adequate for the current vault. Dream therefore preserves CapsuleOS as a deeper operating substrate for multi-branch sovereignty rather than simply the law set that got the first system working.',
  },
  'capsule.foundation.n1hub.v1': {
    summary:
      'N1Hub Runtime in the Dream branch captures the future operating habitat where Workspace, DeepMine, A2C, N-Infinity, collaboration, and economic modules behave like one governed system instead of a set of adjacent surfaces. It imagines cleaner continuity between intelligence extraction, refinement, planning, execution, and monetization than the real branch can fully enforce today. The capsule matters because runtime quality is where architecture either becomes lived reality or stays theoretical. Dream therefore preserves N1Hub as a more unified sovereign runtime rather than only the practical shell already running now.',
  },
  'capsule.foundation.n1hub-projects.v1': {
    summary:
      'N1Hub Projects in the Dream branch represents a more mature portfolio fabric for project creation, branching, collaboration, delivery, and template publication. It pushes toward cleaner transitions between project inception, project operations, microproject decomposition, and later commercialization without breaking lineage. The capsule matters because projects are one of the main units through which the ecosystem becomes useful to humans and teams. Dream therefore preserves a stronger project model where execution and capital formation stay connected from the beginning rather than stitched together later.',
  },
  'capsule.foundation.deepmine.v1': {
    summary:
      'DeepMine in the Dream branch describes the future extraction substrate rather than only the current quarry implementation. It imagines broader provider routing, more autonomous research sweeps, stronger cache intelligence, and a cleaner conversion of expensive external intelligence into reusable raw material for the rest of the ecosystem. The capsule matters because every higher-order refinement layer is limited by extraction quality and extraction economics. Dream therefore preserves DeepMine as a more strategic intelligence-mining fabric, not merely the first asynchronous ingestion service.',
  },
  'capsule.foundation.a2c.v1': {
    summary:
      'A2C Pipeline in the Dream branch captures the future refinery discipline for turning hostile, ambiguous, or multimodal material into trustworthy sovereign capsules. It pushes beyond the current industrial pipeline toward better uncertainty routing, stronger human-in-the-loop boundaries, richer physical-world input handling, and cleaner parity between semantic structure and emitted graph state. The capsule matters because A2C determines whether raw potential becomes durable knowledge or polished confusion. Dream therefore preserves A2C as a deeper truth-refinement machine rather than only the current production pipeline.',
  },
  'capsule.foundation.n-infinity.v1': {
    summary:
      'N-Infinity in the Dream branch describes the future swarm kernel where graph-care, contradiction handling, suggestion, risk, and novelty generation coordinate with much tighter governance. It imagines agents that can collaborate continuously across branches, projects, and evidence layers without degrading auditability or flooding the graph with weak output. The capsule matters because autonomous depth is only valuable when it compounds trust instead of noise. Dream therefore preserves N-Infinity as a more mature intelligence lattice rather than only the current family of promising background agents.',
  },
  'capsule.foundation.background-agent-runtime.v1': {
    summary:
      'Background Agent Runtime in the Dream branch describes the fuller durable substrate beneath N1Hub autonomy. It pushes toward stronger resumability, cleaner lane isolation, better crash recovery, richer operator controls, and a more explicit bridge between conversational ingress, delegated tasks, and long-lived daemon work. The capsule matters because background agents only become trustworthy when the runtime beneath them is more disciplined than the models they call. Dream therefore preserves this hub as the future always-on harness for N-Infinity, Symphony, and other autonomous lanes rather than only the first night-shift runtime.',
  },
  'capsule.foundation.capsule-graph-maintenance.v1': {
    summary:
      'Capsule Graph Maintenance in the Dream branch captures a more autonomous and better-instrumented care model for the sovereign graph. It imagines stronger topology repair, contradiction routing, archival pressure, synthesis proposals, and bounded maintenance jobs that can run continuously without turning into invisible mutation. The capsule matters because long-lived graph quality depends on explicit maintenance doctrine, not just capsule creation. Dream therefore preserves this hub as the future maintenance lattice where N-Infinity roles become a disciplined stewardship system for graph health.',
  },
  'capsule.foundation.hybrid-database.v1': {
    summary:
      'Hybrid Database in the Dream branch represents a more deliberate persistence fabric for the ecosystem. It pushes toward cleaner branch snapshots, better sync guarantees, richer recovery pathways, and a more legible split between transactional certainty and graph-native traversal than the current storage boundary provides. The capsule matters because branch-aware systems eventually fail at the persistence layer if authority boundaries remain merely convenient. Dream therefore preserves Hybrid Database as a future storage contract for sovereign graph operations, not just a pragmatic two-store arrangement.',
  },
  'capsule.foundation.graph-3d-visualization.v1': {
    summary:
      '3D Graph Visualization in the Dream branch captures a more serious spatial-analysis mode for the workspace than the current optional visualization concept. It imagines stronger hierarchy encoding, better cluster navigation, richer semantic overlays, and tighter use in spatial domains like TileSims without turning the interface into novelty theater. The capsule matters because three-dimensional views only justify themselves when they reveal structure that flat views cannot. Dream therefore preserves 3D visualization as a future analytical instrument rather than a decorative rendering mode.',
  },
  'capsule.foundation.blockchain-opensource.v1': {
    summary:
      'Blockchain Open Source in the Dream branch describes a more mature external trust and ecosystem-adoption strategy than the current exploratory framing. It imagines a cleaner relationship between open specifications, developer participation, decentralized identity, tokenized asset logic, and royalty-grade settlement without allowing external narratives to outrun real product value. The capsule matters because openness and decentralization can either deepen trust or distract the platform from substance. Dream therefore preserves this line as a future expansion path where credibility, adoption, and economic design reinforce rather than dilute the core system.',
  },
  'capsule.foundation.n1hub-gold-master.v1': {
    summary:
      'N1Hub Gold Master in the Dream branch preserves the constitutional north star while extending it into the next planning horizon. It imagines doctrine that remains non-negotiable on depth, sovereignty, and trust, yet becomes clearer about branch intelligence, agent governance, productization, and economic scaling than the current articulation provides. The capsule matters because living systems need a future-facing doctrine, not just a founding proclamation frozen in reverence. Dream therefore keeps Gold Master as an active constitutional horizon for the ecosystem’s next stage, not only the preserved charter of its first one.',
  },
  'capsule.access.egor-n1-n1hub-v0.v1': {
    summary:
      'Egor N1 Access in the Dream branch reframes founder authority from pure genesis bootstrap into a more explicit architect-control contract for future environments. It imagines clearer delegation boundaries, stronger emergency-power rationale, and better lineage between exceptional founder access and the governed systems that should eventually inherit or constrain it. The capsule matters because origin authority becomes dangerous when it remains informal while the platform matures. Dream therefore preserves this access grant as a future-aware governance artifact, not merely a permanent root credential sealed in history.',
  },
  'capsule.foundation.between-zero-and-one.v1': {
    summary:
      'Between Zero and One in the Dream branch describes a more articulated passage from raw possibility to trusted sovereign capital. It imagines clearer intermediate states between noisy intake, branch-local drafts, validator-earned acceptance, and market-grade reusable knowledge than the current doctrine spells out. The capsule matters because future scale will depend on managing transitions, not only endpoints. Dream therefore preserves this threshold as a richer operational gradient for how entropy becomes accountable graph value.',
  },
  'capsule.foundation.capsule-generation-protocol.v1': {
    summary:
      'Capsule Generation Protocol in the Dream branch captures a more advanced architect-to-agent contract for minting sovereign capsules. It imagines stronger provenance discipline, better multimodal generation handling, clearer branch-aware drafting behavior, and tighter recovery loops when generated structure is promising but not yet safe for Real admission. The capsule matters because generation quality sets the ceiling for everything refinement and validation can rescue later. Dream therefore preserves this protocol as a future creation discipline rather than only the current master prompt.',
  },
  'capsule.foundation.capsuleos-schema.v1': {
    summary:
      'CapsuleOS Schema in the Dream branch describes a more extensible executable contract for the ecosystem. It pushes toward clearer extension seams, sharper branch-aware invariants, richer interoperability boundaries, and better support for future physical-world and economic payloads without weakening the five-element law. The capsule matters because schemas become strategic once multiple products and agents depend on them at once. Dream therefore preserves Schema as a future compatibility layer for scale, not only the current machine-valid shape contract.',
  },
  'capsule.foundation.capsuleos-spec.v1': {
    summary:
      'CapsuleOS Specification in the Dream branch extends doctrine toward the next architectural horizon. It imagines a cleaner articulation of branch governance, merge law, autonomous agent participation, failure-routing semantics, and cross-product operating principles than the current Gold Master text can yet fully codify. The capsule matters because future scale requires doctrine that remains rigorous while becoming more operationally explicit. Dream therefore preserves the specification as a living constitutional blueprint for the next stage of CapsuleOS, not merely the law book of the first stage.',
  },
  'capsule.foundation.epistemic-ledger.v1': {
    summary:
      'Epistemic Ledger in the Dream branch represents a richer reasoning memory for the graph. It imagines clearer contradiction lineage, stronger confidence-drift history, better human-agent arbitration traces, and more useful reconstruction of why difficult claims were accepted, revised, delayed, or rejected. The capsule matters because future trust will depend less on static answers and more on inspectable reasoning trails. Dream therefore preserves the ledger as a future epistemic memory system rather than only the current record of disputes and overrides.',
  },
  'capsule.foundation.hub-atomic.v1': {
    summary:
      'Hub / Atomic Topology in the Dream branch describes a more mature graph-composition grammar for the ecosystem. It pushes toward clearer micro-hub semantics, stronger polymorphic membership discipline, better branch-aware aggregation, and more legible navigation across nested project and product structures than the current topology doctrine fully explains. The capsule matters because future graph growth depends on composition quality at least as much as on capsule quality. Dream therefore preserves hub/atomic law as a deeper topology strategy rather than only the initial escape from folder thinking.',
  },
  'capsule.foundation.invitation.v1': {
    summary:
      'Invitation in the Dream branch describes a more deliberate onboarding contract for multi-actor collaboration. It imagines staged acceptance, richer trust negotiation, clearer temporary scopes, and better integration with role, team, and project policy before a collaborator becomes an active participant in the graph. The capsule matters because scaling collaboration safely requires more than sending access links. Dream therefore preserves Invitation as a future membership-governance instrument rather than only the current onboarding artifact.',
  },
  'capsule.foundation.permission.v1': {
    summary:
      'Permission in the Dream branch represents a more expressive capability grammar for the ecosystem. It pushes toward cleaner branch-aware rights, sharper agent delegation boundaries, better economic-action controls, and stronger emergency and audit semantics than the current baseline permission model fully encodes. The capsule matters because future sovereignty will be won or lost at the level of exact allowed actions. Dream therefore preserves Permission as a future control language for serious graph governance, not merely the smallest current access unit.',
  },
  'capsule.foundation.profile.v1': {
    summary:
      'Profile in the Dream branch describes a richer identity-continuity layer for humans and long-lived principals. It imagines better reputation memory, clearer authorship context, stronger personalization discipline, and more useful linkage between collaboration history, assistant behavior, and sovereign presence across the ecosystem. The capsule matters because future workspaces will depend on identity quality as much as on data quality. Dream therefore preserves Profile as a more capable identity substrate rather than only the current durable actor envelope.',
  },
  'capsule.foundation.project.v1': {
    summary:
      'Project Blueprint in the Dream branch represents a more advanced delivery contract for sovereign work. It imagines clearer microproject decomposition, stronger branch-native execution, richer visibility and collaboration models, and a tighter path from project operations into reusable or monetizable capital than the current blueprint fully details. The capsule matters because projects are where architecture becomes lived execution. Dream therefore preserves the blueprint as a future operating grammar for project-native graph work, not merely the present container law.',
  },
  'capsule.foundation.role.v1': {
    summary:
      'Role in the Dream branch captures a more adaptive responsibility system for both humans and agents. It imagines clearer delegation patterns, better review obligations, stronger escalation paths, and more legible coordination between permissions, teams, invitations, and project authority than the current role model yet expresses. The capsule matters because large ecosystems fail when responsibility stays ambiguous even if permissions are technically correct. Dream therefore preserves Role as a future accountability lattice rather than only today’s reusable bundle of rights.',
  },
  'capsule.foundation.to-dig-deep.v1': {
    summary:
      'To Dig Deep in the Dream branch preserves the philosophy while extending its pressure into the ecosystem’s next stage. It imagines a culture where extraction, refinement, governance, branching, and commercialization all become more disciplined under the same demand for depth rather than drifting into convenience as the platform scales. The capsule matters because founding philosophy can become ceremonial if it stops shaping future architecture. Dream therefore preserves To Dig Deep as an active expansion mandate for the next wave of N1Hub, not merely the manifesto that justified its beginning.',
  },
  'capsule.person.egor-n1.v1': {
    summary:
      'Egor N1 in the Dream branch represents not only the founder-origin of the graph, but the future strategic author node around which doctrine, direction, authorship, and stewardship continue to converge. It imagines clearer lineage between founder intent, delegated systems, institutional structures, and the broader knowledge economy the platform is trying to build. The capsule matters because founder identity becomes part of governance once the system outgrows its bootstrap phase. Dream therefore preserves Egor N1 as a future-facing provenance and stewardship anchor rather than only the human source of genesis.',
  },
  'capsule.foundation.workspace.v1': {
    summary:
      'Workspace in the Dream branch describes the target habitat for operating the graph at full depth. It emphasizes a future where planner, tracker, dashboard, assistant, collaboration, and project context act like one continuous interface contract instead of a collection of adjacent tools. The capsule matters because the runtime habitat already exists in real, but the desired form is more integrated, adaptive, and strategically aware. Dream therefore carries the architectural image of the workspace the platform is still moving toward.',
  },
  'capsule.foundation.planner.v1': {
    summary:
      'Planner in the Dream branch pushes planning toward a more adaptive system. It imagines stronger decomposition, branch-aware scenario modeling, better effort forecasting, and tighter collaboration with the assistant and N-Infinity agents when priorities shift. The capsule matters because real planning already functions, but future planning should become more anticipatory and less manual. Dream preserves that target state as a concrete module direction rather than an implicit hope, making planning quality itself a roadmap item.',
  },
  'capsule.foundation.tracker.v1': {
    summary:
      'Tracker in the Dream branch represents predictive execution intelligence rather than only monitoring. It aims toward earlier risk detection, sharper effort drift analysis, more adaptive reminder strategy, and better closed-loop learning from what plans repeatedly fail or succeed in practice. The capsule matters because accountability grows stronger when the system can forecast friction before work breaks down. Dream therefore holds the higher bar for Tracker: not just recording progress, but protecting it through earlier intervention.',
  },
  'capsule.foundation.dashboard.v1': {
    summary:
      'Dashboard in the Dream branch is the future command surface where the most important graph signals arrive already structured for decisions. It imagines richer widget composition, stronger project and branch views, better prioritization cues, and less noise between the user and the state that actually matters. The capsule matters because a dashboard is where compression quality becomes visible. Dream preserves the vision of a dashboard that guides action instead of merely displaying data, making attention design a strategic asset.',
  },
  'capsule.foundation.analytics.v1': {
    summary:
      'Analytics in the Dream branch carries the target state for deeper evidence synthesis across execution, project health, and long-horizon learning. It points toward stronger trend modeling, better retrospective intelligence, and more meaningful rollups that can inform planning rather than only describe the past. The capsule matters because real analytics already aggregates signals, but future analytics should convert them into sharper judgment. Dream keeps that higher analytical ambition explicit and gives the branch an evidence architecture for wiser prioritization.',
  },
  'capsule.foundation.calendar.v1': {
    summary:
      'Calendar in the Dream branch treats time as a smarter operational surface. It moves beyond displaying dates toward branch-aware scheduling, better conflict handling, richer temporal overlays, and a cleaner merge between personal rhythm and project commitments. The capsule matters because execution often fails in time before it fails in logic. Dream preserves the future calendar as a more intelligent temporal control layer rather than a passive view of dates, turning scheduling into an active planning instrument.',
  },
  'capsule.foundation.team.v1': {
    summary:
      'Team in the Dream branch describes a more mature collaboration unit with stronger governance memory, richer membership context, and better coupling between roles, invitations, projects, and operating rituals. The capsule matters because collaboration semantics are foundational if N1Hub is to expand beyond a mostly solo habitat. Dream therefore frames Team as the future multi-actor operating cell of the graph, not just the current collaboration placeholder, and makes collaboration scale legible before it fully arrives.',
  },
  'capsule.foundation.personal-ai-assistant.v1': {
    summary:
      'Personal AI Assistant in the Dream branch represents the transition from useful helper to graph-grounded operating copilot. It imagines stronger context continuity, better task and plan synthesis, more disciplined recommendation loops, and deeper coordination with Tracker, Planner, and N-Infinity. The capsule matters because the assistant is one of the main surfaces where sovereign knowledge becomes lived action. Dream preserves the more capable assistant the ecosystem is building toward, where the assistant becomes an execution partner rather than a convenience layer.',
  },
  'capsule.foundation.symphony.v1': {
    summary:
      'Symphony in the Dream branch captures the future orchestration doctrine for repository-bound coding agents. It imagines a stronger contract between workflow policy, tracker-driven scheduling, workspace isolation, continuation turns, approval posture, and operator visibility than the current real branch can fully guarantee today. The capsule matters because orchestration quality determines whether agent execution becomes an asset or a liability. Dream therefore preserves Symphony as the more mature automation law for N1Hub engineering, not merely the initial service specification and implementation.',
  },
  'capsule.foundation.chat-to-capsules.v1': {
    summary:
      'Chat to Capsules in the Dream branch describes a richer conversational ingress where graph grounding, drafting, explainability, and delegation feel native rather than bolted on. It imagines cleaner memory continuity, better evidence display, stronger conversion from chat into structured capsule work, and more transparent handoff into DeepMine, Symphony, or N-Infinity. The capsule matters because user trust in AI depends on seeing how conversation maps to real graph action. Dream therefore preserves Chat to Capsules as a more capable graph-native dialogue surface instead of only the first grounded chat pattern.',
  },
  'capsule.foundation.agent-delegation.v1': {
    summary:
      'Agent Delegation in the Dream branch captures a more explicit and governable handoff fabric between conversational surfaces and execution lanes. It imagines clearer task-packet schemas, approval gradients, result contracts, and escalation behavior across DeepMine, Symphony, N-Infinity, and future agents without letting orchestration vanish into prompt folklore. The capsule matters because delegation is where user intent becomes accountable machine work. Dream therefore preserves this capsule as the future routing law for inter-agent handoff rather than only the current bridge concept.',
  },
  'capsule.foundation.ai-control-surface.v1': {
    summary:
      'AI Control Surface in the Dream branch represents the fuller operator plane for AI inside N1Hub. It imagines wallet readiness, lane health, live chat grounding, delegation traces, night-shift policy, daemon controls, and debugging surfaces converging into one trustworthy operational dashboard. The capsule matters because background autonomy becomes fragile when visibility lags behind capability. Dream therefore preserves AI Control Surface as the future trust console for N1Hub intelligence rather than only the first combined screen for wallet, chat, and runtime status.',
  },
  'capsule.foundation.marketplace.v1': {
    summary:
      'Marketplace in the Dream branch captures the target exchange layer where sovereign templates, royalties, pricing, licensing, reputation, and distribution all work as one coherent economic system. It matters because the current marketplace logic is strategically important but not yet fully realized. Dream therefore keeps the higher commercial architecture explicit: a place where reusable knowledge becomes liquid capital without losing lineage, governance, or creator fairness, and where commercialization behaves like a governed system rather than a loose listing page.',
  },
  'capsule.foundation.goal.v1': {
    summary:
      'Goal in the Dream branch represents the future quality bar for strategic intention inside the workspace. It imagines goals as richer, branch-aware outcome objects with stronger key-result logic, clearer dependency context, and tighter coupling to both planner decisions and tracker evidence. The capsule matters because shallow goals quickly decay into motivational text with little operational consequence. Dream therefore preserves the higher standard where goals act as durable strategic anchors that continuously shape project sequencing, accountability, and real execution tradeoffs.',
  },
  'capsule.foundation.milestone.v1': {
    summary:
      'Milestone in the Dream branch represents a more operational phase-gate model than the current one. It pushes toward checkpoints that are not only visible on a timeline, but also linked to measurable readiness, branch alternatives, and explicit execution evidence before a phase is treated as crossed. The capsule matters because ambiguous checkpoints create false momentum and weak review discipline. Dream therefore keeps milestones as stricter decision boundaries that improve roadmap integrity, release confidence, and project realism across the graph.',
  },
  'capsule.foundation.roadmap.v1': {
    summary:
      'Roadmap in the Dream branch describes a more dynamic long-horizon planning surface than the current strategic timeline. It imagines phase models that can react to branch comparisons, risk signals, sequencing changes, and shifts in delivery confidence without collapsing into noise. The capsule matters because future planning needs more than static timelines; it needs strategic structures that stay intelligible while adapting under pressure. Dream therefore preserves the target roadmap as a living planning instrument that can guide execution without becoming brittle.',
  },
  'capsule.foundation.task.v1': {
    summary:
      'Task in the Dream branch represents a more intelligent execution atom than the current work-unit model alone. It imagines tasks with stronger decomposition quality, clearer dependency semantics, more reliable effort expectations, and richer coordination with reminder, risk, and suggestion flows across the workspace. The capsule matters because execution quality is often won or lost at the atomic level of work. Dream therefore preserves the desired state where tasks become sharper, more accountable, and better integrated into a predictive operating system for action.',
  },
  'capsule.foundation.a2c-ingest.v1': {
    summary:
      'A2C Stage: Ingest in the Dream branch pushes the intake boundary toward a richer evidence-capture system. It imagines broader channel support, cleaner raw-material preservation, stronger trace identifiers, and more reliable source envelopes before refinement begins. The stage matters because intake quality constrains every later step in the pipeline. Dream therefore keeps Ingest as a future-ready capture layer where origin context is preserved with less loss, less ambiguity, and stronger discipline around what is allowed to enter the refinery.',
  },
  'capsule.foundation.a2c-normalize.v1': {
    summary:
      'A2C Stage: Normalize in the Dream branch describes a more capable transformation layer for hostile or inconsistent input. It aims toward cleaner canonicalization, better ambiguity handling, and stronger resilience against messy upstream formats before segmentation begins. The stage matters because normalization quality determines whether later reasoning works on signal or on formatting residue. Dream therefore preserves a stricter future Normalize stage that can turn diverse raw material into a stable substrate without flattening away meaningful context.',
  },
  'capsule.foundation.a2c-segment.v1': {
    summary:
      'A2C Stage: Segment in the Dream branch represents a more precise chunking discipline than the current implementation maturity allows. It pushes toward segmentation that respects semantic boundaries, preserves causal sequence, and optimizes later extraction cost without fragmenting meaning. The stage matters because bad chunking contaminates the rest of the pipeline in subtle ways. Dream therefore keeps Segment as a future quality-control layer for granularity itself, not merely a preprocessing convenience.',
  },
  'capsule.foundation.a2c-extract.v1': {
    summary:
      'A2C Stage: Extract in the Dream branch captures a more ambitious evidence-mining layer for the refinery. It aims toward deeper claim isolation, stronger provenance anchors, better ambiguity surfacing, and more reliable separation between observed fact, inference, and unresolved uncertainty. The stage matters because extraction quality defines the raw truthfulness of everything synthesis sees later. Dream therefore preserves Extract as a future discipline of evidence harvesting rather than a simple entity-recognition pass.',
  },
  'capsule.foundation.a2c-synthesize.v1': {
    summary:
      'A2C Stage: Synthesize in the Dream branch represents the future quality bar for turning fragments into capsule candidates. It imagines stronger reconciliation of partial evidence, better handling of contradiction pressure, and more disciplined decisions about what should remain draft versus what is ready for structured commitment. The stage matters because synthesis is where the system can either produce coherent knowledge or prematurely package confusion. Dream therefore preserves Synthesize as a deeper integrative intelligence layer, not merely a formatting step.',
  },
  'capsule.foundation.a2c-link.v1': {
    summary:
      'A2C Stage: Link in the Dream branch aims toward a smarter topology-construction layer. It imagines stronger target resolution, cleaner relation inference, and better discrimination between weak adjacency and links worthy of entering the canonical graph. The stage matters because graph quality depends as much on edge discipline as on payload quality. Dream therefore preserves Link as a future topological reasoning stage that can enrich the graph without flooding it with low-value relations.',
  },
  'capsule.foundation.a2c-hash.v1': {
    summary:
      'A2C Stage: Hash in the Dream branch describes a more rigorous sealing layer for candidate capsules. It pushes toward clearer parity between semantic identity and cryptographic identity, stronger mismatch detection, and tighter diagnostics around canonicalization before artifacts move into validation. The stage matters because trust decays quickly when identity signals drift. Dream therefore preserves Hash as a future integrity discipline that makes seal generation more transparent, comparable, and operationally reliable across branches, histories, and downstream tooling.',
  },
  'capsule.foundation.a2c-validate.v1': {
    summary:
      'A2C Stage: Validate in the Dream branch represents a stricter and more explainable quality boundary for capsule admission. It imagines richer validator telemetry, better autofix boundaries, clearer quarantine routing, and stronger feedback loops from failures back into earlier pipeline stages. The stage matters because this is where structured output either earns trust or is denied entry. Dream therefore preserves Validate as a future trust gateway whose rigor becomes more visible, actionable, and evolution-friendly over time.',
  },
  'capsule.foundation.a2c-emit.v1': {
    summary:
      'A2C Stage: Emit in the Dream branch captures a more mature publication boundary for validated knowledge. It points toward safer write orchestration, clearer idempotency behavior, richer downstream notifications, and better separation between accepted output and rejected material. The stage matters because live graph state should never be produced casually. Dream therefore preserves Emit as a future commit discipline where trustworthy publication is handled with the same seriousness as validation itself and leaves a cleaner operational trail.',
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    summary:
      'N-Infinity Gardener in the Dream branch represents a more proactive graph-care agent. It moves beyond hygiene reports toward deeper decay detection, smarter archival nudges, and better coordination with Planner, Tracker, and archive policy when parts of the graph lose relevance or drift into disorder. The agent matters because knowledge systems age continuously. Dream therefore preserves Gardener as a future ecological maintainer of the graph, not just a cleanup helper running after entropy has already spread.',
  },
  'capsule.foundation.n-infinity.innovator.v1': {
    summary:
      'N-Infinity Innovator in the Dream branch represents the future frontier engine of the swarm. It imagines more disciplined hypothesis generation, stronger structural refactoring suggestions, and better conversion of latent graph patterns into reviewable strategic options without confusing speculation with truth. The agent matters because innovation becomes dangerous when it is not auditable. Dream therefore preserves Innovator as a higher-trust source of novelty, where creative expansion remains bold but explicitly governed.',
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    summary:
      'N-Infinity Parliament in the Dream branch describes a more capable deliberation layer for contradiction handling. It pushes toward richer evidence review, clearer arbitration outcomes, and stronger governance escalation when disagreement cannot be resolved through ordinary synthesis alone. The agent matters because future graph scale will multiply conflict, not eliminate it. Dream therefore preserves Parliament as a more mature epistemic institution that can keep disagreement legible, bounded, and productive across the ecosystem.',
  },
  'capsule.foundation.n-infinity.reminder-agent.v1': {
    summary:
      'N-Infinity Reminder Agent in the Dream branch represents a more context-aware commitment-preservation service. It imagines reminders that respond better to urgency, quiet hours, dependency state, and demonstrated user behavior instead of relying on simpler timing rules alone. The agent matters because well-timed follow-through is a compound advantage in execution systems. Dream therefore preserves Reminder Agent as a future nudge layer that is more adaptive, respectful, operationally precise, and traceable across channels and user contexts.',
  },
  'capsule.foundation.n-infinity.risk-detector.v1': {
    summary:
      'N-Infinity Risk Detector in the Dream branch captures the future predictive core of execution intelligence. It aims toward earlier detection of slippage, richer causal explanations, and stronger mitigation cues drawn from graph context, effort drift, and branch-aware planning signals. The agent matters because reacting after failure is too late for a serious operating system. Dream therefore preserves Risk Detector as a more anticipatory guardian of progress, capable of surfacing operational fragility while there is still time to respond.',
  },
  'capsule.foundation.n-infinity.suggestion-agent.v1': {
    summary:
      'N-Infinity Suggestion Agent in the Dream branch describes a more useful recommendation layer than generic advice can provide. It imagines stronger proposal quality, clearer expected impact, and tighter linkage between planner state, tracker evidence, and downstream decision outcomes. The agent matters because suggestions only improve work when they are relevant enough to change behavior. Dream therefore preserves Suggestion Agent as a future option-engine for the graph, not merely an explanatory assistant voice wrapped around familiar telemetry.',
  },
  'capsule.foundation.n-infinity.weaver.v1': {
    summary:
      'N-Infinity Weaver in the Dream branch represents a more advanced relational-discovery service for the graph. It pushes toward better soft-link quality, richer confidence weighting, and stronger support for surfacing latent adjacency before the system is ready to promote a relation into canonical structure. The agent matters because future graph depth will depend on discovering signal hidden between existing nodes. Dream therefore preserves Weaver as a more capable exploratory topology agent rather than a simple link suggester.',
  },
  'capsule.ai.conversation.v1': {
    summary:
      'AI Conversation Session in the Dream branch represents a richer continuity model for human-assistant work. It imagines dialogues that preserve stronger memory, cleaner grounding, better task and suggestion handoff, and more explicit transitions from conversation into accountable graph actions. The capsule matters because assistant value compounds through context, not through isolated replies. Dream therefore preserves a future conversation object that behaves more like an operational thread of work than a disposable transcript.',
  },
  'capsule.ai.prompt.v1': {
    summary:
      'AI Prompt in the Dream branch represents a more mature instruction layer for the ecosystem. It points toward prompts that are easier to compare, test, route, and govern across assistants, agents, and background workflows without disappearing into hidden application logic. The capsule matters because prompt quality quietly shapes trust, determinism, and cost. Dream therefore preserves Prompt as a future operational contract for model behavior, not just a stored instruction string hidden behind application code.',
  },
  'capsule.ai.suggestion.v1': {
    summary:
      'AI Suggestion in the Dream branch captures a more disciplined recommendation artifact than the current baseline. It imagines suggestions with clearer rationale, stronger expected-impact framing, better acceptance feedback, and tighter linkage to what actually changed after the advice was given. The capsule matters because recommendation systems improve only when they can learn from outcomes. Dream therefore preserves Suggestion as a future feedback-bearing action proposal rather than a polished but disposable assistant utterance floating outside the graph.',
  },
  'capsule.foundation.access-models.v1': {
    summary:
      'Access Models in the Dream branch describes a more mature capability-and-economics lattice for the platform. It pushes beyond current tiering toward cleaner self-hosted boundaries, sharper premium entitlements, better compute fairness, and a more intelligible path from experimentation to serious production use. The capsule matters because business rules quietly shape product reality. Dream therefore preserves Access Models as the future contract where pricing, sovereignty, and operating power align without leaking confusing incentives into the user experience.',
  },
  'capsule.foundation.boost.v1': {
    summary:
      'Boost in the Dream branch represents a more deliberate acceleration asset than the current throughput override model. It imagines clearer burst semantics, better fairness under shared compute, stronger coupling to entitlement policy, and more visible cost-to-impact tradeoffs when users push urgent workloads. The capsule matters because unmanaged urgency becomes architecture debt. Dream therefore preserves Boost as a future execution amplifier that can increase speed without dissolving governance, pricing clarity, or queue discipline.',
  },
  'capsule.foundation.n1-pass.v1': {
    summary:
      'N1 Pass in the Dream branch describes a more coherent subscription contract for the ecosystem. It pushes toward cleaner mapping between payment, entitlement, premium models, collaboration rights, and recurring compute allowances without scattering that logic across disconnected modules. The capsule matters because subscriptions become brittle when business rules are implicit. Dream therefore preserves N1 Pass as a future operating agreement where premium access is explicit, composable, and legible across the whole graph.',
  },
  'capsule.foundation.n1-coin-tokenomics.v1': {
    summary:
      'N1 Coin Tokenomics in the Dream branch captures the future economic architecture around creator rewards, usage incentives, treasury logic, and network effects. It imagines a tighter link between marketplace activity, subscription economics, royalty flows, and ecosystem governance than the real branch can yet justify. The capsule matters because token logic can distort products if it arrives before the underlying system is mature. Dream therefore preserves tokenomics as a strategic design space that stays explicit, reviewable, and subordinate to real product value.',
  },
  'capsule.foundation.royalty-engine.v1': {
    summary:
      'Royalty Engine in the Dream branch represents a more powerful attribution-and-settlement layer for reusable knowledge assets. It pushes toward cleaner downstream lineage accounting, richer dispute handling, and better coordination with marketplace, templates, and token economics when value moves through derivative work. The capsule matters because creator fairness breaks down quickly at scale if payout logic stays approximate. Dream therefore preserves Royalty Engine as a future trust mechanism for economic reuse, not just a payout calculator.',
  },
  'capsule.foundation.siaf-governance.v1': {
    summary:
      'SIAF Governance in the Dream branch describes a more mature institutional layer for treasury and capital allocation. It imagines clearer proposal pathways, stronger intervention rules, better transparency artifacts, and a more robust relationship between funding decisions and long-horizon ecosystem strategy. The capsule matters because governance quality determines whether capital compounds wisdom or merely noise. Dream therefore preserves SIAF as a future decision system for economic stewardship, not just a symbolic fund wrapper.',
  },
  'capsule.foundation.sovereign-template.v1': {
    summary:
      'Sovereign Template in the Dream branch captures a more advanced packaging layer for reusable knowledge capital. It pushes toward cleaner versioning, richer licensing options, stronger derivation tracking, and a more direct path from internal project structure to external market-ready assets. The capsule matters because templates are where private execution turns into distributable leverage. Dream therefore preserves Sovereign Template as a future productization discipline for know-how, not merely a reusable snapshot format.',
  },
  'capsule.foundation.sovereign-intellectual-capital.v1': {
    summary:
      'Sovereign Intellectual Capital in the Dream branch represents the future value layer of the entire ecosystem. It imagines a cleaner path from raw extraction to governed, monetizable, lineage-rich assets that can compound across products, institutions, and markets without losing provenance. The capsule matters because the platform’s philosophical promise only becomes real when knowledge gains durable economic shape. Dream therefore preserves this capsule as the future state where intellectual capital behaves like a managed asset class inside the graph.',
  },
  'capsule.foundation.api-gateway.v1': {
    summary:
      'API Gateway in the Dream branch describes a more policy-aware ingress and egress boundary for the platform. It pushes toward stricter service contracts, better secret handling, clearer rate governance, and stronger observability around what external systems are allowed to touch or retrieve. The capsule matters because integration surfaces become silent trust leaks when they stay under-modeled. Dream therefore preserves API Gateway as a future control boundary where external connectivity is powerful without becoming opaque.',
  },
  'capsule.foundation.integrations.v1': {
    summary:
      'Integrations in the Dream branch captures a more deliberate connector fabric for the ecosystem. It imagines external services joining the graph through clearer capability boundaries, better health monitoring, and stronger alignment with sovereign data policy than the real branch currently enforces. The capsule matters because useful ecosystems eventually depend on connectors, but connectors also widen the attack and complexity surface. Dream therefore preserves Integrations as a future architecture layer for governed interoperability, not accidental plugin sprawl.',
  },
  'capsule.integration.calendar.v1': {
    summary:
      'Calendar Integration in the Dream branch represents a more intelligent bridge between internal planning reality and external calendar ecosystems. It pushes toward cleaner sync semantics, richer conflict policy, better branch awareness, and stronger protection against external systems quietly rewriting the platform’s temporal truth. The capsule matters because calendar sync becomes dangerous when convenience outruns governance. Dream therefore preserves Calendar Integration as a future connector discipline where interoperability stays useful without compromising local sovereignty.',
  },
  'capsule.integration.notification.v1': {
    summary:
      'Notification Integration in the Dream branch describes a more resilient delivery fabric for turning internal graph urgency into external signals. It imagines stronger channel governance, cleaner retries, richer acknowledgment handling, and better adaptation to user context across email, push, Telegram, or webhook routes. The capsule matters because alerting only works if delivery remains reliable under real operational pressure. Dream therefore preserves Notification Integration as a future connector layer for trustworthy outward communication, not a thin transport shim.',
  },
  'capsule.foundation.security.v1': {
    summary:
      'Security in the Dream branch captures the future trust operating system of the platform. It imagines a tighter synthesis of identity, access, incident response, cryptographic guarantees, audit evidence, and exception handling than the current runtime can fully enforce today. The capsule matters because large systems become fragile where trust assumptions remain implicit. Dream therefore preserves Security as a future command layer for defensive coherence, where protection becomes a first-class architectural capability rather than a set of scattered controls.',
  },
  'capsule.foundation.audit-log.v1': {
    summary:
      'Audit Log in the Dream branch represents a stronger evidentiary memory for the platform. It pushes toward richer event granularity, better causal reconstruction, cleaner actor lineage, and more useful long-horizon review of how graph state actually changed over time. The capsule matters because trust depends on reconstructability, not on declarations alone. Dream therefore preserves Audit Log as a future forensic substrate for the ecosystem, not just a record of notable mutations.',
  },
  'capsule.foundation.architect-override.v1': {
    summary:
      'Architect Override Protocol in the Dream branch describes a more disciplined exceptional-control mechanism for the platform. It imagines clearer review loops, stronger rationale requirements, and better post-incident normalization when extraordinary authority must bypass ordinary rules under pressure. The capsule matters because emergency power can either save systems or quietly corrupt them. Dream therefore preserves Architect Override as a future governance artifact for controlled exception handling, not a hidden escape hatch.',
  },
  'capsule.foundation.quarantine-buffer.v1': {
    summary:
      'Quarantine Buffer in the Dream branch captures a more advanced failure-containment layer for the ecosystem. It pushes toward richer remediation state, cleaner handoff to human or agent review, and better differentiation between malformed knowledge, risky uncertainty, and true contamination. The capsule matters because serious systems need more than rejection; they need structured recovery paths. Dream therefore preserves Quarantine Buffer as a future isolation environment for repairable failure, not merely a holding bin for rejected capsules.',
  },
  'capsule.foundation.sleep-time-compute.v1': {
    summary:
      'Sleep-Time Compute in the Dream branch describes a more strategic background execution fabric for the ecosystem. It imagines stronger off-peak scheduling policy, better cost shaping, richer workload classes, and more intelligent integration with planner, tracker, and user context than the current baseline provides. The capsule matters because invisible progress only stays valuable when it remains bounded and intentional. Dream therefore preserves Sleep-Time Compute as a future engine for quiet compounding work, not just deferred job execution.',
  },
  'capsule.foundation.testing.v1': {
    summary:
      'Testing in the Dream branch represents a more integrated quality discipline across the platform. It pushes toward broader contract checks, deeper graph invariants, stronger regression memory, and clearer alignment between runtime confidence and actual evidence. The capsule matters because systems become shallow when confidence outruns verification. Dream therefore preserves Testing as a future reliability fabric for the ecosystem, where quality is continuously measured across code, data, branches, and graph behavior.',
  },
  'capsule.foundation.tilesims.v1': {
    summary:
      'TileSims Foundation in the Dream branch represents the future spatial operating substrate beneath the product line. It imagines a stronger bridge between physical-object capsules, geometry capture, branching, cost intelligence, and field execution workflows than the current concept surface can yet deliver. The capsule matters because the spatial line is one of the clearest proofs that CapsuleOS can govern reality, not only documents. Dream therefore preserves TileSims as a future physical-world graph foundation rather than a promising but partial concept.',
  },
  'capsule.concept.generative-ai-tile.v1': {
    summary:
      'Generative AI Tile in the Dream branch captures the future design-copilot layer of TileSims. It imagines more explainable alternative generation, better cost-aware style exploration, and tighter coupling between user intent, geometry constraints, and execution consequences before a design is accepted. The concept matters because generative design becomes shallow when it optimizes only aesthetics. Dream therefore preserves this capsule as a future design-intelligence concept where creativity stays accountable to buildability and traceable tradeoffs.',
  },
  'capsule.concept.lidar-scanning.v1': {
    summary:
      'LiDAR Scanning in the Dream branch describes a more mature geometry-acquisition concept for TileSims. It pushes toward cleaner capture pipelines, stronger calibration discipline, better uncertainty handling, and more useful downstream handoff into layout and cost logic than the current concept state provides. The concept matters because spatial intelligence starts with trustworthy geometry. Dream therefore preserves LiDAR Scanning as a future measurement foundation for the product, not just an input technique.',
  },
  'capsule.concept.tile-layout-algorithm.v1': {
    summary:
      'Tile Layout Algorithm in the Dream branch represents the future optimization core of TileSims. It imagines stronger pattern selection, richer boundary handling, better waste and labor reasoning, and more transparent tradeoff scoring across competing layout strategies. The concept matters because layout quality determines whether the spatial graph becomes economically useful or only visually interesting. Dream therefore preserves this capsule as a future decision engine for explainable layout intelligence, not merely a placement heuristic.',
  },
  'capsule.dashboard.widget.v1': {
    summary:
      'Dashboard Widget in the Dream branch describes a more expressive visual intelligence atom for the workspace. It pushes toward widgets that react better to branch state, project context, priority signals, and drill-down semantics without becoming noisy or decorative. The capsule matters because dashboard quality is constrained by the quality of its smallest units. Dream therefore preserves Widget as a future attention-shaping component where each visual block becomes more decision-relevant and less like a passive chart tile.',
  },
};

interface CliOptions {
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath: string): Promise<void> {
  try {
    await fs.access(targetPath);
  } catch {
    await fs.mkdir(targetPath, { recursive: true });
  }
}

function getSafeStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getPartOfLinks(capsule: SovereignCapsule) {
  return Array.isArray(capsule.recursive_layer.links)
    ? capsule.recursive_layer.links.filter((link) => link.relation_type === 'part_of')
    : [];
}

function syncPartOf(capsule: SovereignCapsule, parentIds: string[]): boolean {
  const links = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links : [];
  const currentParents = links
    .filter((link) => link.relation_type === 'part_of')
    .map((link) => link.target_id)
    .filter((targetId): targetId is string => typeof targetId === 'string')
    .sort((left, right) => left.localeCompare(right));
  const nextParents = [...new Set(parentIds)].sort((left, right) => left.localeCompare(right));

  if (
    currentParents.length === nextParents.length &&
    currentParents.every((parentId, index) => parentId === nextParents[index])
  ) {
    return false;
  }

  capsule.recursive_layer.links = [
    ...links.filter((link) => link.relation_type !== 'part_of'),
    ...nextParents.map((parentId) => ({ target_id: parentId, relation_type: 'part_of' })),
  ];
  return true;
}

function syncSupplementalLinks(
  capsule: SovereignCapsule,
  desiredLinks: SupplementalLink[] | undefined,
): boolean {
  if (!desiredLinks || desiredLinks.length === 0) return false;

  const links = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links : [];
  const existingPairs = new Set(
    links
      .filter(
        (link) =>
          typeof link?.target_id === 'string' &&
          typeof link?.relation_type === 'string' &&
          link.target_id.length > 0 &&
          link.relation_type.length > 0,
      )
      .map((link) => `${link.target_id}::${link.relation_type}`),
  );

  const additions = desiredLinks.filter(
    (link) =>
      typeof link.target_id === 'string' &&
      link.target_id.length > 0 &&
      typeof link.relation_type === 'string' &&
      link.relation_type.length > 0 &&
      !existingPairs.has(`${link.target_id}::${link.relation_type}`),
  );

  if (additions.length === 0) return false;

  capsule.recursive_layer.links = [...links, ...additions];
  return true;
}

function normalizeParentSpec(parentSpec: ParentSpec | undefined): string[] {
  if (!parentSpec) return [];

  const raw = Array.isArray(parentSpec) ? parentSpec : [parentSpec];
  return [...new Set(raw.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function buildResolvedParentMap(capsules: Map<string, SovereignCapsule>): Record<string, string[]> {
  const resolved: Record<string, string[]> = {};

  for (const capsule of capsules.values()) {
    const existingParents = getPartOfLinks(capsule)
      .map((link) => link.target_id)
      .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0);

    if (existingParents.length > 0) {
      resolved[capsule.metadata.capsule_id] = [...new Set(existingParents)];
    }
  }

  for (const [capsuleId, parentSpec] of Object.entries(parentMap)) {
    const configuredParents = normalizeParentSpec(parentSpec);
    if (configuredParents.length > 0) {
      resolved[capsuleId] = configuredParents;
    }
  }

  return resolved;
}

function markUpdated(capsule: SovereignCapsule, nowIso: string): void {
  capsule.metadata.updated_at = nowIso;
  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
}

function applyMetadataPatch(
  capsule: SovereignCapsule,
  patch: PlanningMetadataPatch | undefined,
): boolean {
  if (!patch) return false;

  let changed = false;
  const metadata = capsule.metadata as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    if (metadata[key] !== value) {
      metadata[key] = value;
      changed = true;
    }
  }

  return changed;
}

function applyEditorialPatch(capsule: SovereignCapsule, patch: EditorialPatch | undefined): boolean {
  if (!patch) return false;

  let changed = false;

  if (patch.summary && capsule.neuro_concentrate.summary !== patch.summary) {
    capsule.neuro_concentrate.summary = patch.summary;
    changed = true;
  }

  if (
    patch.keywords &&
    JSON.stringify(capsule.neuro_concentrate.keywords ?? []) !== JSON.stringify(patch.keywords)
  ) {
    capsule.neuro_concentrate.keywords = [...patch.keywords];
    changed = true;
  }

  return changed;
}

function applyTierCuration(capsule: SovereignCapsule): boolean {
  const tier = resolveCapsuleTier(capsule.metadata.capsule_id);
  if (capsule.metadata.tier === tier) return false;

  capsule.metadata.tier = tier;
  return true;
}

function applyStructuralCuration(
  capsule: SovereignCapsule,
  branch: 'real' | 'dream',
  resolvedParentMap: Record<string, string[]>,
): boolean {
  const id = capsule.metadata.capsule_id;
  let changed = false;

  if (subtypeHubIds.has(id) && capsule.metadata.subtype !== 'hub') {
    capsule.metadata.subtype = 'hub';
    changed = true;
  }

  if (applyTierCuration(capsule)) {
    changed = true;
  }

  if (namePatch[id] && (capsule.metadata.name ?? '') !== namePatch[id]) {
    capsule.metadata.name = namePatch[id];
    changed = true;
  }

  const parentIds = resolvedParentMap[id] ?? [];
  if (parentIds.length > 0 && syncPartOf(capsule, parentIds)) {
    changed = true;
  }

  if (syncSupplementalLinks(capsule, supplementalLinks[id])) {
    changed = true;
  }

  if (applyEditorialPatch(capsule, editorialPatch[id])) {
    changed = true;
  }

  if (branch === 'dream' && applyEditorialPatch(capsule, dreamEditorialPatch[id])) {
    changed = true;
  }

  if (applyMetadataPatch(capsule, metadataPatch[id])) {
    changed = true;
  }

  if (branch === 'dream' && applyMetadataPatch(capsule, dreamMetadataPatch[id])) {
    changed = true;
  }

  return changed;
}

async function loadRealCapsules(): Promise<Map<string, SovereignCapsule>> {
  const files = (await fs.readdir(CAPSULES_DIR))
    .filter((file) => file.endsWith('.json') && !file.includes('@') && !file.endsWith('.dream.json'))
    .sort((left, right) => left.localeCompare(right));

  const map = new Map<string, SovereignCapsule>();
  for (const file of files) {
    const capsule = JSON.parse(
      await fs.readFile(path.join(CAPSULES_DIR, file), 'utf-8'),
    ) as SovereignCapsule;
    map.set(capsule.metadata.capsule_id, capsule);
  }
  return map;
}

async function validateOrThrow(
  capsule: SovereignCapsule,
  existingIds: Set<string>,
  label: string,
): Promise<void> {
  const validation = await validateCapsule(capsule, { existingIds });
  if (!validation.valid) {
    throw new Error(
      `${label} validation failed: ${validation.errors.map((issue) => `${issue.gate} ${issue.path}`).join(', ')}`,
    );
  }
}

async function backupVault(dryRun: boolean): Promise<string> {
  const backupDir = path.join(process.cwd(), 'data', `capsules_backup_reorg_${getSafeStamp()}`);
  if (dryRun) return backupDir;

  await ensureDir(backupDir);
  await fs.cp(CAPSULES_DIR, path.join(backupDir, 'capsules'), { recursive: true });
  if (await exists(BRANCHES_DIR)) {
    await fs.cp(BRANCHES_DIR, path.join(backupDir, 'branches'), { recursive: true });
  }
  return backupDir;
}

async function curateRealBranch(dryRun: boolean): Promise<{ realChanged: number; realOrphans: number }> {
  const nowIso = new Date().toISOString();
  const capsules = await loadRealCapsules();
  const resolvedParentMap = buildResolvedParentMap(capsules);
  const existingIds = new Set(capsules.keys());
  let realChanged = 0;

  for (const [id, capsule] of capsules) {
    const changed = applyStructuralCuration(capsule, 'real', resolvedParentMap);

    if (!changed) continue;

    markUpdated(capsule, nowIso);
    await validateOrThrow(capsule, existingIds, `real:${id}`);

    if (!dryRun) {
      await fs.writeFile(
        path.join(CAPSULES_DIR, `${path.basename(id)}.json`),
        JSON.stringify(capsule, null, 2),
        'utf-8',
      );
    }
    realChanged += 1;
  }

  const finalCapsules = dryRun ? capsules : await loadRealCapsules();
  const realOrphans = [...finalCapsules.values()].filter(
    (capsule) => capsule.metadata.type !== 'project' && getPartOfLinks(capsule).length === 0,
  ).length;

  return { realChanged, realOrphans };
}

async function curateDreamBranch(dryRun: boolean): Promise<{ dreamChanged: number; dreamExplicitFiles: number }> {
  if (!(await readBranchManifest('dream')) && !dryRun) {
    await createBranch({
      newBranchName: 'dream',
      sourceBranch: 'real',
      scopeType: 'vault',
      recursive: true,
    });
  }

  const resolvedParentMap = buildResolvedParentMap(await loadRealCapsules());
  const dreamGraph = dryRun ? await loadOverlayGraph('real') : await loadOverlayGraph('dream');
  const dreamIds = new Set(dreamGraph.map((capsule) => capsule.metadata.capsule_id));
  let dreamChanged = 0;

  const curatedIds = new Set([
    ...dreamGraph.map((capsule) => capsule.metadata.capsule_id),
    ...subtypeHubIds,
    ...Object.keys(namePatch),
    ...Object.keys(parentMap),
    ...Object.keys(editorialPatch),
    ...Object.keys(dreamEditorialPatch),
    ...Object.keys(metadataPatch),
    ...Object.keys(dreamMetadataPatch),
  ]);

  for (const id of [...curatedIds].sort((left, right) => left.localeCompare(right))) {
    const sourceCapsule = dryRun
      ? dreamGraph.find((capsule) => capsule.metadata.capsule_id === id) ?? null
      : await readOverlayCapsule(id, 'dream');

    if (!sourceCapsule) continue;

    const capsule = JSON.parse(JSON.stringify(sourceCapsule)) as SovereignCapsule;
    if (!applyStructuralCuration(capsule, 'dream', resolvedParentMap)) continue;

    markUpdated(capsule, new Date().toISOString());
    await validateOrThrow(capsule, dreamIds, `dream:${id}`);

    if (!dryRun) {
      await writeOverlayCapsule(capsule, 'dream');
    }
    dreamChanged += 1;
  }

  for (const id of [...dreamDraftIds].sort((left, right) => left.localeCompare(right))) {
    const sourceCapsule = dryRun
      ? dreamGraph.find((capsule) => capsule.metadata.capsule_id === id) ?? null
      : await readOverlayCapsule(id, 'dream');

    if (!sourceCapsule || sourceCapsule.metadata.status === 'draft') continue;

    const capsule = JSON.parse(JSON.stringify(sourceCapsule)) as SovereignCapsule;
    capsule.metadata.status = 'draft';
    markUpdated(capsule, new Date().toISOString());
    await validateOrThrow(capsule, dreamIds, `dream:${id}`);

    if (!dryRun) {
      await writeOverlayCapsule(capsule, 'dream');
    }
    dreamChanged += 1;
  }

  const dreamExplicitFiles = dryRun
    ? dreamIds.size
    : (await fs.readdir(CAPSULES_DIR)).filter((file) => /@dream\.json$/.test(file)).length;

  return { dreamChanged, dreamExplicitFiles };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const backupDir = await backupVault(options.dryRun);
  const { realChanged, realOrphans } = await curateRealBranch(options.dryRun);
  const { dreamChanged, dreamExplicitFiles } = await curateDreamBranch(options.dryRun);
  const realCapsuleCount = (await loadRealCapsules()).size;

  process.stdout.write(
    `${JSON.stringify(
      {
        dryRun: options.dryRun,
        backupDir,
        realChanged,
        dreamChanged,
        realCapsuleCount,
        realOrphans,
        dreamExplicitFiles,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Vault curation failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
