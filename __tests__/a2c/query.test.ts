// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';
import { queryVault, runQueryCommand } from '@/lib/a2c/query';

const createdRoots: string[] = [];

const exists = async (filePath: string) =>
  fs.access(filePath).then(() => true).catch(() => false);

const writeFile = async (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
};

const capsuleFixture = (id: string, name: string, summary: string, keywords: string[]) => ({
  metadata: {
    capsule_id: id,
    type: 'concept',
    subtype: 'atomic',
    status: 'active',
    version: '1.0.0',
    author: 'Test Harness',
    created_at: '2026-03-10T00:00:00.000Z',
    semantic_hash: `${id}-semantic-proof-chain`,
    source: {
      uri: `https://example.com/${id}`,
      type: 'test-fixture',
    },
    name,
  },
  core_payload: {
    content_type: 'markdown',
    content: `# ${name}\n\n${summary}\n`,
  },
  neuro_concentrate: {
    summary,
    confidence_vector: {
      extraction: 0.99,
      synthesis: 0.97,
      linking: 0.96,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.08,
    },
    keywords,
    claims: [
      `${name} keeps query paths read only by default.`,
      `${name} documents explicit transient synthesis opt in.`,
    ],
    semantic_hash: `${id}-semantic-proof-chain`,
  },
  recursive_layer: {
    links: [],
  },
  integrity_sha3_512:
    '6d8db0533f5748f1df6993077ac4af6283d7771f9a6f76d7d406a9ec41ac77956fb21c8f251d2ae8f4537ecf0c1793a30b625f67b9d9e5cb00f5a3c3a1e6ef63',
});

const createQueryWorkspace = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-query-'));
  createdRoots.push(root);

  await writeFile(
    root,
    'package.json',
    `${JSON.stringify({ name: 'n1hub-a2c-query-fixture', version: '0.0.0' }, null, 2)}\n`,
  );

  const capsules = [
    capsuleFixture(
      'capsule.test.query-safety.v1',
      'A2C Query Safety Contract',
      'A2C query safety keeps retrieval read only by default and turns transient synthesis into an explicit opt in path.',
      ['a2c', 'query', 'safety', 'read-only', 'synthesis'],
    ),
    capsuleFixture(
      'capsule.test.query-cli.v1',
      'A2C Query CLI Opt In',
      'The query CLI should expose a synthesize on fly flag only when the operator explicitly wants transient write behavior.',
      ['a2c', 'query', 'cli', 'opt-in', 'transient'],
    ),
    capsuleFixture(
      'capsule.test.query-investigate.v1',
      'A2C Investigate Read Path',
      'Investigate should stay coherent after the query contract flips to read only by default.',
      ['a2c', 'investigate', 'read-only', 'contract', 'query'],
    ),
  ];

  await Promise.all(
    capsules.map((capsule) =>
      writeFile(
        root,
        `data/capsules/${capsule.metadata.capsule_id}.json`,
        `${JSON.stringify(capsule, null, 2)}\n`,
      ),
    ),
  );

  const layout = await ensureRuntimeLayout(root);
  return { root, layout };
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('lib/a2c/query', () => {
  it('keeps default queries read only even when the index must be rebuilt in memory', async () => {
    const { root, layout } = await createQueryWorkspace();

    const result = await queryVault({
      kbRoot: root,
      query: 'a2c query safety transient synthesis',
      topK: 5,
    });

    expect(result.rows).toHaveLength(3);
    expect(result.synthesis_gate_audit).toBeNull();
    expect(await exists(layout.indexPath)).toBe(false);
    expect(await fs.readdir(layout.pipelineWorkspaceDir)).toHaveLength(0);
    expect(await fs.readdir(layout.pipelineFailedDir)).toHaveLength(0);
  });

  it('only emits transient synthesis when the CLI opt in flag is present', async () => {
    const { root, layout } = await createQueryWorkspace();
    const defaultOut = path.join(root, 'query-default.json');
    const synthOut = path.join(root, 'query-synth.json');

    const defaultReport = await runQueryCommand([
      '--kb-root',
      root,
      '--query',
      'a2c query safety transient synthesis',
      '--json-out',
      defaultOut,
    ]);

    expect(defaultReport.metrics.synthesis_generated).toBe(0);
    expect(await fs.readdir(layout.pipelineWorkspaceDir)).toHaveLength(0);
    expect(await fs.readdir(layout.pipelineFailedDir)).toHaveLength(0);

    const synthReport = await runQueryCommand([
      '--kb-root',
      root,
      '--query',
      'a2c query safety transient synthesis',
      '--synthesize-on-fly',
      '--json-out',
      synthOut,
    ]);
    const synthQuery = synthReport.results.query as { synthesis_gate_audit: unknown };

    expect(synthReport.metrics.synthesis_generated).toBe(1);
    expect(synthQuery.synthesis_gate_audit).not.toBeNull();
    expect(
      (await fs.readdir(layout.pipelineWorkspaceDir)).length +
        (await fs.readdir(layout.pipelineFailedDir)).length,
    ).toBeGreaterThan(0);
    expect(await exists(layout.indexPath)).toBe(false);
  });
});
