#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { parseBranchFilename } from '../lib/capsuleVault';
import { appendValidationLog } from '../lib/validationLog';
import { autoFixCapsule, validateCapsule } from '../lib/validator';
import type { ValidationIssue } from '../lib/validator/types';
import { isRecordObject } from '../lib/validator/utils';

interface AuditOptions {
  dir: string;
  fix: boolean;
  skipG16: boolean;
}

const parseArgs = (argv: string[]): AuditOptions => {
  const options: AuditOptions = {
    dir: path.join(process.cwd(), 'data/capsules'),
    fix: false,
    skipG16: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') {
      options.dir = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--fix') {
      options.fix = true;
      continue;
    }
    if (arg === '--skip-g16') {
      options.skipG16 = true;
    }
  }

  return options;
};

const extractCapsuleId = (capsule: unknown): string | null => {
  if (!isRecordObject(capsule)) return null;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || typeof metadata.capsule_id !== 'string') return null;
  return metadata.capsule_id;
};

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const files = (await fs.readdir(options.dir))
    .filter((file) => {
      const parsed = parseBranchFilename(file);
      return parsed?.branch === 'real' && !parsed.isTombstone;
    })
    .map((file) => path.join(options.dir, file));

  const existingIds = new Set<string>();
  for (const file of files) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf-8')) as unknown;
      const id = extractCapsuleId(parsed);
      if (id) existingIds.add(id);
    } catch {
      // Ignore malformed files in ID pre-pass.
    }
  }

  let passed = 0;
  let failed = 0;
  let fixedCount = 0;
  const criticalFindings: Array<{ file: string; issues: ValidationIssue[] }> = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    let capsule = JSON.parse(raw) as unknown;

    let result = await validateCapsule(capsule, {
      existingIds,
      skipG16: options.skipG16,
    });

    if (options.fix && !result.valid && result.errors.every((issue) => isFixableGate(issue.gate))) {
      const fixed = autoFixCapsule(capsule);
      if (fixed.appliedFixes.length > 0) {
        capsule = fixed.fixedData;
        await fs.writeFile(file, JSON.stringify(capsule, null, 2), 'utf-8');
        fixedCount += 1;
        result = await validateCapsule(capsule, {
          existingIds,
          skipG16: options.skipG16,
        });
      }
    }

    const capsuleId = extractCapsuleId(capsule);
    await appendValidationLog({
      capsule_id: capsuleId,
      source: 'audit',
      success: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });

    if (result.valid) passed += 1;
    else failed += 1;

    const critical = result.errors.filter((issue) => issue.gate === 'G04' || issue.gate === 'G16');
    if (critical.length > 0) {
      criticalFindings.push({ file, issues: critical });
    }
  }

  process.stdout.write(`Audit completed. Total=${files.length} Passed=${passed} Failed=${failed} Fixed=${fixedCount}\n`);

  if (criticalFindings.length > 0) {
    process.stderr.write(`Critical validation findings detected: ${criticalFindings.length}\n`);
    for (const finding of criticalFindings) {
      process.stderr.write(`- ${finding.file}\n`);
      for (const issue of finding.issues) {
        process.stderr.write(`  - ${issue.gate} ${issue.path}: ${issue.message}\n`);
      }
    }
    process.exitCode = 2;
    return;
  }

  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Audit failed unexpectedly';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
