#!/usr/bin/env tsx
import { runApoptosis } from '../../lib/a2c/sweeper';

(async () => {
  const result = await runApoptosis(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'sweep failed'}\n`);
  process.exit(1);
});
