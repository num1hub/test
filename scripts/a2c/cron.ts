#!/usr/bin/env tsx
import { runCronPlanner } from '../../lib/a2c/scheduler';

(async () => {
  const result = await runCronPlanner(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'cron failed'}\n`);
  process.exit(1);
});
