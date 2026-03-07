import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import type { AgentEvent, Logger, SymphonyConfig } from './types';
import { isoNow } from './utils';

interface JsonRpcRequest {
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  id: number | string;
  result?: Record<string, unknown>;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

interface PendingRequest {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface TurnCompletion {
  success: boolean;
  status: string;
  message: string | null;
}

interface ActiveTurn {
  turnId: string;
  resolve: (value: TurnCompletion) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  title: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractString(value: unknown, ...path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    current = asRecord(current)?.[key];
  }
  return typeof current === 'string' && current.trim() ? current.trim() : null;
}

function findUsage(value: unknown): { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined {
  const candidates = [
    asRecord(value),
    asRecord(asRecord(value)?.usage),
    asRecord(asRecord(value)?.total_token_usage),
    asRecord(asRecord(value)?.totalTokenUsage),
    asRecord(asRecord(value)?.tokenUsage),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  for (const candidate of candidates) {
    const input = candidate.input_tokens ?? candidate.inputTokens;
    const output = candidate.output_tokens ?? candidate.outputTokens;
    const total = candidate.total_tokens ?? candidate.totalTokens;
    if (
      typeof input === 'number' ||
      typeof output === 'number' ||
      typeof total === 'number'
    ) {
      return {
        input_tokens: typeof input === 'number' ? input : undefined,
        output_tokens: typeof output === 'number' ? output : undefined,
        total_tokens: typeof total === 'number' ? total : undefined,
      };
    }
  }

  return undefined;
}

function createError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export class CodexAppServerClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private stdoutBuffer = '';
  private pendingRequests = new Map<number | string, PendingRequest>();
  private activeTurn: ActiveTurn | null = null;
  private threadId: string | null = null;
  private stopped = false;

  constructor(
    private readonly config: SymphonyConfig,
    private readonly logger: Logger,
    private readonly onEvent: (event: AgentEvent) => void,
    private readonly dynamicTools: Record<string, (args: unknown) => Promise<unknown>> = {},
  ) {}

  async start(cwd: string): Promise<string> {
    this.child = spawn('bash', ['-lc', this.config.codex.command], {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.setEncoding('utf-8');
    this.child.stderr.setEncoding('utf-8');
    this.child.stdout.on('data', (chunk) => this.handleStdout(String(chunk)));
    this.child.stderr.on('data', (chunk) => {
      this.logger.debug('codex_stderr', { message: String(chunk).slice(0, 2000) });
    });
    this.child.on('close', (_code, signal) => {
      const error = createError('port_exit', `Codex app-server exited signal=${signal ?? 'none'}`);
      this.failOutstanding(error);
    });
    this.child.on('error', (error) => {
      this.failOutstanding(createError('codex_not_found', error.message));
    });

    await this.sendRequest('initialize', {
      clientInfo: { name: 'symphony', version: '1.0' },
      capabilities: {
        experimentalApi: true,
      },
    });
    this.sendNotification('initialized', {});

    const threadResult = await this.sendRequest('thread/start', {
      approvalPolicy: this.config.codex.approval_policy,
      sandbox: this.config.codex.thread_sandbox,
      cwd,
    });

    const threadId = extractString(threadResult, 'thread', 'id');
    if (!threadId) {
      throw createError('response_error', 'Missing thread id in thread/start response');
    }

    this.threadId = threadId;
    return threadId;
  }

  async runTurn(options: {
    cwd: string;
    prompt: string;
    title: string;
  }): Promise<TurnCompletion> {
    if (!this.threadId) {
      throw createError('response_error', 'Session has not been started');
    }

    const turnResult = await this.sendRequest('turn/start', {
      threadId: this.threadId,
      input: [{ type: 'text', text: options.prompt }],
      cwd: options.cwd,
      title: options.title,
      approvalPolicy: this.config.codex.approval_policy,
      sandboxPolicy: this.config.codex.turn_sandbox_policy,
    });

    const turnId = extractString(turnResult, 'turn', 'id');
    if (!turnId) {
      throw createError('response_error', 'Missing turn id in turn/start response');
    }
    const initialStatus = extractString(turnResult, 'turn', 'status');

    const sessionId = `${this.threadId}-${turnId}`;
    this.onEvent({
      event: 'session_started',
      timestamp: isoNow(),
      thread_id: this.threadId,
      turn_id: turnId,
      session_id: sessionId,
      codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
    });

    if (initialStatus === 'completed') {
      return {
        success: true,
        status: initialStatus,
        message: extractString(turnResult, 'turn', 'lastAgentMessage'),
      };
    }
    if (initialStatus === 'failed' || initialStatus === 'interrupted') {
      throw createError(
        initialStatus === 'interrupted' ? 'turn_cancelled' : 'turn_failed',
        extractString(turnResult, 'turn', 'lastAgentMessage') ?? initialStatus,
      );
    }

    return new Promise<TurnCompletion>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(createError('turn_timeout', `Turn timed out after ${this.config.codex.turn_timeout_ms}ms`));
      }, this.config.codex.turn_timeout_ms);

      this.activeTurn = {
        turnId,
        resolve: (value) => {
          clearTimeout(timeout);
          this.activeTurn = null;
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.activeTurn = null;
          reject(error);
        },
        timeout,
        title: options.title,
      };
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (!this.child) return;
    this.child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.child?.kill('SIGKILL');
        resolve();
      }, 2_000);
      this.child?.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.child = null;
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const index = this.stdoutBuffer.indexOf('\n');
      if (index === -1) break;
      const line = this.stdoutBuffer.slice(0, index).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(index + 1);
      if (!line) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        this.onEvent({
          event: 'malformed',
          timestamp: isoNow(),
          codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
          message: line.slice(0, 1000),
        });
        continue;
      }

