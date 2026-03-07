#!/usr/bin/env tsx
import process from 'process';
import { SymphonyService } from '@/lib/symphony';

function parseArgs(argv: string[]): { workflowPath?: string; port?: number | null } {
  let workflowPath: string | undefined;
  let port: number | null | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--port') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--port requires a value');
      }
      port = Number.parseInt(value, 10);
      index += 1;
      continue;
    }

    if (!workflowPath) {
      workflowPath = token;
      continue;
    }

    throw new Error(`Unexpected argument: ${token}`);
  }

  return { workflowPath, port };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const service = new SymphonyService(args);

  const shutdown = async () => {
    await service.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await service.start();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Symphony service failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
