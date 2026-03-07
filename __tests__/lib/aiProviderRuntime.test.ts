// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAiWalletProviderSecretMock,
  listAiWalletProviderSummariesMock,
} = vi.hoisted(() => ({
  getAiWalletProviderSecretMock: vi.fn(),
  listAiWalletProviderSummariesMock: vi.fn(),
}));

vi.mock('@/lib/aiWallet', () => ({
  getAiWalletProviderSecret: getAiWalletProviderSecretMock,
  listAiWalletProviderSummaries: listAiWalletProviderSummariesMock,
}));

import { generateTextWithAiProvider, getResolvedAiProviderCatalog } from '@/lib/ai/providerRuntime';

describe('lib/ai/providerRuntime.ts', () => {
  const originalFetch = global.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('generates text through an OpenAI-compatible provider from AI Wallet', async () => {
    getAiWalletProviderSecretMock.mockResolvedValue({
      provider: 'openai',
      mode: 'api_key',
      secret: 'sk-test',
      enabled: true,
      preferredModel: 'gpt-4.1-mini',
      endpoint: 'https://api.openai.com/v1',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Hello from OpenAI',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateTextWithAiProvider({
      provider: 'openai',
      prompt: 'Say hello',
    });

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4.1-mini');
    expect(result.text).toBe('Hello from OpenAI');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('generates text through a Claude subscription bridge from AI Wallet', async () => {
    getAiWalletProviderSecretMock.mockResolvedValue({
      provider: 'claude_subscription',
      mode: 'auth_key',
      secret: 'claude-auth-token',
      enabled: true,
      preferredModel: 'claude-subscription/default',
      endpoint: 'http://127.0.0.1:8788/v1/claude-subscription',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          text: 'Hello from Claude Subscription',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateTextWithAiProvider({
      provider: 'claude_subscription',
      prompt: 'Say hello',
    });

    expect(result.provider).toBe('claude_subscription');
    expect(result.model).toBe('claude-subscription/default');
    expect(result.text).toBe('Hello from Claude Subscription');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8788/v1/claude-subscription',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer claude-auth-token',
        }),
      }),
    );
  });

  it('generates text through a ChatGPT / Codex subscription bridge from AI Wallet', async () => {
    getAiWalletProviderSecretMock.mockResolvedValue({
      provider: 'codex_subscription',
      mode: 'auth_key',
      secret: 'codex-auth-token',
      enabled: true,
      preferredModel: 'codex-subscription/default',
      endpoint: 'http://127.0.0.1:8788/v1/codex-subscription',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          text: 'Hello from Codex Subscription',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateTextWithAiProvider({
      provider: 'codex_subscription',
      prompt: 'Say hello',
    });

    expect(result.provider).toBe('codex_subscription');
    expect(result.text).toBe('Hello from Codex Subscription');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8788/v1/codex-subscription',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer codex-auth-token',
        }),
      }),
    );
  });

  it('generates text through DeepSeek with the OpenAI-compatible runtime path', async () => {
    getAiWalletProviderSecretMock.mockResolvedValue({
      provider: 'deepseek',
      mode: 'api_key',
      secret: 'sk-deepseek-test',
      enabled: true,
      preferredModel: 'deepseek-chat',
      endpoint: 'https://api.deepseek.com',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Hello from DeepSeek',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await generateTextWithAiProvider({
      provider: 'deepseek',
      prompt: 'Say hello',
    });

    expect(result.provider).toBe('deepseek');
    expect(result.model).toBe('deepseek-chat');
    expect(result.text).toBe('Hello from DeepSeek');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('resolves available provider catalog and marks the default provider', async () => {
    listAiWalletProviderSummariesMock.mockResolvedValue([
      {
        provider: 'openai',
        label: 'OpenAI',
        mode: 'api_key',
        configured: true,
        enabled: true,
        preferredModel: 'gpt-4.1-mini',
        endpoint: null,
        secretHint: 'sk-t...1234',
        updatedAt: '2026-03-06T00:00:00.000Z',
        helperText: 'OpenAI provider',
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        mode: 'api_key',
        configured: true,
        enabled: false,
        preferredModel: null,
        endpoint: null,
        secretHint: 'sk-a...1234',
        updatedAt: '2026-03-06T00:00:00.000Z',
        helperText: 'Anthropic provider',
      },
    ]);

    const catalog = await getResolvedAiProviderCatalog();

    expect(catalog[0]).toMatchObject({
      provider: 'openai',
      available: true,
      selectedByDefault: true,
      defaultModel: 'gpt-4.1-mini',
    });
    expect(catalog[1]).toMatchObject({
      provider: 'anthropic',
      available: false,
      selectedByDefault: false,
    });
  });
});
