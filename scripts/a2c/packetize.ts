#!/usr/bin/env tsx
import { runTaskPacketCommand } from '../../lib/a2c/todoPacket';

(async () => {
  const report = await runTaskPacketCommand(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'packetize failed'}\n`);
  process.exit(1);
});
