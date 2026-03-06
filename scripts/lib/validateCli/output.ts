import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import type { FileValidationResult, ValidationSummary } from './types';

export function summarize(
  results: FileValidationResult[],
  strict: boolean,
): ValidationSummary {
  const passed = results.filter((result) => result.valid).length;
  const failed = results.filter((result) => !result.valid).length;
  const warnings = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const strictFailures = strict
    ? results.filter((result) => result.warnings.length > 0).length
    : 0;

  return {
    total: results.length,
    passed,
    failed,
    warnings,
    strictFailures,
  };
}

export function printPretty(
  results: FileValidationResult[],
  strict: boolean,
  verbose: boolean,
): void {
  for (const result of results) {
    const label = result.valid ? (result.warnings.length > 0 ? 'WARN' : 'PASS') : 'FAIL';
    const statusText =
      label === 'PASS'
        ? chalk.green(`✅ ${label}`)
        : label === 'WARN'
          ? chalk.yellow(`⚠️  ${label}`)
          : chalk.red(`❌ ${label}`);

    process.stdout.write(`${statusText} ${result.file}\n`);

    if (result.fixed) {
      process.stdout.write(chalk.cyan('   ↳ applied auto-fix and rewrote file\n'));
    }

    if (verbose || !result.valid) {
      for (const issue of result.errors) {
        process.stdout.write(chalk.red(`   [${issue.gate}] ${issue.path} ${issue.message}\n`));
      }
      for (const issue of result.warnings) {
        process.stdout.write(chalk.yellow(`   [${issue.gate}] ${issue.path} ${issue.message}\n`));
      }
    }
  }

  const summary = summarize(results, strict);
  process.stdout.write('\n');
  process.stdout.write(chalk.bold(`Total: ${summary.total}  `));
  process.stdout.write(chalk.green(`Passed: ${summary.passed}  `));
  process.stdout.write(chalk.red(`Failed: ${summary.failed}  `));
  process.stdout.write(chalk.yellow(`Warnings: ${summary.warnings}`));
  process.stdout.write('\n');

  if (strict && summary.strictFailures > 0) {
    process.stdout.write(
      chalk.red(`Strict mode: ${summary.strictFailures} file(s) have warnings and are treated as failures.\n`),
    );
  }
}

export function resultsToHtml(results: FileValidationResult[]): string {
  const rows = results
    .map((result) => {
      const status = result.valid ? (result.warnings.length > 0 ? 'WARN' : 'PASS') : 'FAIL';
      const issues = [...result.errors, ...result.warnings]
        .map((issue) => `${issue.gate}: ${issue.message}`)
        .join('<br/>');

      return `<tr><td>${status}</td><td>${result.file}</td><td>${result.capsuleId ?? ''}</td><td>${issues}</td></tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Capsule Validation Report</title></head><body><table border="1" cellspacing="0" cellpadding="8"><thead><tr><th>Status</th><th>File</th><th>Capsule ID</th><th>Issues</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

export function resultsToMarkdown(results: FileValidationResult[]): string {
  const summary = summarize(results, false);
  const lines: string[] = [];

  lines.push('# Capsule Validation Report');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push(`- Warnings: ${summary.warnings}`);
  lines.push('');
  lines.push('| Status | File | Capsule ID | Errors | Warnings |');
  lines.push('|---|---|---|---:|---:|');

  for (const result of results) {
    const status = result.valid ? (result.warnings.length > 0 ? 'WARN' : 'PASS') : 'FAIL';
    lines.push(
      `| ${status} | ${result.file} | ${result.capsuleId ?? ''} | ${result.errors.length} | ${result.warnings.length} |`,
    );
  }

  lines.push('');
  for (const result of results) {
    if (result.errors.length === 0 && result.warnings.length === 0) continue;
    lines.push(`## ${result.file}`);
    lines.push('');

    for (const issue of result.errors) {
      lines.push(`- ❌ ${issue.gate} ${issue.path}: ${issue.message}`);
    }
    for (const issue of result.warnings) {
      lines.push(`- ⚠️ ${issue.gate} ${issue.path}: ${issue.message}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

export async function writeOutputFile(
  outputPath: string,
  format: 'json' | 'pretty' | 'html',
  results: FileValidationResult[],
): Promise<void> {
  const payload =
    format === 'html' ? resultsToHtml(results) : JSON.stringify(results, null, 2);
  await fs.writeFile(outputPath, payload, 'utf-8');
}

export async function writeMarkdownReport(results: FileValidationResult[]): Promise<string> {
  const reportPath = path.join(
    process.cwd(),
    'reports',
    `validation-${new Date().toISOString().replace(/[:.]/g, '-')}.md`,
  );
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, resultsToMarkdown(results), 'utf-8');
  return reportPath;
}

export function printFormattedResults(
  results: FileValidationResult[],
  format: 'json' | 'pretty' | 'html',
  strict: boolean,
  verbose: boolean,
): void {
  if (format === 'pretty') {
    printPretty(results, strict, verbose);
    return;
  }

  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${resultsToHtml(results)}\n`);
}
