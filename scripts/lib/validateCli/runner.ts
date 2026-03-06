import fs from 'fs/promises';
import process from 'process';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { autoFixCapsule, validateCapsule } from '../../../lib/validator';
import type { ValidationResult, ValidatorOptions } from '../../../lib/validator/types';
import { printFormattedResults, summarize, writeMarkdownReport, writeOutputFile } from './output';
import { extractCapsuleId, listJsonFiles, loadExistingIds, readJson } from './files';
import type { CliOptions, FileValidationResult } from './types';
import { printUsage } from './args';

const DEFAULT_AUTH_TOKEN =
  process.env.N1HUB_AUTH_TOKEN ?? 'n1-authorized-architect-token-777';

async function validateViaRemote(
  capsule: unknown,
  remoteUrl: string,
  options: ValidatorOptions,
): Promise<ValidationResult> {
  const response = await fetch(remoteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEFAULT_AUTH_TOKEN}`,
      'x-n1-role': 'owner',
    },
    body: JSON.stringify({ capsule, options }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remote validation failed (${response.status}): ${text}`);
  }

  return (await response.json()) as ValidationResult;
}

async function validateFile(
  filePath: string,
  options: CliOptions,
  existingIds: Set<string>,
): Promise<FileValidationResult> {
  const capsule = await readJson(filePath);
  const capsuleId = extractCapsuleId(capsule);

  const validatorOptions: ValidatorOptions = {
    existingIds,
    skipG16: options.skipG16,
  };

  let result = options.remote
    ? await validateViaRemote(capsule, options.remote, validatorOptions)
    : await validateCapsule(capsule, validatorOptions);

  let fixed = false;

  if (options.fix && !options.remote && !result.valid) {
    const fixedCapsule = autoFixCapsule(capsule);
    if (fixedCapsule.appliedFixes.length > 0) {
      await fs.writeFile(filePath, JSON.stringify(fixedCapsule.fixedData, null, 2), 'utf-8');
      fixed = true;
      result = await validateCapsule(fixedCapsule.fixedData, validatorOptions);
    }
  }

  return {
    file: filePath,
    capsuleId,
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    computedHash: result.computedHash,
    fixed,
  };
}

export async function runOnce(
  options: CliOptions,
): Promise<{ results: FileValidationResult[]; exitCode: number }> {
  const targetPath = options.dir ?? options.inputPath;
  if (!targetPath) {
    printUsage();
    return { results: [], exitCode: 1 };
  }

  const files = await listJsonFiles(targetPath);
  const existingIds = await loadExistingIds(files, options.idsFile);
  const results: FileValidationResult[] = [];

  for (const file of files) {
    try {
      results.push(await validateFile(file, options, existingIds));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Validation failed unexpectedly';
      results.push({
        file,
        capsuleId: null,
        valid: false,
        errors: [{ gate: 'CLI', path: '$', message }],
        warnings: [],
        fixed: false,
      });
    }
  }

  printFormattedResults(results, options.format, options.strict, options.verbose);

  if (options.output) {
    await writeOutputFile(options.output, options.format, results);
  }

  if (options.report) {
    const reportPath = await writeMarkdownReport(results);
    process.stdout.write(chalk.cyan(`Report written to ${reportPath}\n`));
  }

  const summary = summarize(results, options.strict);
  const hasFailures = summary.failed > 0 || (options.strict && summary.strictFailures > 0);

  return {
    results,
    exitCode: hasFailures ? 1 : 0,
  };
}

export async function runWatch(options: CliOptions): Promise<void> {
  const targetPath = options.dir ?? options.inputPath;
  if (!targetPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  process.stdout.write(chalk.cyan(`Watching ${targetPath} for capsule changes...\n`));

  const watcher = chokidar.watch(targetPath, {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
  });

  let timer: NodeJS.Timeout | null = null;

  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      process.stdout.write(chalk.gray(`\n[${new Date().toISOString()}] Revalidating...\n`));
      const { exitCode } = await runOnce({ ...options, watch: false });
      process.exitCode = exitCode;
    }, 200);
  };

  watcher.on('add', trigger);
  watcher.on('change', trigger);
  watcher.on('unlink', trigger);

  process.on('SIGINT', async () => {
    await watcher.close();
    process.exit(0);
  });
}
