// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { runAutonomousCycle } from '@/lib/a2c/autonomous';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';

const createdRoots: string[] = [];
const originalCwd = process.cwd();

const exists = async (filePath: string) =>
  fs.access(filePath).then(() => true).catch(() => false);

const writeFile = async (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
};

const validCapsuleFixture = {
  metadata: {
    capsule_id: 'capsule.test.autonomous.v1',
    type: 'concept',
    subtype: 'atomic',
    status: 'active',
    version: '1.0.0',
    author: 'Test Harness',
    created_at: '2026-03-05T00:00:00.000Z',
    semantic_hash: 'capsuleos-validator-gate-model-quality-trace-proof-chain',
    source: {
      uri: 'https://example.com/capsule/test/valid',
      type: 'test-fixture',
    },
  },
  core_payload: {
    content_type: 'markdown',
    content:
      '# Autonomous Fixture\n\nThis capsule is intentionally well formed so A2C dry-run behavior can be tested without validator noise.',
  },
  neuro_concentrate: {
    summary:
      'CapsuleOS validation is a gate-based integrity discipline that ensures each capsule remains structurally coherent, semantically aligned, and traceable inside the sovereign graph. This fixture exists to test runtime checks across metadata, payload, neuro concentrate quality, recursive links, and cryptographic sealing. It intentionally uses explicit provenance, canonical relation types, and realistic confidence dimensions so validators can verify boundaries, parity, and deterministic hashing behavior under practical editor, API, batch, and audit workflows without brittle assumptions.',
    confidence_vector: {
      extraction: 0.99,
      synthesis: 0.97,
      linking: 0.96,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.08,
    },
    keywords: [
      'capsuleos',
      'validator',
      'integrity',
      'confidence-vector',
      'gate-model',
      'sovereign-graph',
    ],
    semantic_hash: 'capsuleos-validator-gate-model-quality-trace-proof-chain',
  },
  recursive_layer: {
    links: [
      {
        target_id: 'capsule.foundation.capsuleos.v1',
        relation_type: 'references',
      },
    ],
  },
  integrity_sha3_512:
    '6d8db0533f5748f1df6993077ac4af6283d7771f9a6f76d7d406a9ec41ac77956fb21c8f251d2ae8f4537ecf0c1793a30b625f67b9d9e5cb00f5a3c3a1e6ef63',
};

const createAutonomousWorkspace = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-auto-'));
  createdRoots.push(root);

  await writeFile(
    root,
    'package.json',
    `${JSON.stringify({ name: 'n1hub-a2c-autonomous-fixture', version: '0.0.0' }, null, 2)}\n`,
  );
  await writeFile(
    root,
    'data/capsules/capsule.test.autonomous.v1.json',
    `${JSON.stringify(validCapsuleFixture, null, 2)}\n`,
  );

  const layout = await ensureRuntimeLayout(root);
  const dropzonePath = path.join(layout.intakeDropzoneDir, 'ore.md');
  await fs.writeFile(dropzonePath, '# Settled autonomous ore\n\nThis input should stay non-persistent during dry-run.\n', 'utf-8');
  const settledAt = new Date(Date.now() - 5_000);
  await fs.utimes(dropzonePath, settledAt, settledAt);

  return { root, layout };
};

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('lib/a2c/autonomous', () => {
  it('keeps dry-run cycles non-persistent across index, watcher, manifest, history, and reports', async () => {
    const { root, layout } = await createAutonomousWorkspace();
    process.chdir(root);

    const report = await runAutonomousCycle(['--dry-run']);

    expect(report.status).toBe('PARTIAL');
    expect(report.results.persistence).toEqual({
      index_written: false,
      manifest_written: false,
      history_written: false,
    });
    expect(await exists(layout.indexPath)).toBe(false);
    expect(await exists(layout.queueLedgerPath)).toBe(false);
    expect(await exists(layout.autonomousRunHistoryPath)).toBe(false);
    expect(await exists(path.join(layout.tasksDir, 'autonomous-run.json'))).toBe(false);
    expect(await exists(path.join(layout.reportsDir, 'weaver_report.json'))).toBe(false);
    expect(await exists(path.join(layout.reportsDir, 'WEAVER_REPORT.md'))).toBe(false);
    expect(await fs.readdir(layout.pipelineQuarantineDir)).toHaveLength(0);
    expect(await fs.readdir(layout.pipelineWorkspaceDir)).toHaveLength(0);
  });
});
