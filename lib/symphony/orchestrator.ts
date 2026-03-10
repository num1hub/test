import { validateDispatchConfig } from './config';
import { StructuredLogger } from './logger';
import {
  buildInitialState,
  buildIssueDetails,
  buildRuntimeSnapshot,
  issueFields,
  nextAttempt,
} from './orchestrator-state';
import { runAgentAttempt } from './runner';
import { createTrackerClient, isTerminalBlocker } from './tracker';
import type {
  AgentEvent,
  AgentRunResult,
  Issue,
  Logger,
  OrchestratorRuntimeState,
  RunningEntry,
  RuntimeSnapshot,
  TrackerClient,
  WorkflowRuntime,
} from './types';
import { isoNow, monotonicNowMs, normalizeIssueState } from './utils';
import { WorkspaceManager } from './workspace';

export class SymphonyOrchestrator {
  private runtime: WorkflowRuntime;
  private tracker: TrackerClient;
  private workspaceManager: WorkspaceManager;
  private state: OrchestratorRuntimeState;
  private tickTimer: NodeJS.Timeout | null = null;
  private tickInProgress = false;
  private refreshQueued = false;
  private stopped = false;

  constructor(
    runtime: WorkflowRuntime,
    private readonly logger: Logger = new StructuredLogger(),
  ) {
    this.runtime = runtime;
    this.tracker = createTrackerClient(runtime.config, logger);
    this.workspaceManager = new WorkspaceManager(runtime.config, logger);
    this.state = buildInitialState(runtime);
  }

  async start(): Promise<void> {
    const errors = validateDispatchConfig(this.runtime);
    if (errors.length > 0) {
      throw new Error(errors.map((entry) => `${entry.code}: ${entry.message}`).join('; '));
    }

    await this.startupTerminalWorkspaceCleanup();
    this.scheduleTick(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.tickTimer) clearTimeout(this.tickTimer);

    for (const retry of this.state.retry_attempts.values()) {
      if (retry.timer_handle) clearTimeout(retry.timer_handle);
    }
    this.state.retry_attempts.clear();

    await Promise.all(
      [...this.state.running.values()].map(async (entry) => {
        entry.release_on_exit = true;
        await entry.stop?.().catch(() => undefined);
      }),
    );
  }

  applyRuntime(runtime: WorkflowRuntime): void {
    this.runtime = runtime;
    this.tracker = createTrackerClient(runtime.config, this.logger);
    this.workspaceManager = new WorkspaceManager(runtime.config, this.logger);
    this.state.poll_interval_ms = runtime.config.polling.interval_ms;
    this.state.max_concurrent_agents = runtime.config.agent.max_concurrent_agents;
  }

  requestRefresh(): { queued: boolean; coalesced: boolean; requested_at: string; operations: string[] } {
    const coalesced = this.tickInProgress;
    if (this.tickInProgress) {
      this.refreshQueued = true;
    } else {
      this.scheduleTick(0);
    }

    return {
      queued: true,
      coalesced,
      requested_at: isoNow(),
      operations: ['poll', 'reconcile'],
    };
  }

  getSnapshot(): RuntimeSnapshot {
    return buildRuntimeSnapshot(this.state);
  }

  getIssueDetails(identifier: string): Record<string, unknown> | null {
    return buildIssueDetails(this.state, identifier);
  }

  private scheduleTick(delayMs: number): void {
    if (this.stopped) return;
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = setTimeout(() => {
      void this.runTick();
    }, Math.max(delayMs, 0));
  }

