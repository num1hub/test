export interface IssueBlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number | null;
  state: string;
  branch_name: string | null;
  url: string | null;
  labels: string[];
  blocked_by: IssueBlockerRef[];
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkflowDefinition {
  config: Record<string, unknown>;
  prompt_template: string;
}

export interface WorkspaceInfo {
  path: string;
  workspace_key: string;
  created_now: boolean;
}

export interface RunAttempt {
  issue_id: string;
  issue_identifier: string;
  attempt: number | null;
  workspace_path: string;
  started_at: string;
  status: string;
  error?: string;
}

export interface LiveSession {
  session_id: string | null;
  thread_id: string | null;
  turn_id: string | null;
  codex_app_server_pid: string | null;
  last_codex_event: string | null;
  last_codex_timestamp: string | null;
  last_codex_message: string | null;
  codex_input_tokens: number;
  codex_output_tokens: number;
  codex_total_tokens: number;
  last_reported_input_tokens: number;
  last_reported_output_tokens: number;
  last_reported_total_tokens: number;
  turn_count: number;
}

export interface RetryEntry {
  issue_id: string;
  identifier: string;
  attempt: number;
  due_at_ms: number;
  timer_handle: NodeJS.Timeout | null;
  error: string | null;
}

export interface CodexTotals {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  seconds_running: number;
}

export interface RunningEntry extends LiveSession {
  issue: Issue;
  issue_id: string;
  identifier: string;
  worker: Promise<void> | null;
  stop: (() => Promise<void>) | null;
  retry_attempt: number | null;
  started_at: string;
  workspace_path: string;
  last_error: string | null;
  stop_requested: boolean;
  release_on_exit: boolean;
  cleanup_on_exit: boolean;
  desired_retry_attempt: number | null;
  desired_retry_error: string | null;
}

export interface OrchestratorRuntimeState {
  poll_interval_ms: number;
  max_concurrent_agents: number;
  running: Map<string, RunningEntry>;
  claimed: Set<string>;
  retry_attempts: Map<string, RetryEntry>;
  completed: Set<string>;
  codex_totals: CodexTotals;
  codex_rate_limits: unknown;
}

export interface WorkflowWatcher {
  close(): Promise<void>;
}

export interface TrackerFetchError extends Error {
  code?: string;
  cause?: unknown;
}

export interface TrackerClient {
  fetchCandidateIssues(): Promise<Issue[]>;
  fetchIssuesByStates(states: string[]): Promise<Issue[]>;
  fetchIssueStatesByIds(ids: string[]): Promise<Issue[]>;
  reportRunResult?(issue: Issue, result: AgentRunResult): Promise<void>;
}

export interface LoggingFields {
  issue_id?: string;
  issue_identifier?: string;
  session_id?: string;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  log(level: LogLevel, message: string, fields?: LoggingFields): void;
  debug(message: string, fields?: LoggingFields): void;
  info(message: string, fields?: LoggingFields): void;
  warn(message: string, fields?: LoggingFields): void;
  error(message: string, fields?: LoggingFields): void;
}

export interface SymphonyConfig {
  workflow_path: string;
  tracker: {
    kind: string;
    endpoint: string;
    api_key: string | null;
    project_slug: string | null;
    active_states: string[];
    terminal_states: string[];
    branch: string | null;
    agent_capsules: string[];
    mode: 'continuous' | 'nightly';
    night_start_hour: number;
    night_end_hour: number;
    timezone: string | null;
    cooldown_hours: number;
  };
  polling: {
    interval_ms: number;
  };
  workspace: {
    root: string;
  };
  hooks: {
    after_create: string | null;
    before_run: string | null;
    after_run: string | null;
    before_remove: string | null;
    timeout_ms: number;
  };
  agent: {
    max_concurrent_agents: number;
    max_turns: number;
    max_retry_backoff_ms: number;
    max_concurrent_agents_by_state: Record<string, number>;
    continue_after_success: boolean;
  };
  codex: {
    command: string;
    approval_policy: unknown;
    thread_sandbox: unknown;
    turn_sandbox_policy: unknown;
    turn_timeout_ms: number;
    read_timeout_ms: number;
    stall_timeout_ms: number;
  };
  server: {
    port: number | null;
  };
}

export interface WorkflowRuntime {
  definition: WorkflowDefinition;
  config: SymphonyConfig;
}

export interface ValidationError {
  code: string;
  message: string;
}

export interface SessionStartedEvent {
  event: 'session_started';
  timestamp: string;
  thread_id: string;
  turn_id: string;
  session_id: string;
  codex_app_server_pid: string | null;
}

export interface SessionUpdateEvent {
  event:
    | 'startup_failed'
    | 'turn_started'
    | 'turn_completed'
    | 'turn_failed'
    | 'turn_cancelled'
    | 'turn_input_required'
    | 'approval_auto_approved'
    | 'unsupported_tool_call'
    | 'notification'
    | 'other_message'
    | 'malformed';
  timestamp: string;
  codex_app_server_pid: string | null;
  session_id?: string | null;
  thread_id?: string | null;
  turn_id?: string | null;
  message?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  rate_limits?: unknown;
  raw?: unknown;
}

export type AgentEvent = SessionStartedEvent | SessionUpdateEvent;

export interface AgentRunResult {
  success: boolean;
  reason: 'completed' | 'failed' | 'cancelled' | 'timeout' | 'stalled';
  error: string | null;
  turn_count: number;
}

export interface RuntimeSnapshotRow {
  issue_id: string;
  issue_identifier: string;
  state: string;
  session_id: string | null;
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  started_at: string;
  last_event_at: string | null;
  tokens: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface RuntimeSnapshot {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: RuntimeSnapshotRow[];
  retrying: Array<{
    issue_id: string;
    issue_identifier: string;
    attempt: number;
    due_at: string;
    error: string | null;
  }>;
  codex_totals: CodexTotals;
  rate_limits: unknown;
}
