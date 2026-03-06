import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';

const PASSWORD_FILE_PATH = dataPath('password.txt');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

const ensurePasswordDir = async () => {
  const dir = path.dirname(PASSWORD_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

const parseHash = (value: string) => {
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4];
  const hashHex = parts[5];

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  if (!saltHex || !hashHex) return null;

  return {
    n,
    r,
    p,
    salt: Buffer.from(saltHex, 'hex'),
    hash: Buffer.from(hashHex, 'hex'),
  };
};

const scryptBuffer = async (
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
) => {
  return await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
};

const hashWithParams = async (password: string, salt: Buffer, n: number, r: number, p: number) => {
  return await scryptBuffer(password, salt, n, r, p);
};

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await hashWithParams(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Retrieves the current password hash. If the file doesn't exist, it creates one
 * using the VAULT_PASSWORD environment variable or a fallback default.
 */
export async function getPasswordHash(): Promise<string> {
  try {
    const hash = await fs.readFile(PASSWORD_FILE_PATH, 'utf-8');
    return hash.trim();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const defaultPassword = process.env.VAULT_PASSWORD || 'numberone';
      const hash = await hashPassword(defaultPassword);
      await ensurePasswordDir();
      await fs.writeFile(PASSWORD_FILE_PATH, hash, 'utf-8');
      return hash;
    }
    throw error;
  }
}

/**
 * Saves a new password hash to the local file system.
 */
export async function setPasswordHash(newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  await ensurePasswordDir();
  await fs.writeFile(PASSWORD_FILE_PATH, hash, 'utf-8');
}

export async function verifyPassword(
  plaintextPassword: string,
  storedHash: string,
): Promise<boolean> {
  const parsed = parseHash(storedHash);

  // Legacy fallback in case an older plain-text value was written.
  if (!parsed) return storedHash === plaintextPassword;

  const candidate = await hashWithParams(
    plaintextPassword,
    parsed.salt,
    parsed.n,
    parsed.r,
    parsed.p,
  );

  if (candidate.length !== parsed.hash.length) return false;
  return crypto.timingSafeEqual(candidate, parsed.hash);
}
