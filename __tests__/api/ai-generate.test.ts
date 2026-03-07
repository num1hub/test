// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { generateTextWithAiProviderMock } = vi.hoisted(() => ({
  generateTextWithAiProviderMock: vi.fn(),
}));

vi.mock('@/lib/ai/providerRuntime', () => ({
  generateTextWithAiProvider: generateTextWithAiProviderMock,
}));

import { POST } from '@/app/api/ai/generate/route';

describe('app/api/ai/generate/route.ts', () => {
  it('rejects unauthorized requests', async () => {
    const request = new Request('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hello' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('runs generation for authorized requests', async () => {
    generateTextWithAiProviderMock.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      text: 'Generated answer',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      raw: { ok: true },
    });

    const request = new Request('http://localhost/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hello', provider: 'openai' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer n1-authorized-architect-token-777',
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(generateTextWithAiProviderMock).toHaveBeenCalledWith({
      prompt: 'hello',
      provider: 'openai',
    });
    expect(payload).toMatchObject({
      provider: 'openai',
      text: 'Generated answer',
    });
  });
});
