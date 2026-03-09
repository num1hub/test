#!/usr/bin/env tsx
import { runWeaver } from '../../lib/a2c/weaver';

(async () => {
  const result = await runWeaver();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'weaver failed'}\n`);
  process.exit(1);
});
