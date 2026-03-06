import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTempDataDir, makeValidCapsule } from './helpers';

describe('merge-engine', () => {
  let dataDir: string;
  const baseSummary =
    'This base summary intentionally contains well over seventy words so the validator keeps the capsule valid during merge tests while still making the assertion readable. It describes a stable baseline capsule, a reference dependency, branch seeding, and a later reconciliation step where the source branch should overwrite the real branch content without damaging link structure, metadata integrity, or version history. The exact prose does not matter beyond being long enough to satisfy the validator and distinct enough to verify merge output cleanly.'
  const sourceSummary =
    'This source summary intentionally contains well over seventy words so the validator keeps the capsule valid during merge tests while still making the assertion readable. It describes a changed branch capsule, a deliberate semantic update, and the expectation that source wins conflict handling will carry this text into the real branch without losing the existing dependency edge, stable capsule identifier, or versioned writeback behavior. The exact prose does not matter beyond being long enough to satisfy the validator and distinct enough to verify merge output cleanly.'

  beforeEach(async () => {
    dataDir = await createTempDataDir();
  });

  it('applies source-wins merges to real using branch base snapshots', async () => {
    const referenceCapsule = await makeValidCapsule('capsule.foundation.capsuleos.v1');
    const realCapsule = await makeValidCapsule('capsule.test.merge.v1', {
      neuro_concentrate: { summary: baseSummary },
    });

    await fs.writeFile(
      path.join(dataDir, 'capsules', 'capsule.foundation.capsuleos.v1.json'),
      JSON.stringify(referenceCapsule, null, 2),
    );
    await fs.writeFile(
      path.join(dataDir, 'capsules', 'capsule.test.merge.v1.json'),
      JSON.stringify(realCapsule, null, 2),
    );

    const branchManager = await import('@/lib/diff/branch-manager');
    await branchManager.createBranch({
      newBranchName: 'experimental-1',
      sourceBranch: 'real',
      scopeType: 'capsule',
      scopeRootId: 'capsule.test.merge.v1',
      capsuleIds: ['capsule.test.merge.v1'],
      recursive: false,
    });

    await branchManager.writeOverlayCapsule(
      await makeValidCapsule('capsule.test.merge.v1', {
        neuro_concentrate: { summary: sourceSummary },
      }),
      'experimental-1',
    );

    const { mergeBranches } = await import('@/lib/diff/merge-engine');
    const result = await mergeBranches({
      sourceBranch: 'experimental-1',
      targetBranch: 'real',
      scopeType: 'capsule',
      scopeRootId: 'capsule.test.merge.v1',
      conflictResolution: 'source-wins',
    });

    const merged = await branchManager.readOverlayCapsule('capsule.test.merge.v1', 'real');

    expect(result.applied).toBe(true);
    expect(merged?.neuro_concentrate.summary).toBe(sourceSummary);
  });
});
