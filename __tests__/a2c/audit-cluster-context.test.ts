// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';
import { auditVault } from '@/lib/a2c/audit';
import { analyzeTypescriptClusterContext } from '@/lib/a2c/clusterContext';
import { autoFixCapsule } from '@/lib/validator';

const createdRoots: string[] = [];

const capsuleFixture = (id: string) =>
  autoFixCapsule({
    metadata: {
      capsule_id: id,
      type: 'concept',
      subtype: 'atomic',
      status: 'active',
      version: '1.0.0',
      author: 'Test Harness',
      created_at: '2026-03-10T00:00:00.000Z',
      updated_at: '2026-03-10T00:00:00.000Z',
      name: id,
      semantic_hash: `${id}-semantic-proof-chain`,
      source: {
        uri: `https://example.com/${id}`,
        type: 'test-fixture',
      },
    },
    core_payload: {
      content_type: 'markdown',
      content: `# ${id}\n\nRuntime audit fixture.\n`,
    },
    neuro_concentrate: {
      summary: 'Runtime audit fixture summary long enough for validator checks and deterministic test coverage.',
      confidence_vector: {
        extraction: 0.99,
        synthesis: 0.98,
        linking: 0.97,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0.02,
      },
      keywords: ['a2c', 'audit', 'cluster', 'coverage'],
      semantic_hash: `${id}-semantic-proof-chain`,
    },
    recursive_layer: {
      links: [],
    },
    integrity_sha3_512: '',
  }).fixedData;

const writeFile = async (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
};

const createWorkspace = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-wave2-'));
  createdRoots.push(root);
  const layout = await ensureRuntimeLayout(root, true);
  await writeFile(
    root,
    'package.json',
    `${JSON.stringify({ name: 'n1hub-a2c-wave2-fixture', version: '0.0.0' }, null, 2)}\n`,
  );
  return { root, layout };
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('A2C audit and cluster context contracts', () => {
  it('flags stale index geometry when live vault capsules are missing from the index', async () => {
    const { root, layout } = await createWorkspace();

    await writeFile(
      root,
      'data/capsules/capsule.test.audit.one.v1.json',
      `${JSON.stringify(capsuleFixture('capsule.test.audit.one.v1'), null, 2)}\n`,
    );
    await writeFile(
      root,
      'data/capsules/capsule.test.audit.two.v1.json',
      `${JSON.stringify(capsuleFixture('capsule.test.audit.two.v1'), null, 2)}\n`,
    );
    await writeFile(
      root,
      path.relative(root, layout.indexPath),
      `${JSON.stringify(
        {
          graph: {
            project: 'Temporary Runtime Index',
            version: '1.0.0',
            generated_at: '2026-03-10T00:00:00.000Z',
            nodes: [
              {
                id: 'capsule.test.audit.one.v1',
                file: 'data/capsules/capsule.test.audit.one.v1.json',
                type: 'concept',
                status: 'active',
                title: 'capsule.test.audit.one.v1',
                summary: 'Audit fixture',
                keywords: ['a2c'],
                entities: [],
                tags: [],
                updated_at: '2026-03-10T00:00:00.000Z',
                confidence_vector: {
                  extraction: 0.99,
                  synthesis: 0.98,
                  linking: 0.97,
                  provenance_coverage: 1,
                  validation_score: 1,
                  contradiction_pressure: 0.02,
                },
              },
            ],
            edges: [],
            metrics: {
              total_nodes: 1,
              total_edges: 0,
              graph_density: 0,
              average_system_confidence: 1,
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const report = await auditVault(root);

    expect(report.metrics.total).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: layout.indexPath,
          gate: 'INDEX_FRESHNESS',
        }),
      ]),
    );
    expect(report.issues.some((issue) => issue.issue.includes('capsule.test.audit.two.v1'))).toBe(true);
  });

  it('limits cluster-context scanning to A2C-owned source, docs, and tests', async () => {
    const { root } = await createWorkspace();

    await writeFile(root, 'lib/a2c/query.ts', 'export const queryVault = () => "query";\n');
    await writeFile(root, 'lib/a2c/audit.ts', 'export const auditVault = () => "audit";\n');
    await writeFile(root, 'lib/unrelated.ts', 'export const unrelated = () => "outside";\n');
    await writeFile(root, 'docs/a2c.md', '# A2C Runtime\n\ncoverage and readiness.\n');
    await writeFile(root, 'docs/a2c/protocols/query-cluster.md', '# Query Cluster\n\ncoverage threshold\n');
    await writeFile(root, 'docs/other.md', '# Other\n\noutside A2C scope.\n');
    await writeFile(
      root,
      '__tests__/a2c/query.test.ts',
      "import { describe, it } from 'vitest'\n\ndescribe('a2c query', () => {\n  it('coverage for a2c query', () => {})\n})\n",
    );
    await writeFile(
      root,
      '__tests__/api/diff.test.ts',
      "import { describe, it } from 'vitest'\n\ndescribe('api diff', () => {\n  it('outside a2c scope', () => {})\n})\n",
    );

    const context = await analyzeTypescriptClusterContext(root);
    const sourceFiles = context.sourceClusters.map((entry) => path.relative(root, entry.source));
    const docFiles = context.docClusters.map((entry) => path.relative(root, entry.source));
    const testFiles = context.testClusters.map((entry) => path.relative(root, entry.source));

    expect(sourceFiles).toEqual(['lib/a2c/audit.ts', 'lib/a2c/query.ts']);
    expect(docFiles).toEqual(['docs/a2c.md', 'docs/a2c/protocols/query-cluster.md']);
    expect(testFiles).toEqual(['__tests__/a2c/query.test.ts']);
    expect(context.metrics.source_clusters).toBe(2);
    expect(context.metrics.doc_clusters).toBe(2);
    expect(context.metrics.test_clusters).toBe(1);
  });
});
