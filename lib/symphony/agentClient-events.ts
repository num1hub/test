import type { AgentEvent } from './types';

export interface TurnCompletion {
  success: boolean;
  status: string;
  message: string | null;
}

export interface NotificationResult {
  event: AgentEvent;
  completion?: TurnCompletion;
  errorCode?: string;
}

interface BuildNotificationResultOptions {
  method: string;
  params: unknown;
  timestamp: string;
  pid: string | null;
  threadId: string | null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function extractString(value: unknown, ...path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    current = asRecord(current)?.[key];
  }
  return typeof current === 'string' && current.trim() ? current.trim() : null;
}

export function findUsage(
  value: unknown,
): { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined {
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

export function buildNotificationResult({
  method,
  params,
  timestamp,
  pid,
  threadId,
}: BuildNotificationResultOptions): NotificationResult {
  const usage = findUsage(params);
  const baseEvent = {
    timestamp,
    codex_app_server_pid: pid,
  };

  if (method === 'turn/started') {
    return {
      event: {
        event: 'turn_started',
        ...baseEvent,
        thread_id: extractString(params, 'threadId') ?? threadId ?? undefined,
        turn_id: extractString(params, 'turn', 'id') ?? undefined,
        usage,
      },
    };
  }

  if (method === 'turn/completed') {
    const status = extractString(params, 'turn', 'status') ?? 'failed';
    const message =
      extractString(params, 'turn', 'lastAgentMessage') ??
      extractString(params, 'turn', 'output');
    const completion: TurnCompletion = {
      success: status === 'completed',
      status,
      message,
    };

    return {
      event: {
        event:
          status === 'completed'
            ? 'turn_completed'
            : status === 'interrupted'
              ? 'turn_cancelled'
              : 'turn_failed',
        ...baseEvent,
        thread_id: extractString(params, 'threadId') ?? threadId ?? undefined,
        turn_id: extractString(params, 'turn', 'id') ?? undefined,
        message,
        usage,
        raw: params,
      },
      completion,
      errorCode:
        status === 'completed'
          ? undefined
          : status === 'interrupted'
            ? 'turn_cancelled'
            : 'turn_failed',
    };
  }

  if (method === 'turn/failed' || method === 'turn/cancelled') {
    const message =
      extractString(params, 'error', 'message') ??
      extractString(params, 'message') ??
      method;
    const status = method === 'turn/cancelled' ? 'cancelled' : 'failed';

    return {
      event: {
        event: method === 'turn/cancelled' ? 'turn_cancelled' : 'turn_failed',
        ...baseEvent,
        thread_id: extractString(params, 'threadId') ?? threadId ?? undefined,
        turn_id:
          extractString(params, 'turnId') ??
          extractString(params, 'turn', 'id') ??
          undefined,
        message,
        usage,
        raw: params,
      },
      completion: {
        success: false,
        status,
        message,
      },
      errorCode: method === 'turn/cancelled' ? 'turn_cancelled' : 'turn_failed',
    };
  }

  if (method === 'thread/tokenUsage/updated') {
    return {
      event: {
        event: 'notification',
        ...baseEvent,
        usage,
        raw: params,
      },
    };
  }

  if (method === 'account/rateLimits/updated') {
    return {
      event: {
        event: 'notification',
        ...baseEvent,
        rate_limits: asRecord(params)?.rateLimits ?? null,
        raw: params,
      },
    };
  }

  if (method === 'item/agentMessage/delta') {
    return {
      event: {
        event: 'notification',
        ...baseEvent,
        thread_id: extractString(params, 'threadId') ?? threadId ?? undefined,
        turn_id: extractString(params, 'turnId') ?? undefined,
        message: extractString(params, 'delta'),
        raw: params,
      },
    };
  }

  return {
    event: {
      event: 'other_message',
      ...baseEvent,
      message: method,
      usage,
      raw: params,
    },
  };
}
