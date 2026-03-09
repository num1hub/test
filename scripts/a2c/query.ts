#!/usr/bin/env tsx
import { runQueryCommand } from '../../lib/a2c/query';

(async () => {
  await runQueryCommand(process.argv.slice(2));
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'query failed'}\n`);
  process.exit(1);
});
