export interface QueueTask {
  id: string;
  priority: string;
  executionBand: string;
  ownerLane: string;
  status: string;
  goal: string;
  surface: string;
}

export interface TaskPacket {
  id: string;
  title: string;
  file: string;
  priority?: string;
  executionBand?: string;
  status?: string;
  ownerLane?: string;
  cluster?: string;
  goal: string;
  whyNow?: string;
  scope: string[];
  nonGoals: string[];
  deliverables: string[];
  contextSnapshot: string[];
  dependencies: string[];
  sourceSignals: string[];
  entryChecklist: string[];
  implementationPlan: string[];
  primaryMode?: string;
  optionalSkill?: string;
  systemPromptSlice?: string;
  operatorCommandPack: string[];
  acceptanceCriteria: string[];
  verification: string[];
  evidenceArtifacts: string[];
  risks: string[];
  stopConditions: string[];
  queueUpdateRule: string[];
  handoffNote?: string;
}

export interface RepoStateSnapshot {
  branch: string | null;
  dirty: boolean;
  modifiedCount: number;
  untrackedCount: number;
  sample: string[];
}

export interface AutomatedUpdateIteration {
  iterationId: string;
  createdAt: string;
  workflow: "n1_automated_update";
  mode: string;
  selectedTask: {
    id: string;
    title: string;
    file: string;
    priority?: string;
    executionBand?: string;
    ownerLane?: string;
    status?: string;
    goal: string;
  } | null;
  launchPacket: {
    instructionStack: string[];
    dependencies: string[];
    sourceSignals: string[];
    entryChecklist: string[];
    implementationPlan: string[];
    operatorCommandPack: string[];
    acceptanceCriteria: string[];
    verification: string[];
    evidenceArtifacts: string[];
    stopConditions: string[];
    queueUpdateRule: string[];
    systemPromptSlice?: string;
    optionalSkill?: string;
  };
  microUpdate: {
    kind: "launch_packet_refresh" | "queue_heartbeat";
    summary: string;
    teamworkLatestPath: string;
    teamworkHistoryPath: string;
    reportPath: string;
  };
  repoState: RepoStateSnapshot;
  nextAction: string;
  notes: string[];
}

export interface AutomatedUpdateResult {
  iteration: AutomatedUpdateIteration;
  latestPath: string;
  historyPath: string;
  reportPath: string;
  repoSync: {
    latestPath: string;
    historyPath: string;
    reportPath: string;
  };
  orchestration: {
    latestPath: string;
    historyPath: string;
    reportPath: string;
  };
}

export interface RunAutomatedUpdateOptions {
  rootDir: string;
  taskId?: string;
  dryRun?: boolean;
  now?: Date;
  repoStateProvider?: (rootDir: string) => RepoStateSnapshot;
}

export interface ScheduledIterationExecutionSnapshot {
  status: "EXECUTED" | "SKIPPED_NOT_DUE";
  reason: string;
  selectedTaskId: string | null;
  automatedUpdateIterationId: string | null;
  automatedUpdateLatestPath: string | null;
  automatedUpdateReportPath: string | null;
  repoSyncLatestPath: string | null;
  orchestrationLatestPath: string | null;
}

export interface N1ScheduledIterationSnapshot {
  scheduleId: string;
  createdAt: string;
  workflow: "n1_scheduled_iteration";
  intervalMinutes: number;
  due: boolean;
  force: boolean;
  previousRunAt: string | null;
  nextEligibleAt: string;
  command: string;
  execution: ScheduledIterationExecutionSnapshot;
}

export interface ScheduledIterationResult {
  snapshot: N1ScheduledIterationSnapshot;
  latestPath: string;
  historyPath: string;
  statePath: string;
  reportPath: string;
}

export interface RunScheduledIterationOptions {
  rootDir: string;
  intervalMinutes: number;
  taskId?: string;
  dryRun?: boolean;
  force?: boolean;
  now?: Date;
  repoStateProvider?: (rootDir: string) => RepoStateSnapshot;
}

