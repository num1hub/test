import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PUT } from '@/app/api/user/ai-wallet/route';
import {
  clearAiWalletProvider,
  listAiWalletProviderSummaries,
  upsertAiWalletProvider,
} from '@/lib/aiWallet';

vi.mock('@/lib/aiWallet', () => ({
  listAiWalletProviderSummaries: vi.fn(),
  upsertAiWalletProvider: vi.fn(),
  clearAiWalletProvider: vi.fn(),
}));

describe('API: /api/user/ai-wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAiWalletProviderSummaries).mockResolvedValue([
      {
        provider: 'openai',
        label: 'OpenAI',
        mode: 'api_key',
        configured: true,
        enabled: true,
        preferredModel: 'gpt-test',
        endpoint: null,
        secretHint: 'sk-t...1234',
        updatedAt: '2026-03-06T16:00:00.000Z',
        helperText: 'Direct API access.',
      },
    ] as never);
    vi.mocked(upsertAiWalletProvider).mockResolvedValue({
      provider: 'openai',
      label: 'OpenAI',
      mode: 'api_key',
      configured: true,
      enabled: true,
      preferredModel: 'gpt-test',
      endpoint: null,
      secretHint: 'sk-t...1234',
      updatedAt: '2026-03-06T16:00:00.000Z',
      helperText: 'Direct API access.',
    } as never);
    vi.mocked(clearAiWalletProvider).mockResolvedValue({
      provider: 'openai',
      label: 'OpenAI',
      mode: 'api_key',
      configured: false,
      enabled: false,
      preferredModel: null,
      endpoint: null,
      secretHint: null,
      updatedAt: null,
      helperText: 'Direct API access.',
    } as never);
  });

  it('returns provider summaries for authorized requests', async () => {
    const req = new Request('http://localhost/api/user/ai-wallet', {
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.providers).toHaveLength(1);
  });

  it('rejects unauthorized requests', async () => {
    const req = new Request('http://localhost/api/user/ai-wallet');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('saves provider secrets through PUT', async () => {
    const req = new Request('http://localhost/api/user/ai-wallet', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer n1-authorized-architect-token-777',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'openai',
        action: 'save',
        secret: 'sk-test-secret',
        enabled: true,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(upsertAiWalletProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        secret: 'sk-test-secret',
        enabled: true,
      }),
    );
  });

  it('clears provider secrets through PUT', async () => {
    const req = new Request('http://localhost/api/user/ai-wallet', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer n1-authorized-architect-token-777',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'openai',
        action: 'clear',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(clearAiWalletProvider).toHaveBeenCalledWith('openai');
  });
});
