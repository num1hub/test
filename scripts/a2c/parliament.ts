#!/usr/bin/env tsx
import { runEpistemicParliament } from '../../lib/a2c/parliament';

(async () => {
  const result = await runEpistemicParliament(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'parliament failed'}\n`);
  process.exit(1);
});
