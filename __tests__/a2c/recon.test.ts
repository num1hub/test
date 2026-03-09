// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';
import { buildWorkspaceReport, detectWorkspaceMode, runRecon } from '@/lib/a2c/recon';

const createdRoots: string[] = [];

const INSTRUCTION_FILES = [
  'README.md',
  'AGENTS.md',
  'CODEX.md',
  'SOUL.md',
  'TOOLS.md',
  'WORKFLOW.md',
  'NINFINITY_WORKFLOW.md',
] as const;

const DOCTRINE_FILES = [
  'docs/ANCHORS_SPEC.md',
  'docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md',
  'docs/validator.md',
  'docs/a2c.md',
  'docs/symphony.md',
  'docs/ninfinity.md',
] as const;

const GOVERNANCE_SCRIPTS = [
  'validate',
  'validate:all',
  'audit:capsules',
  'test',
  'build',
  'vault-steward',
  'ninfinity',
  'symphony',
] as const;

const capsuleFixture = {
  metadata: {
    capsule_id: 'capsule.test.runtime.v1',
    type: 'foundation',
    subtype: 'atomic',
    status: 'active',
    version: '1.0.0',
    semantic_hash: 'capsule-runtime-fixture-stable-graph-proof-chain-state',
  },
  core_payload: {
    content_type: 'markdown',
    content: '# Runtime fixture',
  },
  neuro_concentrate: {
    summary:
      'This runtime fixture keeps the A2C recon tests grounded in a real capsule shape with valid recursive geometry and enough explicit structure to report vault state deterministically across temporary workspaces.',
    confidence_vector: {
      extraction: 0.95,
      synthesis: 0.94,
      linking: 0.93,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.06,
    },
    keywords: ['a2c', 'recon', 'runtime', 'workspace', 'doctrine'],
    semantic_hash: 'capsule-runtime-fixture-stable-graph-proof-chain-state',
  },
  recursive_layer: {
    links: [],
  },
  integrity_sha3_512:
    '7b593f2d9d24416523c6e78e30c68eaaf74b0ab3d0ce5b8dbce0494f2274eb1c415c82ae8cb8dfe4800b5c6bb9af4574d11abfe5bfec1dfefe39cf3c0cc8187c',
};

const writeFile = async (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
};

const createWorkspace = async (options: { omit?: string[] } = {}) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-recon-'));
  createdRoots.push(root);
  const omitted = new Set(options.omit ?? []);

  await writeFile(
    root,
    'package.json',
    `${JSON.stringify(
      {
        name: 'n1hub-a2c-recon-fixture',
        version: '0.0.0',
        scripts: Object.fromEntries(GOVERNANCE_SCRIPTS.map((name) => [name, 'echo ok'])),
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    root,
    'data/capsules/capsule.test.runtime.v1.json',
    `${JSON.stringify(capsuleFixture, null, 2)}\n`,
  );

  for (const relativePath of [...INSTRUCTION_FILES, ...DOCTRINE_FILES, 'app/api/a2c/ingest/route.ts']) {
    if (omitted.has(relativePath)) continue;
    const content = relativePath.endsWith('.ts')
      ? 'export {};\n'
      : `# ${path.basename(relativePath)}\n\nTemporary A2C recon fixture.\n`;
    await writeFile(root, relativePath, content);
  }

  return root;
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('lib/a2c/recon', () => {
  it('detects a repo-native workspace and reports complete instruction coverage', async () => {
    const workspaceRoot = await createWorkspace();
    const layout = await ensureRuntimeLayout(workspaceRoot);
    await fs.writeFile(
      layout.indexPath,
      `${JSON.stringify(
        {
          graph: {
            project: 'Temporary Runtime Index',
            version: '1.0.0',
            generated_at: '2026-03-09T00:00:00.000Z',
            nodes: [],
            edges: [],
            metrics: {
              total_nodes: 0,
              total_edges: 0,
              graph_density: 0,
              average_system_confidence: 0,
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf-8',
    );
    await fs.writeFile(layout.defaultPlanPath, '# PLAN\n', 'utf-8');

    const mode = await detectWorkspaceMode(workspaceRoot, workspaceRoot);
    expect(mode).toEqual({
      mode: 'n1hub_repo',
      hasN1HubGovernance: true,
    });

    const report = (await buildWorkspaceReport(workspaceRoot, workspaceRoot)) as {
      kb_state: {
        vault_capsules: number;
        index_present: boolean;
        pipeline_present: boolean;
        tasks_dir_present: boolean;
        plan_present: boolean;
      };
      instruction_surface_readiness: {
        instruction_stack: { coverage_ratio: number; missing: string[] };
        architecture_doctrine: { coverage_ratio: number; missing: string[] };
      };
      governance_scripts: Record<string, boolean>;
    };

    expect(report.kb_state.vault_capsules).toBe(1);
    expect(report.kb_state.index_present).toBe(true);
    expect(report.kb_state.pipeline_present).toBe(true);
    expect(report.kb_state.tasks_dir_present).toBe(true);
    expect(report.kb_state.plan_present).toBe(true);
    expect(report.instruction_surface_readiness.instruction_stack.coverage_ratio).toBe(1);
    expect(report.instruction_surface_readiness.instruction_stack.missing).toEqual([]);
    expect(report.instruction_surface_readiness.architecture_doctrine.coverage_ratio).toBe(1);
    expect(report.instruction_surface_readiness.architecture_doctrine.missing).toEqual([]);
    expect(report.governance_scripts.validate).toBe(true);
    expect(report.governance_scripts.symphony).toBe(true);

    const recon = await runRecon(workspaceRoot, workspaceRoot);
    expect(recon.module).toBe('RECON');
    expect(recon.status).toBe('COMPLETE');
    expect(recon.metrics.instruction_stack_ratio).toBe(1);
    expect(recon.metrics.doctrine_ratio).toBe(1);
  });

  it('surfaces missing doctrine files as explicit readiness gaps', async () => {
    const workspaceRoot = await createWorkspace({ omit: ['docs/a2c.md'] });

    const report = (await buildWorkspaceReport(workspaceRoot, workspaceRoot)) as {
      instruction_surface_readiness: {
        architecture_doctrine: {
          coverage_ratio: number;
          missing: string[];
          files: Record<string, boolean>;
        };
      };
    };

    const doctrine = report.instruction_surface_readiness.architecture_doctrine;
    expect(doctrine.files['docs/a2c.md']).toBe(false);
    expect(doctrine.missing).toContain('docs/a2c.md');
    expect(doctrine.coverage_ratio).toBeLessThan(1);
  });
});
