import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import {
  clearAiWalletProvider,
  getAiWalletProviderSecret,
  listAiWalletProviderSummaries,
  upsertAiWalletProvider,
} from '@/lib/aiWallet';
import { AI_WALLET_PROVIDER_IDS } from '@/lib/aiWalletSchema';

vi.mock('fs/promises', () => {
  const access = vi.fn();
  const mkdir = vi.fn();
  const readFile = vi.fn();
  const writeFile = vi.fn();
  return {
    default: { access, mkdir, readFile, writeFile },
    access,
    mkdir,
    readFile,
    writeFile,
  };
});

describe('lib/aiWallet.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });
  });

  it('returns an empty summary list with all providers when wallet is missing', async () => {
    const summaries = await listAiWalletProviderSummaries();

    expect(summaries).toHaveLength(AI_WALLET_PROVIDER_IDS.length);
    expect(summaries.every((item) => item.configured === false)).toBe(true);
  });

  it('stores and resolves an encrypted provider secret', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const summary = await upsertAiWalletProvider({
      provider: 'openai',
      secret: 'sk-test-secret-1234',
      enabled: true,
      preferredModel: 'gpt-test',
      endpoint: 'https://api.openai.com/v1',
    });

    expect(summary.configured).toBe(true);
    expect(summary.secretHint).toMatch(/^sk-t/);
    expect(fs.writeFile).toHaveBeenCalledTimes(2);

    const envelopePayload = vi.mocked(fs.writeFile).mock.calls.at(-1)?.[1];
    vi.mocked(fs.readFile).mockResolvedValue(String(envelopePayload) as never);

    const secret = await getAiWalletProviderSecret('openai');
    expect(secret?.secret).toBe('sk-test-secret-1234');
    expect(secret?.preferredModel).toBe('gpt-test');
  });

  it('clears a stored provider', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    await upsertAiWalletProvider({
      provider: 'anthropic',
      secret: 'sk-ant-test-secret',
      enabled: true,
    });

    const storedEnvelope = vi.mocked(fs.writeFile).mock.calls.at(-1)?.[1];
    vi.mocked(fs.readFile).mockResolvedValue(String(storedEnvelope) as never);

    const cleared = await clearAiWalletProvider('anthropic');
    expect(cleared.configured).toBe(false);
  });
});
