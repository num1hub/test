#!/usr/bin/env tsx
import fs from 'fs/promises';
import { buildIndex } from '../../lib/a2c/index';

const parseArg = (argv: string[], key: string): string | undefined => {
  const idx = argv.indexOf(key);
  return idx >= 0 ? argv[idx + 1] : undefined;
};

(async () => {
  const args = process.argv.slice(2);
  const kbRoot = parseArg(args, '--kb-root') || process.cwd();
  const jsonOut = parseArg(args, '--json-out');
  const defaultNodeType = parseArg(args, '--default-node-type') || 'capsule';
  const result = await buildIndex(kbRoot, defaultNodeType);
  if (jsonOut) await fs.writeFile(jsonOut, `${JSON.stringify(result.index, null, 2)}\n`, 'utf-8');
  process.stdout.write(
    JSON.stringify(
      {
        status: result.issues.length > 0 ? 'PARTIAL' : 'COMPLETE',
        metrics: {
          nodes: result.index.graph.metrics.total_nodes,
          edges: result.index.graph.metrics.total_edges,
          issues: result.issues.length,
        },
        warnings: result.issues,
      },
      null,
      2,
    ) + '\n',
  );
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'index rebuild failed'}\n`);
  process.exit(1);
});
