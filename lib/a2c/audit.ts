import fs from 'fs/promises';
import path from 'path';
import { resolveRuntimeLayout } from './layout';
import { loadIndex, verifyIndexGeometry } from './index';
import { validateCapsule } from '@/lib/validator';
import { listRealCapsulePaths, getExistingCapsuleIds } from '@/lib/capsuleVault';
import { isRecordObject } from '@/lib/validator/utils';
import { isoUtcNow } from './common';
import type { A2CCommandReport } from './types';

export const auditVault = async (kbRoot: string): Promise<{
  metrics: { total: number; valid: number; invalid: number };
  issues: Array<{ file: string; issue: string; gate?: string }>; 
}> => {
  const existing = await getExistingCapsuleIds();
  const files = await listRealCapsulePaths();
  let valid = 0;
  let invalid = 0;
  const issues: Array<{ file: string; issue: string; gate?: string }> = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8').catch(() => '');
    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    if (!isRecordObject(parsed)) {
      invalid += 1;
      issues.push({ file, issue: 'invalid-json' });
      continue;
    }

    const result = await validateCapsule(parsed, { existingIds: existing });
    if (!result.valid) {
      invalid += 1;
      for (const issue of result.errors) {
        issues.push({ file, issue: issue.message, gate: issue.gate });
      }
      continue;
    }
    valid += 1;
  }

  const layout = resolveRuntimeLayout(kbRoot);
  const indexVerification = await verifyIndexGeometry(kbRoot);
  const indexFile = path.join(layout.indexPath);
  const total = valid + invalid;

  return {
    metrics: { total, valid, invalid },
    issues: [
      ...issues,
      ...(indexVerification.error
        ? [{ file: indexFile, issue: indexVerification.error, gate: 'INDEX' }]
        : []),
    ],
  };
};

export const runAudit = async (argv: string[]): Promise<A2CCommandReport> => {
  const kbRoot = process.cwd();
  const expectedDialect = (argv[argv.indexOf('--expected-dialect') + 1] || 'repo_native').toLowerCase();
  const { metrics, issues } = await auditVault(kbRoot);

  return {
    skill_id: 'anything-to-capsules',
    module: 'AUDIT',
    timestamp: isoUtcNow(),
    status: issues.length > 0 ? 'PARTIAL' : 'COMPLETE',
    scope: { kb_root: kbRoot, expected_dialect: expectedDialect },
    metrics,
    results: { issues },
    warnings: issues.slice(0, 4).map((item) => item.issue),
    errors: issues.filter((issue) => issue.gate === 'G16' || issue.gate === 'G04').map((issue) => issue.issue),
    metadata: {
      confidence: issues.length === 0 ? 'HIGH' : 'MEDIUM',
      human_review_required: issues.length > 0,
      self_corrections: 0,
    },
  };
};
