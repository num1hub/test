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
  defaultPlanPath: string;
  defaultConflictReviewPath: string;
  defaultMergePlanPath: string;
  intakeDropzoneDir: string;
  intakeArchiveRawDir: string;
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
