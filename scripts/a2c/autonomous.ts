#!/usr/bin/env tsx
import fs from 'fs/promises';
import { runAutonomousCycle } from '../../lib/a2c/autonomous';

(async () => {
  const args = process.argv.slice(2);
  const jsonOut = (() => {
    const idx = args.indexOf('--json-out');
    return idx >= 0 ? args[idx + 1] : undefined;
  })();
  const result = await runAutonomousCycle(args);
  if (jsonOut) await fs.writeFile(jsonOut, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'autonomous run failed'}\n`);
  process.exit(1);
});
