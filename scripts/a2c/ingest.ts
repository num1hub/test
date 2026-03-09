#!/usr/bin/env tsx
import { runIngestCommand } from '../../lib/a2c/ingest';

(async () => {
  const result = await runIngestCommand(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'ingest failed'}\n`);
  process.exit(1);
});