  private async runTick(): Promise<void> {
    if (this.tickInProgress || this.stopped) {
      this.refreshQueued = true;
      return;
    }

    this.tickInProgress = true;
    try {
      await this.reconcileRunningIssues();

      const errors = validateDispatchConfig(this.runtime);
      if (errors.length > 0) {
        errors.forEach((error) =>
          this.logger.error('dispatch_validation_failed', {
            code: error.code,
            error_message: error.message,
          }),
        );
        return;
      }

      const issues = await this.tracker.fetchCandidateIssues().catch((error: unknown) => {
        this.logger.warn('candidate_fetch_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
      if (!issues) return;

      for (const issue of this.sortForDispatch(issues)) {
        if (this.availableGlobalSlots() <= 0) break;
        if (!this.isDispatchEligible(issue)) continue;
        this.dispatchIssue(issue, null, false);
      }
    } finally {
      this.tickInProgress = false;
      if (this.refreshQueued) {
        this.refreshQueued = false;
        this.scheduleTick(0);
      } else {
        this.scheduleTick(this.state.poll_interval_ms);
      }
    }
  }

  private async startupTerminalWorkspaceCleanup(): Promise<void> {
    const issues = await this.tracker
      .fetchIssuesByStates(this.runtime.config.tracker.terminal_states)
      .catch((error: unknown) => {
        this.logger.warn('startup_terminal_cleanup_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
    if (!issues) return;

    await Promise.all(
      issues.map((issue) =>
        this.workspaceManager.removeWorkspace(issue.identifier, issue).catch((error: unknown) => {
          this.logger.warn('workspace_cleanup_failed', {
            ...issueFields(issue),
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      ),
    );
  }

  private async reconcileRunningIssues(): Promise<void> {
    if (this.runtime.config.codex.stall_timeout_ms > 0) {
      const stallLimit = this.runtime.config.codex.stall_timeout_ms;
      for (const entry of this.state.running.values()) {
        const reference = entry.last_codex_timestamp ?? entry.started_at;
        const elapsedMs = Date.now() - new Date(reference).valueOf();
        if (elapsedMs > stallLimit) {
          this.logger.warn('stall_detected', {
            ...issueFields(entry.issue),
            elapsed_ms: elapsedMs,
          });
          this.requestStop(entry.issue_id, {
            releaseOnExit: false,
            cleanupOnExit: false,
            retryAttempt: nextAttempt(entry.retry_attempt),
            retryError: 'stalled session',
          });
        }
      }
    }

    if (this.state.running.size === 0) return;

    const refreshed = await this.tracker
      .fetchIssueStatesByIds([...this.state.running.keys()])
      .catch((error: unknown) => {
        this.logger.warn('running_state_refresh_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
    if (!refreshed) return;

    const refreshedById = new Map(refreshed.map((issue) => [issue.id, issue]));
    for (const entry of this.state.running.values()) {
      const issue = refreshedById.get(entry.issue_id);
      if (!issue) continue;

      if (this.isTerminalState(issue.state)) {
        this.requestStop(issue.id, {
          releaseOnExit: true,
          cleanupOnExit: true,
          retryAttempt: null,
          retryError: null,
        });
        continue;
      }

      if (this.isActiveState(issue.state)) {
        entry.issue = issue;
        continue;
      }

      this.requestStop(issue.id, {
        releaseOnExit: true,
        cleanupOnExit: false,
        retryAttempt: null,
        retryError: null,
      });
    }
  }

  private isDispatchEligible(issue: Issue, ignoreExistingClaim = false): boolean {
    if (!issue.id || !issue.identifier || !issue.title || !issue.state) return false;
    if (!this.isActiveState(issue.state) || this.isTerminalState(issue.state)) return false;
    if (this.runtime.config.tracker.kind === 'capsule_graph' && this.state.completed.has(issue.id)) return false;
    if (this.state.running.has(issue.id)) return false;
    if (!ignoreExistingClaim && this.state.claimed.has(issue.id)) return false;
    if (this.availableGlobalSlots() <= 0) return false;
    if (this.availableStateSlots(issue.state) <= 0) return false;

    if (normalizeIssueState(issue.state) === 'todo') {
      const blocked = issue.blocked_by.some(
        (blocker) => !isTerminalBlocker(blocker, this.runtime.config.tracker.terminal_states),
      );
      if (blocked) return false;
    }

    return true;
  }

  private sortForDispatch(issues: Issue[]): Issue[] {
    return [...issues].sort((left, right) => {
      const leftPriority = left.priority ?? Number.POSITIVE_INFINITY;
      const rightPriority = right.priority ?? Number.POSITIVE_INFINITY;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      const leftCreated = left.created_at ? new Date(left.created_at).valueOf() : Number.POSITIVE_INFINITY;
      const rightCreated = right.created_at ? new Date(right.created_at).valueOf() : Number.POSITIVE_INFINITY;
      if (leftCreated !== rightCreated) return leftCreated - rightCreated;

      return left.identifier.localeCompare(right.identifier);
    });
  }

  private availableGlobalSlots(): number {
    return Math.max(this.state.max_concurrent_agents - this.state.running.size, 0);
  }

  private availableStateSlots(state: string): number {
    const normalized = normalizeIssueState(state);
    const limit =
      this.runtime.config.agent.max_concurrent_agents_by_state[normalized] ??
      this.state.max_concurrent_agents;
    const used = [...this.state.running.values()].filter(
      (entry) => normalizeIssueState(entry.issue.state) === normalized,
    ).length;
    return Math.max(limit - used, 0);
  }

  private dispatchIssue(issue: Issue, attempt: number | null, alreadyClaimed: boolean): void {
    if (!alreadyClaimed) {
      this.state.claimed.add(issue.id);
    }

    const abortController = new AbortController();
    const entry: RunningEntry = {
      issue,
      issue_id: issue.id,
      identifier: issue.identifier,
      worker: null,
      stop: async () => {
        abortController.abort();
      },
      retry_attempt: attempt,
      started_at: isoNow(),
      workspace_path: this.workspaceManager.getWorkspacePath(issue.identifier),
      last_error: null,
      session_id: null,
      thread_id: null,
      turn_id: null,
      codex_app_server_pid: null,
      last_codex_event: null,
      last_codex_timestamp: null,
      last_codex_message: null,
      codex_input_tokens: 0,
      codex_output_tokens: 0,
      codex_total_tokens: 0,
      last_reported_input_tokens: 0,
      last_reported_output_tokens: 0,
      last_reported_total_tokens: 0,
      turn_count: 0,
      stop_requested: false,
      release_on_exit: false,
      cleanup_on_exit: false,
      desired_retry_attempt: null,
      desired_retry_error: null,
    };

    this.state.retry_attempts.delete(issue.id);
    this.state.running.set(issue.id, entry);

    entry.worker = this.executeWorker(entry, abortController.signal, attempt);
  }

  private async executeWorker(
    entry: RunningEntry,
    signal: AbortSignal,
    attempt: number | null,
  ): Promise<void> {
    const result = await runAgentAttempt({
      issue: entry.issue,
      attempt,
      runtime: {
        config: this.runtime.config,
        promptTemplate: this.runtime.definition.prompt_template,
      },
      tracker: this.tracker,
      workspaceManager: this.workspaceManager,
      logger: this.logger,
      onEvent: (event) => this.handleAgentEvent(entry.issue_id, event),
      signal,
    });
    await this.onWorkerExit(entry.issue_id, result);
  }

  private async onWorkerExit(issueId: string, result: AgentRunResult): Promise<void> {
    const entry = this.state.running.get(issueId);
    if (!entry) return;

    this.state.running.delete(issueId);
    this.addRuntimeTotals(entry);
    await this.tracker.reportRunResult?.(entry.issue, result).catch((error: unknown) => {
      this.logger.warn('tracker_run_result_report_failed', {
        ...issueFields(entry.issue),
        error: error instanceof Error ? error.message : String(error),
      });
    });

    if (entry.cleanup_on_exit) {
      await this.workspaceManager.removeWorkspace(entry.identifier, entry.issue).catch((error: unknown) => {
        this.logger.warn('workspace_cleanup_failed', {
          ...issueFields(entry.issue),
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    if (entry.release_on_exit) {
      this.state.claimed.delete(issueId);
      return;
    }

    if (entry.desired_retry_attempt !== null) {
      this.scheduleRetry(issueId, entry.desired_retry_attempt, {
        identifier: entry.identifier,
        error: entry.desired_retry_error,
        continuation: false,
      });
      return;
    }

    if (result.success) {
      this.state.completed.add(issueId);
      if (this.runtime.config.agent.continue_after_success) {
        this.scheduleRetry(issueId, 1, {
          identifier: entry.identifier,
          error: null,
          continuation: true,
        });
      } else {
        this.state.claimed.delete(issueId);
      }
      return;
    }

    this.scheduleRetry(issueId, nextAttempt(entry.retry_attempt), {
      identifier: entry.identifier,
      error: result.error ?? `worker exited: ${result.reason}`,
      continuation: false,
    });
  }

  private scheduleRetry(
    issueId: string,
    attempt: number,
    options: { identifier: string; error: string | null; continuation: boolean },
  ): void {
    const existing = this.state.retry_attempts.get(issueId);
    if (existing?.timer_handle) {
      clearTimeout(existing.timer_handle);
    }

    const delay = options.continuation
      ? 1_000
      : Math.min(
          10_000 * 2 ** Math.max(attempt - 1, 0),
          this.runtime.config.agent.max_retry_backoff_ms,
        );
    const dueAtMs = monotonicNowMs() + delay;

    const timer = setTimeout(() => {
      void this.handleRetryTimer(issueId);
    }, delay);

    const entry = {
      issue_id: issueId,
      identifier: options.identifier,
      attempt,
      due_at_ms: dueAtMs,
      timer_handle: timer,
      error: options.error,
    };

    this.state.claimed.add(issueId);
    this.state.retry_attempts.set(issueId, entry);
  }

  private async handleRetryTimer(issueId: string): Promise<void> {
    const retry = this.state.retry_attempts.get(issueId);
    if (!retry) return;
    this.state.retry_attempts.delete(issueId);

    const issues = await this.tracker.fetchCandidateIssues().catch((error: unknown) => {
      this.logger.warn('retry_fetch_failed', {
        issue_id: issueId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
    if (!issues) {
      this.scheduleRetry(issueId, retry.attempt + 1, {
        identifier: retry.identifier,
        error: 'retry poll failed',
        continuation: false,
      });
      return;
    }

    const issue = issues.find((candidate) => candidate.id === issueId);
    if (!issue) {
      this.state.claimed.delete(issueId);
      return;
    }

    if (!this.isDispatchEligible(issue, true)) {
      if (!this.isActiveState(issue.state) || this.isTerminalState(issue.state)) {
        this.state.claimed.delete(issueId);
        return;
      }

      this.scheduleRetry(issueId, retry.attempt + 1, {
        identifier: issue.identifier,
        error: 'no available orchestrator slots',
        continuation: false,
      });
      return;
    }

    this.dispatchIssue(issue, retry.attempt, true);
  }

  private requestStop(
    issueId: string,
    options: {
      releaseOnExit: boolean;
      cleanupOnExit: boolean;
      retryAttempt: number | null;
      retryError: string | null;
    },
  ): void {
    const entry = this.state.running.get(issueId);
    if (!entry) return;

    entry.release_on_exit = options.releaseOnExit;
    entry.cleanup_on_exit = options.cleanupOnExit;
    entry.desired_retry_attempt = options.retryAttempt;
    entry.desired_retry_error = options.retryError;

    if (entry.stop_requested) return;
    entry.stop_requested = true;
    void entry.stop?.();
  }

  private handleAgentEvent(issueId: string, event: AgentEvent): void {
    const entry = this.state.running.get(issueId);
    if (!entry) return;

    entry.last_codex_event = event.event;
    entry.last_codex_timestamp = event.timestamp;
    if ('message' in event && event.message !== undefined) {
      entry.last_codex_message = event.message;
    }

    if (event.event === 'session_started') {
      entry.session_id = event.session_id;
      entry.thread_id = event.thread_id;
      entry.turn_id = event.turn_id;
      entry.codex_app_server_pid = event.codex_app_server_pid;
      entry.turn_count += 1;
    } else {
      entry.codex_app_server_pid = event.codex_app_server_pid;
      if ('thread_id' in event && event.thread_id !== undefined) {
        entry.thread_id = event.thread_id ?? null;
      }
      if ('turn_id' in event && event.turn_id !== undefined) {
        entry.turn_id = event.turn_id ?? null;
      }
    }

    if ('usage' in event && event.usage) {
      const nextInput = event.usage.input_tokens ?? entry.last_reported_input_tokens;
      const nextOutput = event.usage.output_tokens ?? entry.last_reported_output_tokens;
      const nextTotal =
        event.usage.total_tokens ?? (Number.isFinite(nextInput + nextOutput) ? nextInput + nextOutput : entry.last_reported_total_tokens);

      const inputDelta = Math.max(nextInput - entry.last_reported_input_tokens, 0);
      const outputDelta = Math.max(nextOutput - entry.last_reported_output_tokens, 0);
      const totalDelta = Math.max(nextTotal - entry.last_reported_total_tokens, 0);

      entry.codex_input_tokens = nextInput;
      entry.codex_output_tokens = nextOutput;
      entry.codex_total_tokens = nextTotal;
      entry.last_reported_input_tokens = nextInput;
      entry.last_reported_output_tokens = nextOutput;
      entry.last_reported_total_tokens = nextTotal;

      this.state.codex_totals.input_tokens += inputDelta;
      this.state.codex_totals.output_tokens += outputDelta;
      this.state.codex_totals.total_tokens += totalDelta;
    }

    if ('rate_limits' in event && event.rate_limits !== undefined) {
      this.state.codex_rate_limits = event.rate_limits;
    }
  }

  private addRuntimeTotals(entry: RunningEntry): void {
    const seconds = Math.max((Date.now() - new Date(entry.started_at).valueOf()) / 1000, 0);
    this.state.codex_totals.seconds_running += seconds;
  }

  private isActiveState(state: string): boolean {
    return this.runtime.config.tracker.active_states
      .map(normalizeIssueState)
      .includes(normalizeIssueState(state));
  }

  private isTerminalState(state: string): boolean {
    return this.runtime.config.tracker.terminal_states
      .map(normalizeIssueState)
      .includes(normalizeIssueState(state));
  }
}
