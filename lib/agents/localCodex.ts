import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { getChatGptLocalAuthStatus } from '@/lib/chatgptLocalAuth';

export interface LocalCodexAvailability {
  available: boolean;
  reason: string | null;
  planType: string | null;
}

export interface LocalCodexStructuredTaskOptions {
  prompt: string;
  schema: Record<string, unknown>;
  model?: string | null;
  cwd?: string;
  timeoutMs?: number;
}

export interface LocalCodexStructuredTaskResult<T> {
  data: T;
  text: string;
  model: string | null;
}

function extractCodexMessage(stderr: string, stdout: string): string {
  const value = [stderr, stdout]
    .map((entry) => entry.trim())
    .find(Boolean);
  return value ? value.slice(0, 2000) : 'Codex execution failed';
}

function spawnAndCollect(
  args: string[],
  options: {
    cwd?: string;
    stdin?: string;
    timeoutMs?: number;
  } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    const timer =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            finish(() => {
              try {
                child.kill('SIGKILL');
              } catch {
                // noop
              }
              reject(new Error(`Codex execution timed out after ${options.timeoutMs}ms`));
            });
          }, options.timeoutMs)
        : null;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      finish(() => {
        if (timer) clearTimeout(timer);
        reject(error);
      });
    });

    child.on('close', (code) => {
      finish(() => {
        if (timer) clearTimeout(timer);
        resolve({
          code: typeof code === 'number' ? code : 1,
          stdout,
          stderr,
        });
      });
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

export async function getLocalCodexAvailability(): Promise<LocalCodexAvailability> {
  const auth = await getChatGptLocalAuthStatus();
  if (!auth.available) {
    return {
      available: false,
      reason: auth.reason ?? 'Local ChatGPT/Codex auth is unavailable.',
      planType: auth.plan_type,
    };
  }

  try {
    const result = await spawnAndCollect(['--version'], {
      timeoutMs: 10_000,
    });
    if (result.code !== 0) {
      return {
        available: false,
        reason: extractCodexMessage(result.stderr, result.stdout),
        planType: auth.plan_type,
      };
    }

    return {
      available: true,
      reason: null,
      planType: auth.plan_type,
    };
  } catch (error: unknown) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : 'Codex CLI is unavailable on this host.',
      planType: auth.plan_type,
    };
  }
}

export async function runLocalCodexStructuredTask<T>(
  options: LocalCodexStructuredTaskOptions,
): Promise<LocalCodexStructuredTaskResult<T>> {
  const availability = await getLocalCodexAvailability();
  if (!availability.available) {
    throw new Error(availability.reason ?? 'Local Codex is unavailable.');
  }

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'n1hub-codex-'));
  const schemaPath = path.join(tmpDir, 'output-schema.json');
  const outputPath = path.join(tmpDir, 'output-last-message.json');

  try {
    await fsp.writeFile(schemaPath, JSON.stringify(options.schema, null, 2), 'utf8');

    const args = [
      '-a',
      'never',
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--sandbox',
      'read-only',
      '--color',
      'never',
      '--cd',
      options.cwd ?? process.cwd(),
      '--output-schema',
      schemaPath,
      '--output-last-message',
      outputPath,
      '-',
    ];

    if (options.model?.trim()) {
      args.splice(1, 0, '--model', options.model.trim());
    }

    const result = await spawnAndCollect(args, {
      cwd: options.cwd ?? process.cwd(),
      stdin: options.prompt,
      timeoutMs: options.timeoutMs ?? 90_000,
    });

    if (result.code !== 0) {
      throw new Error(extractCodexMessage(result.stderr, result.stdout));
    }

    const raw = await fsp.readFile(outputPath, 'utf8');
    return {
      data: JSON.parse(raw) as T,
      text: raw,
      model: options.model?.trim() || null,
    };
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