export interface SkillScaffoldResult {
  name: string;
  slug: string;
  skillFilePath: string;
  created: boolean;
  overwritten: boolean;
}

export interface InstructionSurfaceSnapshot {
  path: string;
  exists: boolean;
  lineCount: number;
}

export interface QueueFrontierSnapshot {
  id: string;
  priority: string;
  executionBand: string;
  ownerLane: string;
  status: string;
  goal: string;
}

export interface CapsuleVaultSnapshot {
  total: number;
  realCount: number;
  dreamCount: number;
}

export interface A2CRuntimeSnapshot {
  indexPresent: boolean;
  nodeCount: number;
  edgeCount: number;
  generatedAt: string | null;
  tasksCount: number;
  reportCount: number;
  pipelinePresent: boolean;
  intakeDropzonePresent: boolean;
}

export interface TeamworkStateSnapshot {
  latestPresent: boolean;
  latestIterationId: string | null;
  latestTaskId: string | null;
}

export interface ProjectSyncSnapshot {
  syncId: string;
  createdAt: string;
  workflow: "n1_repo_sync";
  repoState: RepoStateSnapshot;
  instructionSurfaces: InstructionSurfaceSnapshot[];
  queueFrontier: QueueFrontierSnapshot[];
  capsuleVault: CapsuleVaultSnapshot;
  a2c: A2CRuntimeSnapshot;
  teamwork: TeamworkStateSnapshot;
  neuralPacket: {
    loadOrder: string[];
    activeFrontier: string[];
    nextSuggestedAction: string;
    notes: string[];
  };
}

export interface ProjectSyncResult {
  snapshot: ProjectSyncSnapshot;
  latestPath: string;
  historyPath: string;
  reportPath: string;
}

export interface RunProjectSyncOptions {
  rootDir: string;
  dryRun?: boolean;
  now?: Date;
  repoStateProvider?: (rootDir: string) => RepoStateSnapshot;
}

export interface WorkflowContractSummary {
  kind: string;
  workspaceRoot: string | null;
  maxConcurrentAgents: number | null;
  mode: string | null;
  nightWindow: string | null;
}

export interface VaultStewardRuntimeSnapshot {
  runtimePresent: boolean;
  status: string | null;
  latestRunId: string | null;
  provider: string | null;
  summary: string | null;
}

export interface OrchestrationLaneSnapshot {
  laneId: string;
  label: string;
  status: "ready" | "degraded" | "blocked";
  reason: string;
  surfaces: string[];
  nextAction: string;
}

export interface N1InputRoutingRule {
  routeId: string;
  operatorShape: string;
  primaryMode: string;
  defaultSkill: string;
  handoffTarget: string;
  outcome: string;
}

export interface N1OrchestrationSnapshot {
  orchestrationId: string;
  createdAt: string;
  workflow: "n1_orchestration";
  repoState: RepoStateSnapshot;
  queueFrontier: QueueFrontierSnapshot[];
  repoSyncId: string | null;
  runtimeSignals: {
    a2c: A2CRuntimeSnapshot;
    vaultSteward: VaultStewardRuntimeSnapshot;
  };
  workflows: {
    symphony: WorkflowContractSummary | null;
    ninfinity: WorkflowContractSummary | null;
  };
  lanes: OrchestrationLaneSnapshot[];
  conductorDecision: {
    primaryLane: string;
    secondaryLanes: string[];
    rationale: string[];
  };
  routingModel: {
    decisionRule: string;
    routes: N1InputRoutingRule[];
    deferConditions: string[];
  };
  neuralOrchestraPacket: {
    loadOrder: string[];
    batonOrder: string[];
    nextCommandPack: string[];
    notes: string[];
  };
}

export interface N1OrchestrationResult {
  snapshot: N1OrchestrationSnapshot;
  latestPath: string;
  historyPath: string;
  reportPath: string;
}

export interface RunN1OrchestrationOptions {
  rootDir: string;
  dryRun?: boolean;
  now?: Date;
  repoStateProvider?: (rootDir: string) => RepoStateSnapshot;
}
