#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { runRecon } from '../../lib/a2c/recon';
import { queryVault } from '../../lib/a2c/query';

const parseArgs = (argv: string[]) => {
  const read = (flag: string, fallback = '') => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] || fallback : fallback;
  };
  return {
    workspaceRoot: read('--workspace-root', process.cwd()),
    kbRoot: read('--kb-root', process.cwd()),
    input: read('--input'),
    query: read('--query', ''),
    dryRun: argv.includes('--dry-run'),
    synthesizeOnFly: argv.includes('--synthesize-on-fly'),
  };
};

const summarizeInput = async (inputPath: string) => {
  const resolved = path.resolve(inputPath);
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    return {
      path: resolved,
      kind: 'non_file',
      bytes: stat.size,
    };
  }

  const raw = await fs.readFile(resolved, 'utf-8').catch(() => '');
  const trimmed = raw.trim();
  const lines = raw ? raw.split(/\r?\n/).length : 0;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  return {
    path: resolved,
    kind: 'file',
    bytes: stat.size,
    lines,
    words,
    sha1: crypto.createHash('sha1').update(raw).digest('hex'),
    preview: raw.slice(0, 240),
  };
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const recon = await runRecon(args.workspaceRoot, args.kbRoot);
  const inputSummary = args.input ? await summarizeInput(args.input) : null;
  const query =
    args.query ||
    (inputSummary?.kind === 'file' && typeof inputSummary.preview === 'string'
      ? inputSummary.preview.slice(0, 120)
      : 'n1hub architecture');

  const queryResult = await queryVault({
    kbRoot: args.kbRoot,
    query,
    synthesizeOnFly: args.synthesizeOnFly,
  });
  process.stdout.write(
    JSON.stringify(
      {
        recon,
        input: inputSummary,
        query,
        query_rows: queryResult.rows.length,
        top_matches: queryResult.rows.slice(0, 5).map((row) => ({
          capsule_id: row.capsule_id,
          score: row.score,
          title: row.title,
        })),
        mode_recommendation:
          queryResult.rows.length >= 5
            ? 'integration'
            : queryResult.rows.length >= 2
              ? 'conservative'
              : 'synthesis',
        dry_run: args.dryRun,
      },
      null,
      2,
    ) + '\n',
  );
})().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'investigate failed'}\n`);
  process.exit(1);
});
