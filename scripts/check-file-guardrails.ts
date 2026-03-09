#!/usr/bin/env tsx
// @anchor script:file.guardrails.audit links=doc:n1hub.low-blast-radius-architecture,doc:n1hub.agents,doc:n1hub.codex note="Audits app/lib/scripts file sizes against N1Hub AI-friendly soft and hard guardrails."
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

type ViolationLevel = 'soft' | 'hard';

type FileReport = {
  path: string;
  lines: number;
  level: ViolationLevel | 'ok';
};

const DEFAULT_TARGETS = ['app', 'lib', 'scripts'];
const DEFAULT_SOFT_LIMIT = 400;
const DEFAULT_HARD_LIMIT = 600;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function parseNumberFlag(argv: string[], flag: string, fallback: number): number {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const raw = argv[index + 1];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function countLines(raw: string): number {
  if (raw.length === 0) return 0;
  const normalized = raw.replace(/\r\n/g, '\n');
  const segments = normalized.split('\n');
  if (normalized.endsWith('\n')) {
    return segments.length - 1;
  }
  return segments.length;
}

async function walkSourceFiles(target: string): Promise<string[]> {
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return [];
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(path.extname(target)) ? [target] : [];
  }

  const entries = await fs.readdir(target, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === 'coverage') {
      continue;
    }

    const nextPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await walkSourceFiles(nextPath)));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      collected.push(nextPath);
    }
  }

  return collected;
}

function classify(lines: number, softLimit: number, hardLimit: number): FileReport['level'] {
  if (lines > hardLimit) return 'hard';
  if (lines > softLimit) return 'soft';
  return 'ok';
}

async function main() {
  const argv = process.argv.slice(2);
  const failOnSoft = argv.includes('--fail-on-soft');
  const failOnHard = argv.includes('--fail-on-hard');
  const json = argv.includes('--json');
  const softLimit = parseNumberFlag(argv, '--soft-limit', DEFAULT_SOFT_LIMIT);
  const hardLimit = parseNumberFlag(argv, '--hard-limit', DEFAULT_HARD_LIMIT);
  const targets = argv.filter((arg, index) => {
    if (arg.startsWith('--')) return false;
    if (index > 0 && (argv[index - 1] === '--soft-limit' || argv[index - 1] === '--hard-limit')) {
      return false;
    }
    return true;
  });

  const resolvedTargets = targets.length > 0 ? targets : DEFAULT_TARGETS;
  const files = [...new Set((await Promise.all(resolvedTargets.map((target) => walkSourceFiles(target)))).flat())].sort();
  const reports: FileReport[] = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const lines = countLines(raw);
    reports.push({
      path: filePath,
      lines,
      level: classify(lines, softLimit, hardLimit),
    });
  }

  const softViolations = reports.filter((report) => report.level === 'soft');
  const hardViolations = reports.filter((report) => report.level === 'hard');
  const largest = [...reports].sort((left, right) => right.lines - left.lines).slice(0, 12);

  if (json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          soft_limit: softLimit,
          hard_limit: hardLimit,
          targets: resolvedTargets,
          scanned_files: reports.length,
          soft_violations: softViolations,
          hard_violations: hardViolations,
          largest_files: largest,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    process.stdout.write('N1Hub file guardrails\n');
    process.stdout.write(`targets: ${resolvedTargets.join(', ')}\n`);
    process.stdout.write(`soft limit: ${softLimit} lines\n`);
    process.stdout.write(`hard limit: ${hardLimit} lines\n`);
    process.stdout.write(`scanned files: ${reports.length}\n`);
    process.stdout.write(`soft violations: ${softViolations.length}\n`);
    process.stdout.write(`hard violations: ${hardViolations.length}\n`);

    if (largest.length > 0) {
      process.stdout.write('largest files:\n');
      for (const report of largest) {
        process.stdout.write(`- ${report.path}: ${report.lines} (${report.level})\n`);
      }
    }
  }

  const shouldFail =
    (failOnHard && hardViolations.length > 0) ||
    (failOnSoft && (softViolations.length > 0 || hardViolations.length > 0));

  process.exitCode = shouldFail ? 1 : 0;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'File guardrail audit failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
