import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';
import {
  AI_WALLET_PROVIDER_IDS,
  AI_WALLET_PROVIDER_METADATA,
  type AiWalletProviderConfig,
  type AiWalletProviderId,
  type AiWalletProviderSummary,
  type AiWalletStore,
  aiWalletStoreSchema,
} from '@/lib/aiWalletSchema';

const PRIVATE_DIR = dataPath('private');
const AI_WALLET_FILE_PATH = path.join(PRIVATE_DIR, 'ai-wallet.enc.json');
const AI_WALLET_KEY_FILE_PATH = path.join(PRIVATE_DIR, 'ai-wallet.key');
let cachedWalletKey: Buffer | null = null;

interface EncryptedEnvelope {
  version: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
}

const emptyStore = (): AiWalletStore => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  providers: {},
});

const ensurePrivateDir = async () => {
  try {
    await fs.access(PRIVATE_DIR);
  } catch {
    await fs.mkdir(PRIVATE_DIR, { recursive: true });
  }
};

const deriveKey = (seed: string): Buffer => {
  return crypto.createHash('sha256').update(seed).digest();
};

async function getWalletKey(): Promise<Buffer> {
  if (cachedWalletKey) return cachedWalletKey;

  const envKey = process.env.N1HUB_AI_WALLET_KEY?.trim();
  if (envKey) {
    cachedWalletKey = deriveKey(envKey);
    return cachedWalletKey;
  }

  await ensurePrivateDir();

  try {
    const fileKey = (await fs.readFile(AI_WALLET_KEY_FILE_PATH, 'utf-8')).trim();
    if (fileKey) {
      cachedWalletKey = deriveKey(fileKey);
      return cachedWalletKey;
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  await fs.writeFile(AI_WALLET_KEY_FILE_PATH, generated, {
    encoding: 'utf-8',
    mode: 0o600,
  });
  cachedWalletKey = deriveKey(generated);
  return cachedWalletKey;
}

const encryptStore = (payload: AiWalletStore, key: Buffer): EncryptedEnvelope => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf-8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
};

const decryptStore = (payload: EncryptedEnvelope, key: Buffer): AiWalletStore => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'hex')),
    decipher.final(),
  ]);

  return aiWalletStoreSchema.parse(JSON.parse(decrypted.toString('utf-8')) as unknown);
};

async function readStore(): Promise<AiWalletStore> {
  try {
    const raw = await fs.readFile(AI_WALLET_FILE_PATH, 'utf-8');
    const envelope = JSON.parse(raw) as EncryptedEnvelope;
    const key = await getWalletKey();
    return decryptStore(envelope, key);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    throw error;
  }
}

async function writeStore(store: AiWalletStore): Promise<void> {
  await ensurePrivateDir();
  const key = await getWalletKey();
  const payload = encryptStore(store, key);
  await fs.writeFile(AI_WALLET_FILE_PATH, JSON.stringify(payload, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

const maskSecret = (secret: string): string => {
  if (secret.length <= 8) return `${secret.slice(0, 2)}****`;
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
};

const cleanOptionalString = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

function toSummary(
  provider: AiWalletProviderId,
  config?: AiWalletProviderConfig,
): AiWalletProviderSummary {
  const metadata = AI_WALLET_PROVIDER_METADATA[provider];
  const envSummary =
    !config
      ? provider === 'gemini' && (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim())
        ? {
            configured: true,
            enabled: true,
            preferredModel: 'gemini-2.5-flash',
            endpoint: process.env.GEMINI_API_BASE_URL?.trim() || null,
            secretHint: 'env:GEMINI_API_KEY',
            updatedAt: null,
            helperText: `${metadata.helperText} Currently resolved from server environment.`,
          }
        : provider === 'github_models' && (process.env.GITHUB_MODELS_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim())
            ? {
                configured: true,
                enabled: true,
                preferredModel: 'openai/gpt-4.1',
                endpoint: process.env.GITHUB_MODELS_BASE_URL?.trim() || null,
                secretHint: process.env.GITHUB_MODELS_TOKEN?.trim()
                  ? 'env:GITHUB_MODELS_TOKEN'
                  : 'env:GITHUB_TOKEN',
                updatedAt: null,
                helperText: `${metadata.helperText} Currently resolved from server environment.`,
              }
            : null
      : null;

  return {
    provider,
    label: metadata.label,
    mode: metadata.mode,
    configured: envSummary?.configured ?? Boolean(config?.secret),
    enabled: envSummary?.enabled ?? (config?.enabled ?? false),
    preferredModel: envSummary?.preferredModel ?? (config?.preferredModel ?? null),
    endpoint: envSummary?.endpoint ?? (config?.endpoint ?? null),
    secretHint: envSummary?.secretHint ?? (config?.secret ? maskSecret(config.secret) : null),
    updatedAt: envSummary?.updatedAt ?? (config?.updatedAt ?? null),
    helperText: envSummary?.helperText ?? metadata.helperText,
  };
}

export async function listAiWalletProviderSummaries(): Promise<AiWalletProviderSummary[]> {
  const store = await readStore();
  return AI_WALLET_PROVIDER_IDS.map((provider) => toSummary(provider, store.providers[provider]));
}

export async function upsertAiWalletProvider(
  input: {
    provider: AiWalletProviderId;
    secret: string;
    enabled: boolean;
    preferredModel?: string;
    endpoint?: string;
  },
): Promise<AiWalletProviderSummary> {
  const metadata = AI_WALLET_PROVIDER_METADATA[input.provider];
  const store = await readStore();
  const updatedAt = new Date().toISOString();

  store.providers[input.provider] = {
    provider: input.provider,
    mode: metadata.mode,
    secret: input.secret.trim(),
    enabled: input.enabled,
    preferredModel: cleanOptionalString(input.preferredModel),
    endpoint: cleanOptionalString(input.endpoint),
    updatedAt,
  };
  store.updatedAt = updatedAt;

  await writeStore(store);
  return toSummary(input.provider, store.providers[input.provider]);
}

export async function clearAiWalletProvider(
  provider: AiWalletProviderId,
): Promise<AiWalletProviderSummary> {
  const store = await readStore();
  delete store.providers[provider];
  store.updatedAt = new Date().toISOString();
  await writeStore(store);
  return toSummary(provider, undefined);
}

export async function getAiWalletProviderSecret(
  provider: AiWalletProviderId,
): Promise<AiWalletProviderConfig | null> {
  const store = await readStore();
  return store.providers[provider] ?? null;
}
