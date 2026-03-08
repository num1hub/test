import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

type JsonRecord = Record<string, unknown>;

export type ChatGptLocalAuthStatus = {
  enabled: boolean;
  available: boolean;
  mode: 'local_codex';
  state: 'connected' | 'expired' | 'missing' | 'disabled' | 'error';
  source_path: string;
  email: string | null;
  plan_type: string | null;
  subscription_active_until: string | null;
  reason: string | null;
};

type ChatGptAuthPayload = {
  email: string | null;
  planType: string | null;
  subscriptionActiveUntil: string | null;
  exp: number | null;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function parseJwtPayload(token: unknown): JsonRecord | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as JsonRecord;
  } catch {
    return null;
  }
}

function getOpenAiAuthClaims(payload: JsonRecord | null): JsonRecord | null {
  return asRecord(payload?.['https://api.openai.com/auth']);
}

function parseTokenPayload(payload: JsonRecord | null): ChatGptAuthPayload {
  const authClaims = getOpenAiAuthClaims(payload);
  const profileClaims = asRecord(payload?.['https://api.openai.com/profile']);

  return {
    email:
      typeof payload?.email === 'string'
        ? payload.email
        : typeof profileClaims?.email === 'string'
          ? profileClaims.email
          : null,
    planType: typeof authClaims?.chatgpt_plan_type === 'string' ? authClaims.chatgpt_plan_type : null,
    subscriptionActiveUntil:
      typeof authClaims?.chatgpt_subscription_active_until === 'string'
        ? authClaims.chatgpt_subscription_active_until
        : null,
    exp: typeof payload?.exp === 'number' ? payload.exp : null,
  };
}

function buildDisabledStatus(sourcePath: string, reason: string): ChatGptLocalAuthStatus {
  return {
    enabled: false,
    available: false,
    mode: 'local_codex',
    state: 'disabled',
    source_path: sourcePath,
    email: null,
    plan_type: null,
    subscription_active_until: null,
    reason,
  };
}

function getAuthJsonPath(): string {
  const explicitPath = process.env.N1HUB_CHATGPT_AUTH_JSON_PATH?.trim();
  if (explicitPath) return explicitPath;
  return path.join(os.homedir(), '.codex', 'auth.json');
}

function isLocalChatGptAuthEnabled(): boolean {
  const envValue = process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH;
  if (envValue) {
    return ['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase());
  }

  return process.env.NODE_ENV !== 'production';
}

export async function getChatGptLocalAuthStatus(): Promise<ChatGptLocalAuthStatus> {
  const sourcePath = getAuthJsonPath();
  if (!isLocalChatGptAuthEnabled()) {
    return buildDisabledStatus(sourcePath, 'Local ChatGPT authentication is disabled for this deployment.');
  }

  try {
    const raw = await fs.readFile(sourcePath, 'utf8');
    const parsed = JSON.parse(raw) as JsonRecord;

    if (parsed.auth_mode !== 'chatgpt') {
      return {
        enabled: true,
        available: false,
        mode: 'local_codex',
        state: 'missing',
        source_path: sourcePath,
        email: null,
        plan_type: null,
        subscription_active_until: null,
        reason: 'No local ChatGPT-backed Codex session was found.',
      };
    }

    const tokens = asRecord(parsed.tokens);
    const idPayload = parseTokenPayload(parseJwtPayload(tokens?.id_token));
    const accessPayload = parseTokenPayload(parseJwtPayload(tokens?.access_token));
    const merged = {
      email: idPayload.email ?? accessPayload.email ?? null,
      planType: idPayload.planType ?? accessPayload.planType ?? null,
      subscriptionActiveUntil: idPayload.subscriptionActiveUntil ?? accessPayload.subscriptionActiveUntil ?? null,
      exp: accessPayload.exp ?? idPayload.exp ?? null,
    };

    if (!merged.exp) {
      return {
        enabled: true,
        available: false,
        mode: 'local_codex',
        state: 'error',
        source_path: sourcePath,
        email: merged.email,
        plan_type: merged.planType,
        subscription_active_until: merged.subscriptionActiveUntil,
        reason: 'The local ChatGPT session is missing a usable token expiry.',
      };
    }

    if (Date.now() >= merged.exp * 1000) {
      return {
        enabled: true,
        available: false,
        mode: 'local_codex',
        state: 'expired',
        source_path: sourcePath,
        email: merged.email,
        plan_type: merged.planType,
        subscription_active_until: merged.subscriptionActiveUntil,
        reason: 'The local ChatGPT/Codex session has expired. Re-run codex login first.',
      };
    }

    return {
      enabled: true,
      available: true,
      mode: 'local_codex',
      state: 'connected',
      source_path: sourcePath,
      email: merged.email,
      plan_type: merged.planType,
      subscription_active_until: merged.subscriptionActiveUntil,
      reason: null,
    };
  } catch (error) {
    const reason =
      error instanceof Error && 'code' in error && error.code === 'ENOENT'
        ? 'No local Codex auth.json was found. Run codex and sign in with ChatGPT on this machine first.'
        : 'Failed to read the local ChatGPT/Codex session.';

    return {
      enabled: true,
      available: false,
      mode: 'local_codex',
      state: reason.includes('Run codex') ? 'missing' : 'error',
      source_path: sourcePath,
      email: null,
      plan_type: null,
      subscription_active_until: null,
      reason,
    };
  }
}
