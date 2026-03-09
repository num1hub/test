#!/usr/bin/env tsx
import { runAudit } from '../../lib/a2c/audit';

(async () => {
  const result = await runAudit(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'audit failed'}\n`);
  process.exit(1);
});
