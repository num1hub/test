import { describe, expect, it } from 'vitest';
import { buildNotificationResult } from '@/lib/symphony/agentClient-events';

describe('buildNotificationResult', () => {
  it('maps turn completion with usage into a completed event and outcome', () => {
    const params = {
      threadId: 'thread-1',
      turn: {
        id: 'turn-1',
        status: 'completed',
        lastAgentMessage: 'ready',
      },
      usage: {
        input_tokens: 11,
        output_tokens: 7,
        total_tokens: 18,
      },
    };

    const result = buildNotificationResult({
      method: 'turn/completed',
      params,
      timestamp: '2026-03-10T00:00:00.000Z',
      pid: '123',
      threadId: 'fallback-thread',
    });

    expect(result.event).toMatchObject({
      event: 'turn_completed',
      timestamp: '2026-03-10T00:00:00.000Z',
      codex_app_server_pid: '123',
      thread_id: 'thread-1',
      turn_id: 'turn-1',
      message: 'ready',
      usage: {
        input_tokens: 11,
        output_tokens: 7,
        total_tokens: 18,
      },
    });
    expect(result.completion).toEqual({
      success: true,
      status: 'completed',
      message: 'ready',
    });
    expect(result.errorCode).toBeUndefined();
  });

  it('maps interrupted completion into a cancellation outcome', () => {
    const result = buildNotificationResult({
      method: 'turn/completed',
      params: {
        turn: {
          id: 'turn-2',
          status: 'interrupted',
          output: 'stopped',
        },
      },
      timestamp: '2026-03-10T00:00:00.000Z',
      pid: '123',
      threadId: 'thread-2',
    });

    expect(result.event).toMatchObject({
      event: 'turn_cancelled',
      thread_id: 'thread-2',
      turn_id: 'turn-2',
      message: 'stopped',
    });
    expect(result.completion).toEqual({
      success: false,
      status: 'interrupted',
      message: 'stopped',
    });
    expect(result.errorCode).toBe('turn_cancelled');
  });

  it('maps rate-limit updates and unknown notifications without forcing completion', () => {
    const rateLimitResult = buildNotificationResult({
      method: 'account/rateLimits/updated',
      params: {
        rateLimits: { primary: { remaining: 2 } },
      },
      timestamp: '2026-03-10T00:00:00.000Z',
      pid: '123',
      threadId: 'thread-3',
    });

    expect(rateLimitResult).toMatchObject({
      event: {
        event: 'notification',
        rate_limits: { primary: { remaining: 2 } },
      },
    });
    expect(rateLimitResult.completion).toBeUndefined();
    expect(rateLimitResult.errorCode).toBeUndefined();

    const fallbackResult = buildNotificationResult({
      method: 'custom/notice',
      params: {
        tokenUsage: { total_tokens: 9 },
      },
      timestamp: '2026-03-10T00:00:00.000Z',
      pid: '123',
      threadId: 'thread-3',
    });

    expect(fallbackResult).toMatchObject({
      event: {
        event: 'other_message',
        message: 'custom/notice',
        usage: { total_tokens: 9 },
      },
    });
    expect(fallbackResult.completion).toBeUndefined();
    expect(fallbackResult.errorCode).toBeUndefined();
  });
});
