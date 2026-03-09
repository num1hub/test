#!/usr/bin/env tsx
import { runVoidMapper } from '../../lib/a2c/voidMapper';

(async () => {
  const result = await runVoidMapper(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'voids failed'}\n`);
  process.exit(1);
});
