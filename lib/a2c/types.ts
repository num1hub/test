import type { ConfidenceVectorInput, CapsuleRoot } from '@/lib/validator/types';

export type A2CDialect = 'repo_native' | 'legacy_recursive';

export interface RuntimeLayoutConfig {
  mode: 'n1hub_repo' | 'unknown';
  kbRoot: string;
  vaultDir: string;
  indexPath: string;
  reportsDir: string;
  tasksDir: string;
  pipelineRoot: string;
  pipelineQuarantineDir: string;
  pipelineWorkspaceDir: string;
  pipelineFailedDir: string;
  runManifestsDir: string;
  queueLedgerPath: string;
  packetCandidatesDir: string;
  defaultPlanPath: string;
  defaultConflictReviewPath: string;
  defaultMergePlanPath: string;
  intakeDropzoneDir: string;
  intakeArchiveRawDir: string;
  intakeNormalizedDir: string;
  daemonPidPath: string;
  cronStatePath: string;
  cronLogPath: string;
  cronRunLockPath: string;
  autonomousRunLockPath: string;
  autonomousRunHistoryPath: string;
}

export type CanonicalNode = {
  id: string;
  file: string;
  type: string;
  status: string;
  title: string;
  summary: string;
  keywords: string[];
  entities: string[];
  tags: string[];
  updated_at: string;
  confidence_vector: Record<string, number>;
};

export type CanonicalEdge = {
  source: string;
  target: string;
  relation: string;
};

export type A2CIndexPayload = {
  graph: {
    project: string;
    version: string;
    generated_at: string;
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
    metrics: {
      total_nodes: number;
      total_edges: number;
      graph_density: number;
      average_system_confidence: number;
    };
  };
};

export interface QueryNodeRow {
  id?: string;
  capsule_id?: string;
  status?: string;
  type?: string;
  file?: string;
  title?: string;
  summary?: string;
  keywords?: string[];
  entities?: string[];
  tags?: string[];
  updated_at?: string;
  confidence_vector?: ConfidenceVectorInput;
}

export type A2CCommandReport = {
  skill_id: string;
  module: string;
  timestamp: string;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED' | 'INSUFFICIENT_CONTEXT';
  scope: Record<string, unknown>;
  metrics: Record<string, number | string | boolean | null>;
  results: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  metadata: {
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    human_review_required: boolean;
    self_corrections: number;
  };
};

export interface IngestDraft {
  draftPath: string;
  draftId: string;
  source: string;
  stagedAt: string;
  sourceHash: string;
  attempt: number;
}

export interface IngestAttempt {
  inputPath: string;
  draft: IngestDraft;
  normalizedText: string;
  capsule?: CapsuleRoot;
  status: 'staged' | 'ingested' | 'quarantined' | 'rejected';
  warnings: string[];
  errors: string[];
}

export type A2CRouteClassHint =
  | 'assistant_synthesis'
  | 'queue_execution'
  | 'orchestrate_or_sync'
  | 'capsule_projection'
  | 'defer_for_clarity';

export type A2CPriorityHint = 'P0' | 'P1' | 'P2';
export type A2CExecutionBandHint = 'NOW' | 'NEXT' | 'LATER';

export interface A2COperatorInputSource {
  channel: 'api' | 'chat' | 'cli' | 'unknown';
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface A2COperatorInputEnvelope {
  text: string;
  source?: Partial<A2COperatorInputSource>;
}

export interface A2COperatorInputNormalized {
  objective: string;
  route_class_hint: A2CRouteClassHint;
  scope_hints: string[];
  file_hints: string[];
  task_refs: string[];
  priority_hint: A2CPriorityHint | null;
  execution_band_hint: A2CExecutionBandHint | null;
  owner_lane_hints: string[];
  acceptance_criteria_hints: string[];
  verification_hints: string[];
  stop_condition_hints: string[];
}

export interface A2COperatorInputArtifact {
  intake_id: string;
  received_at: string;
  source: A2COperatorInputSource;
  raw_path: string;
  normalized_path: string;
  raw_text: string;
  normalized: A2COperatorInputNormalized;
}

export interface A2COperatorInputNormalizedArtifactRecord {
  intake_id: string;
  received_at: string;
  source: A2COperatorInputSource;
  normalized: A2COperatorInputNormalized;
}

export interface A2CTaskPacketDraft {
  intake_id: string;
  packet_id: string;
  title: string;
  priority: A2CPriorityHint;
  execution_band: A2CExecutionBandHint;
  owner_lane: string;
  status: 'READY' | 'DEFERRED';
  defer_reason?: string;
  markdown: string;
  scope: string[];
  verification: string[];
  acceptance_criteria: string[];
  stop_conditions: string[];
}

export interface A2CTaskPacketArtifact extends A2CTaskPacketDraft {
  source_normalized_path: string;
  json_path: string;
  markdown_path: string;
}
