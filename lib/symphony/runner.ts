import { generateTextWithAiProvider } from '@/lib/ai/providerRuntime';
import { readCapsulesFromDisk } from '@/lib/capsuleVault';
import { loadOverlayGraph } from '@/lib/diff/branch-manager';
import { CodexAppServerClient } from './agentClient';
import { buildContinuationPrompt, renderIssuePrompt } from './prompt';
import { LinearTrackerClient } from './tracker';
import type { AgentEvent, AgentRunResult, Issue, Logger, SymphonyConfig, TrackerClient } from './types';
import { normalizeIssueState } from './utils';
import { WorkspaceManager } from './workspace';

function createError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function isStateIn(state: string, candidates: string[]): boolean {
  return candidates.map(normalizeIssueState).includes(normalizeIssueState(state));
}

function parseLinearToolInput(args: unknown): { query: string; variables?: Record<string, unknown> } {
  if (typeof args === 'string' && args.trim()) {
    return { query: args.trim() };
  }

  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw createError('invalid_tool_input', 'linear_graphql input must be a string or object');
  }

  const record = args as Record<string, unknown>;
  if (typeof record.query !== 'string' || !record.query.trim()) {
    throw createError('invalid_tool_input', 'linear_graphql.query must be a non-empty string');
  }
  if (
    record.variables !== undefined &&
    (typeof record.variables !== 'object' || record.variables === null || Array.isArray(record.variables))
  ) {
    throw createError('invalid_tool_input', 'linear_graphql.variables must be an object');
  }

  const operations = [...record.query.matchAll(/\b(query|mutation|subscription)\b/g)];
  if (operations.length > 1) {
    throw createError('invalid_tool_input', 'linear_graphql accepts exactly one GraphQL operation');
  }

  return {
    query: record.query.trim(),
    variables: record.variables as Record<string, unknown> | undefined,
  };
}

function parseDeepMineToolInput(args: unknown): {
  provider?:
    | 'codex_subscription'
    | 'claude_subscription'
    | 'openai'
    | 'anthropic'
    | 'gemini'
    | 'deepseek'
    | 'grok'
    | 'openrouter'
    | 'n1_subscription';
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
} {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw createError('invalid_tool_input', 'deepmine_generate input must be an object');
  }

  const record = args as Record<string, unknown>;
  if (typeof record.prompt !== 'string' || !record.prompt.trim()) {
    throw createError('invalid_tool_input', 'deepmine_generate.prompt must be a non-empty string');
  }

  return {
    provider:
      typeof record.provider === 'string'
        ? (record.provider as
            | 'codex_subscription'
            | 'claude_subscription'
            | 'openai'
            | 'anthropic'
            | 'gemini'
            | 'deepseek'
            | 'grok'
            | 'openrouter'
            | 'n1_subscription')
        : undefined,
    system: typeof record.system === 'string' ? record.system : undefined,
    prompt: record.prompt.trim(),
    model: typeof record.model === 'string' ? record.model : undefined,
    temperature: typeof record.temperature === 'number' ? record.temperature : undefined,
    maxTokens: typeof record.maxTokens === 'number' ? record.maxTokens : undefined,
  };
}

async function buildCapsuleGraphSnapshot(branchName: string | null): Promise<{
  branch: string;
  counts: {
    total: number;
    by_type: Record<string, number>;
    orphaned: number;
  };
  top_linked: Array<{ capsule_id: string; degree: number }>;
}> {
  const branch = branchName?.trim() || 'real';
  const capsules = branch === 'real' ? await readCapsulesFromDisk() : await loadOverlayGraph(branch);
  const byType: Record<string, number> = {};
  const degree = new Map<string, number>();

  for (const capsule of capsules) {
    if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) continue;
    const metadata =
      (capsule as { metadata?: Record<string, unknown> }).metadata &&
      typeof (capsule as { metadata?: Record<string, unknown> }).metadata === 'object'
        ? ((capsule as { metadata?: Record<string, unknown> }).metadata as Record<string, unknown>)
        : null;
    const recursiveLayer =
      (capsule as { recursive_layer?: Record<string, unknown> }).recursive_layer &&
      typeof (capsule as { recursive_layer?: Record<string, unknown> }).recursive_layer === 'object'
        ? ((capsule as { recursive_layer?: Record<string, unknown> }).recursive_layer as Record<string, unknown>)
        : null;

    const capsuleId = typeof metadata?.capsule_id === 'string' ? metadata.capsule_id : null;
    const type = typeof metadata?.type === 'string' ? metadata.type : 'unknown';
    byType[type] = (byType[type] ?? 0) + 1;

    if (!capsuleId) continue;
    degree.set(capsuleId, degree.get(capsuleId) ?? 0);

    const links = Array.isArray(recursiveLayer?.links) ? recursiveLayer.links : [];
    for (const link of links) {
      const targetId =
        link && typeof link === 'object' && !Array.isArray(link) && typeof (link as { target_id?: unknown }).target_id === 'string'
          ? (link as { target_id: string }).target_id
          : null;
      degree.set(capsuleId, (degree.get(capsuleId) ?? 0) + 1);
      if (targetId) {
        degree.set(targetId, (degree.get(targetId) ?? 0) + 1);
      }
    }
  }

  const topLinked = [...degree.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([capsule_id, degreeValue]) => ({ capsule_id, degree: degreeValue }));

  return {
    branch,
    counts: {
      total: capsules.length,
      by_type: byType,
      orphaned: [...degree.values()].filter((count) => count === 0).length,
    },
    top_linked: topLinked,
  };
}