      this.handleMessage(parsed);
    }
  }

  private handleMessage(message: unknown): void {
    const record = asRecord(message);
    if (!record) {
      return;
    }

    if (record.id !== undefined && (record.result !== undefined || record.error !== undefined) && !record.method) {
      this.handleResponse(record as unknown as JsonRpcResponse);
      return;
    }

    if (record.id !== undefined && typeof record.method === 'string') {
      void this.handleServerRequest(record as unknown as JsonRpcRequest);
      return;
    }

    if (typeof record.method === 'string') {
      this.handleNotification(record.method, record.params);
      return;
    }
  }

  private handleResponse(message: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;
    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);

    if (message.error) {
      pending.reject(
        createError(
          'response_error',
          message.error.message ?? `RPC error ${message.error.code ?? 'unknown'}`,
        ),
      );
      return;
    }

    pending.resolve(asRecord(message.result) ?? {});
  }

  private handleNotification(method: string, params: unknown): void {
    const timestamp = isoNow();
    const usage = findUsage(params);

    if (method === 'turn/started') {
      this.onEvent({
        event: 'turn_started',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        thread_id: extractString(params, 'threadId') ?? this.threadId ?? undefined,
        turn_id: extractString(params, 'turn', 'id') ?? undefined,
        usage,
      });
      return;
    }

    if (method === 'turn/completed') {
      const status = extractString(params, 'turn', 'status') ?? 'failed';
      const message = extractString(params, 'turn', 'lastAgentMessage') ?? extractString(params, 'turn', 'output');

      this.onEvent({
        event:
          status === 'completed'
            ? 'turn_completed'
            : status === 'interrupted'
              ? 'turn_cancelled'
              : 'turn_failed',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        thread_id: extractString(params, 'threadId') ?? this.threadId ?? undefined,
        turn_id: extractString(params, 'turn', 'id') ?? undefined,
        message,
        usage,
        raw: params,
      });

      if (this.activeTurn) {
        const outcome: TurnCompletion = {
          success: status === 'completed',
          status,
          message,
        };
        if (status === 'completed') {
          this.activeTurn.resolve(outcome);
        } else {
          this.activeTurn.reject(createError(status === 'interrupted' ? 'turn_cancelled' : 'turn_failed', message ?? status));
        }
      }
      return;
    }

    if (method === 'turn/failed' || method === 'turn/cancelled') {
      const message = extractString(params, 'error', 'message') ?? extractString(params, 'message') ?? method;
      this.onEvent({
        event: method === 'turn/cancelled' ? 'turn_cancelled' : 'turn_failed',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        thread_id: extractString(params, 'threadId') ?? this.threadId ?? undefined,
        turn_id: extractString(params, 'turnId') ?? extractString(params, 'turn', 'id') ?? undefined,
        message,
        usage,
        raw: params,
      });
      this.activeTurn?.reject(
        createError(method === 'turn/cancelled' ? 'turn_cancelled' : 'turn_failed', message),
      );
      return;
    }

    if (method === 'thread/tokenUsage/updated') {
      this.onEvent({
        event: 'notification',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        usage,
        raw: params,
      });
      return;
    }

    if (method === 'account/rateLimits/updated') {
      this.onEvent({
        event: 'notification',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        rate_limits: asRecord(params)?.rateLimits ?? null,
        raw: params,
      });
      return;
    }

    if (method === 'item/agentMessage/delta') {
      this.onEvent({
        event: 'notification',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        thread_id: extractString(params, 'threadId') ?? this.threadId ?? undefined,
        turn_id: extractString(params, 'turnId') ?? undefined,
        message: extractString(params, 'delta'),
        raw: params,
      });
      return;
    }

    this.onEvent({
      event: 'other_message',
      timestamp,
      codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
      message: method,
      usage,
      raw: params,
    });
  }

  private async handleServerRequest(message: JsonRpcRequest): Promise<void> {
    const method = message.method;
    const timestamp = isoNow();

    if (
      method === 'item/commandExecution/requestApproval' ||
      method === 'item/fileChange/requestApproval' ||
      method === 'applyPatchApproval' ||
      method === 'execCommandApproval'
    ) {
      this.sendResponse(message.id, { approved: true });
      this.onEvent({
        event: 'approval_auto_approved',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        message: method,
      });
      return;
    }

    if (method === 'item/tool/requestUserInput' || method === 'mcpServer/elicitation/request') {
      this.sendError(message.id, 'turn_input_required');
      const error = createError('turn_input_required', `${method} requested user input`);
      this.onEvent({
        event: 'turn_input_required',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        message: method,
      });
      this.activeTurn?.reject(error);
      return;
    }

    if (method === 'item/tool/call') {
      const toolName =
        extractString(message.params, 'tool') ??
        extractString(message.params, 'toolName') ??
        extractString(message.params, 'name') ??
        extractString(message.params, 'tool', 'name');
      const input =
        asRecord(message.params)?.input ??
        asRecord(message.params)?.arguments ??
        asRecord(message.params)?.args;

      if (toolName && this.dynamicTools[toolName]) {
        try {
          const result = await this.dynamicTools[toolName](input);
          this.sendResponse(message.id, asRecord(result) ?? { success: true, data: result });
        } catch (error: unknown) {
          this.sendResponse(message.id, {
            success: false,
            error: error instanceof Error ? error.message : 'dynamic_tool_failed',
          });
        }
        return;
      }

      this.sendResponse(message.id, {
        success: false,
        error: 'unsupported_tool_call',
      });
      this.onEvent({
        event: 'unsupported_tool_call',
        timestamp,
        codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
        message: toolName ?? method,
      });
      return;
    }

    this.sendResponse(message.id, {
      success: false,
      error: 'unsupported_server_request',
    });
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    this.write({
      method,
      params,
    });
  }

  private sendResponse(id: number | string, result: Record<string, unknown>): void {
    this.write({ id, result });
  }

  private sendError(id: number | string, message: string): void {
    this.write({
      id,
      error: {
        code: -32000,
        message,
      },
    });
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(createError('response_timeout', `Timed out waiting for ${method} response`));
      }, this.config.codex.read_timeout_ms);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.write({ id, method, params });
    });
  }

  private write(message: Record<string, unknown>): void {
    if (!this.child?.stdin.writable) {
      throw createError('port_exit', 'Codex app-server stdin is not writable');
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private failOutstanding(error: Error): void {
    if (this.stopped) return;
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
    if (this.activeTurn) {
      clearTimeout(this.activeTurn.timeout);
      this.activeTurn.reject(error);
      this.activeTurn = null;
    }
    this.onEvent({
      event: 'startup_failed',
      timestamp: isoNow(),
      codex_app_server_pid: this.child?.pid ? String(this.child.pid) : null,
      message: error.message,
    });
  }
}
