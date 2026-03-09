#!/usr/bin/env tsx
import { runRecon } from '../../lib/a2c/recon';
import fs from 'fs/promises';

const parseArg = (argv: string[], key: string): string | undefined => {
  const idx = argv.indexOf(key);
  return idx >= 0 ? argv[idx + 1] : undefined;
};

const parseArgs = (argv: string[]) => ({
  workspaceRoot: parseArg(argv, '--workspace-root') || process.cwd(),
  kbRoot: parseArg(argv, '--kb-root') || process.cwd(),
  jsonOut: parseArg(argv, '--json-out'),
  markdownOut: parseArg(argv, '--markdown-out'),
});

const markdown = (payload: unknown): string => {
  const asObj = payload as { workspace?: { mode?: string } };
  const mode = asObj.workspace?.mode ?? 'unknown';
  return [`# Workspace Intelligence`, `- Mode: ${mode}`, ''].join('\n');
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const report = await runRecon(args.workspaceRoot, args.kbRoot);
  if (args.jsonOut) await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  if (args.markdownOut) await fs.writeFile(args.markdownOut, markdown(report), 'utf-8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'recon failed'}\n`);
  process.exit(1);
});
