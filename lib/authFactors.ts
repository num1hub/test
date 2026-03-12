import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';
import { hashPassword, verifyPassword } from '@/lib/password';

const AUTH_DIR = dataPath('private', 'auth');
const ACCESS_CODE_PATH = path.join(AUTH_DIR, 'access-code.txt');
let envAccessCodeHashPromise: Promise<string> | null = null;

function normalizeAccessCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
}

async function ensureAuthDir() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
}

function getConfiguredAccessCode() {
  return process.env.N1HUB_ACCESS_CODE?.trim() || null;
}

function isEnvBackedAccessCode() {
  return process.env.NODE_ENV === 'production' && Boolean(getConfiguredAccessCode());
}

async function getEnvBackedAccessCodeHash() {
  const configuredCode = getConfiguredAccessCode();
  if (!configuredCode) {
    throw new Error('N1HUB_ACCESS_CODE must be configured for env-backed auth.');
  }

  if (!envAccessCodeHashPromise) {
    envAccessCodeHashPromise = hashPassword(normalizeAccessCode(configuredCode));
  }

  return await envAccessCodeHashPromise;
}

async function readOrCreateAccessCodeHash() {
  if (isEnvBackedAccessCode()) {
    return await getEnvBackedAccessCodeHash();
  }

  try {
    const hash = await fs.readFile(ACCESS_CODE_PATH, 'utf-8');
    return hash.trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const configuredCode = process.env.N1HUB_ACCESS_CODE?.trim();
    if (!configuredCode && process.env.NODE_ENV === 'production') {
      throw new Error('N1HUB_ACCESS_CODE must be configured in production.');
    }

    const initialCode = normalizeAccessCode(configuredCode || 'n1x1');
    const hash = await hashPassword(initialCode);
    await ensureAuthDir();
    await fs.writeFile(ACCESS_CODE_PATH, hash, 'utf-8');
    return hash;
  }
}

export function matchesAuthorizedLogin(candidate: string) {
  const normalizedCandidate = candidate.trim().toLowerCase();
  if (!normalizedCandidate) return false;

  const aliases = new Set(
    [process.env.N1HUB_OWNER_LOGIN]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  return aliases.has(normalizedCandidate);
}

export async function verifyAccessCode(accessCode: string) {
  const storedHash = await readOrCreateAccessCodeHash();
  return verifyPassword(normalizeAccessCode(accessCode), storedHash);
}