function mapErrorToReason(error: unknown): AgentRunResult['reason'] {
  const code = (error as { code?: string }).code;
  if (code === 'turn_timeout') return 'timeout';
  if (code === 'stalled') return 'stalled';
  if (code === 'turn_cancelled') return 'cancelled';
  return 'failed';
}

export async function runAgentAttempt(options: {
  issue: Issue;
  attempt: number | null;
  runtime: {
    config: SymphonyConfig;
    promptTemplate: string;
  };
  tracker: TrackerClient;
  workspaceManager: WorkspaceManager;
  logger: Logger;
  onEvent: (event: AgentEvent) => void;
  signal?: AbortSignal;
}): Promise<AgentRunResult> {
  let workspacePath: string | null = null;
  let client: CodexAppServerClient | null = null;
  let turnCount = 0;
  let currentIssue = options.issue;

  const dynamicTools: Record<string, (args: unknown) => Promise<unknown>> = {};
  if (options.tracker instanceof LinearTrackerClient) {
    const linearTracker = options.tracker;
    dynamicTools.linear_graphql = async (args: unknown) => {
      try {
        const parsed = parseLinearToolInput(args);
        return {
          success: true,
          data: await linearTracker.executeRawQuery(parsed.query, parsed.variables),
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'linear_graphql_failed',
        };
      }
    };
  }
  dynamicTools.deepmine_generate = async (args: unknown) => {
    try {
      const parsed = parseDeepMineToolInput(args);
      const result = await generateTextWithAiProvider(parsed);
      return {
        success: true,
        provider: result.provider,
        model: result.model,
        endpoint: result.endpoint,
        text: result.text,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'deepmine_generate_failed',
      };
    }
  };
  dynamicTools.capsule_graph_snapshot = async (args: unknown) => {
    try {
      const branch =
        args && typeof args === 'object' && !Array.isArray(args) && typeof (args as { branch?: unknown }).branch === 'string'
          ? ((args as { branch: string }).branch)
          : options.runtime.config.tracker.branch;
      return {
        success: true,
        ...(await buildCapsuleGraphSnapshot(branch ?? 'real')),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'capsule_graph_snapshot_failed',
      };
    }
  };

  const abortListener = async () => {
    await client?.stop();
  };

  try {
    if (options.signal?.aborted) {
      throw createError('turn_cancelled', 'Attempt was cancelled before start');
    }

    const workspace = await options.workspaceManager.createForIssue(currentIssue.identifier);
    workspacePath = workspace.path;
    await options.workspaceManager.runBeforeRun(workspacePath, currentIssue);

    client = new CodexAppServerClient(options.runtime.config, options.logger, options.onEvent, dynamicTools);
    if (options.signal) {
      options.signal.addEventListener('abort', abortListener);
    }
    await client.start(workspacePath);

    while (turnCount < options.runtime.config.agent.max_turns) {
      if (options.signal?.aborted) {
        throw createError('turn_cancelled', 'Attempt cancelled');
      }

      const prompt =
        turnCount === 0
          ? await renderIssuePrompt({
              template: options.runtime.promptTemplate,
              issue: currentIssue,
              attempt: options.attempt,
            })
          : buildContinuationPrompt(currentIssue, turnCount + 1, options.runtime.config.agent.max_turns);

      turnCount += 1;

      const title = `${currentIssue.identifier}: ${currentIssue.title}`;
      await client.runTurn({
        cwd: workspacePath,
        prompt,
        title,
      });

      const refreshed = await options.tracker.fetchIssueStatesByIds([currentIssue.id]);
      if (refreshed[0]) {
        currentIssue = refreshed[0];
      }

      const state = normalizeIssueState(currentIssue.state);
      const stillActive = isStateIn(state, options.runtime.config.tracker.active_states);
      const terminal = isStateIn(state, options.runtime.config.tracker.terminal_states);
      if (!stillActive || terminal) {
        break;
      }
    }

    return {
      success: true,
      reason: 'completed',
      error: null,
      turn_count: turnCount,
    };
  } catch (error: unknown) {
    return {
      success: false,
      reason: mapErrorToReason(error),
      error: error instanceof Error ? error.message : 'agent runner failed',
      turn_count: turnCount,
    };
  } finally {
    if (options.signal) {
      options.signal.removeEventListener('abort', abortListener);
    }
    await client?.stop().catch(() => undefined);
    if (workspacePath) {
      await options.workspaceManager.runAfterRun(workspacePath, currentIssue).catch(() => undefined);
    }
  }
}
