#!/usr/bin/env tsx
import { runDaemonWatcher } from '../../lib/a2c/watch';

(async () => {
  const result = await runDaemonWatcher(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'watch failed'}\n`);
  process.exit(1);
});
