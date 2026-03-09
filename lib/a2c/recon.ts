// @anchor flow:a2c.workspace-recon links=arch:a2c.runtime,doc:a2c.reference,doc:n1hub.low-blast-radius-architecture,doc:governance.patterns note="Workspace recon flow that inspects repo shape, governance scripts, and runtime readiness."
import fs from 'fs/promises';
import path from 'path';
import { resolveRuntimeLayout, isN1HubRepo } from './layout';
import { analyzeTypescriptClusterContext } from './clusterContext';
import { isoUtcNow } from './common';
import { SKILL_ID } from './common';
import type { A2CCommandReport } from './types';

const KEY_GOVERNANCE_SCRIPTS = [
  'validate',
  'validate:all',
  'audit:capsules',
  'test',
  'build',
  'vault-steward',
  'ninfinity',
  'symphony',
];

const CORE_INSTRUCTION_SURFACE_FILES = [
  'README.md',
  'AGENTS.md',
  'CODEX.md',
  'SOUL.md',
  'TOOLS.md',
  'WORKFLOW.md',
  'NINFINITY_WORKFLOW.md',
] as const;

const CORE_ARCHITECTURE_DOCTRINE_FILES = [
  'docs/ANCHORS_SPEC.md',
  'docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md',
  'docs/validator.md',
  'docs/a2c.md',
  'docs/symphony.md',
  'docs/ninfinity.md',
] as const;

const MANDATORY_N1_DOCS = [
  'README.md',
  'AGENTS.md',
  'CODEX.md',
  'docs/validator.md',
  'docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md',
  'docs/ninfinity.md',
  'app/api/a2c/ingest/route.ts',
];

interface SurfaceReadiness {
  total: number;
  present: number;
  coverage_ratio: number;
  missing: string[];
  files: Record<string, boolean>;
}

export const detectWorkspaceMode = async (
  workspaceRoot: string,
  kbRoot: string | null,
): Promise<{ mode: string; hasN1HubGovernance: boolean }> => {
  const root = path.resolve(workspaceRoot);
  const hasN1Docs = await Promise.all(MANDATORY_N1_DOCS.map((relative) => fs.access(path.join(root, relative)).then(() => true).catch(() => false)))
    .then((values) => values.every(Boolean));
  const hasGovernance = ((await hasPackageJson(root)) && hasN1Docs) || isN1HubRepo(root);
  const mode = hasGovernance ? 'n1hub_repo' : 'unknown';
  return { mode, hasN1HubGovernance: hasGovernance };
};

const hasPackageJson = async (root: string): Promise<boolean> => {
  try {
    await fs.access(path.join(root, 'package.json'));
    return true;
  } catch {
    return false;
  }
};

const detectSurfaceReadiness = async (
  root: string,
  files: readonly string[],
): Promise<SurfaceReadiness> => {
  const entries = await Promise.all(
    files.map(async (relative) => {
      const present = await fs.access(path.join(root, relative)).then(() => true).catch(() => false);
      return [relative, present] as const;
    }),
  );
  const fileMap = Object.fromEntries(entries);
  const present = entries.filter(([, value]) => value).length;
  const missing = entries.filter(([, value]) => !value).map(([relative]) => relative);
  return {
    total: files.length,
    present,
    coverage_ratio: files.length === 0 ? 1 : present / files.length,
    missing,
    files: fileMap,
  };
};

const detectGovernanceScripts = async (root: string): Promise<Record<string, boolean>> => {
  try {
    const packagePayload = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    const scripts = packagePayload?.scripts ?? {};
    const result: Record<string, boolean> = {};
    for (const key of KEY_GOVERNANCE_SCRIPTS) {
      result[key] = typeof scripts[key] === 'string' && scripts[key].trim().length > 0;
    }
    return result;
  } catch {
    const fallback = Object.create(null) as Record<string, boolean>;
    for (const key of KEY_GOVERNANCE_SCRIPTS) fallback[key] = false;
    return fallback;
  }
};

const scanTopLevelInventory = async (workspaceRoot: string): Promise<Array<Record<string, unknown>>> => {
  const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
  const out: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '.next' || entry.name === '__pycache__') continue;
    if (entry.isDirectory()) {
      out.push({ name: entry.name, kind: 'dir' });
    } else {
      out.push({ name: entry.name, kind: 'file' });
    }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
};

const detectKbState = async (kbRoot: string | null): Promise<Record<string, unknown>> => {
  if (!kbRoot) return { present: false };
  const layout = resolveRuntimeLayout(kbRoot);
  const files = await fs.readdir(layout.vaultDir).catch(() => [] as string[]);
  const contractCounts = { recursive_layer: 0, recursive: 0, unknown: 0 };

  for (const file of files.filter((name) => name.endsWith('.json') && !name.includes('@'))) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(layout.vaultDir, file), 'utf-8')) as Record<string, unknown>;
      const hasRecursiveLayer = typeof parsed.recursive_layer === 'object' && parsed.recursive_layer !== null;
      const hasRecursive = typeof parsed.recursive === 'object' && parsed.recursive !== null;
      if (hasRecursiveLayer && !hasRecursive) contractCounts.recursive_layer += 1;
      else if (hasRecursive && !hasRecursiveLayer) contractCounts.recursive += 1;
      else contractCounts.unknown += 1;
    } catch {
      contractCounts.unknown += 1;
    }
  }

  return {
    present: true,
    kb_root: kbRoot,
    layout_mode: layout.mode,
    vault_dir: layout.vaultDir,
    index_path: layout.indexPath,
    reports_dir: layout.reportsDir,
    vault_capsules: files.filter((file) => file.endsWith('.json') && !file.includes('@')).length,
    vault_contract_counts: contractCounts,
    mixed_recursive_shapes: contractCounts.recursive_layer > 0 && contractCounts.recursive > 0,
    index_present: false,
    pipeline_present: false,
    tasks_dir_present: false,
    plan_present: false,
  };
};

const recommendedActions = async (
  mode: { mode: string; hasN1HubGovernance: boolean },
  governance: Record<string, boolean>,
  cluster: { metrics: { triad_clusters: number; triad_coverage_ratio: number } },
  instructionReadiness: SurfaceReadiness,
  doctrineReadiness: SurfaceReadiness,
) => {
  const out: string[] = [];
  if (mode.mode === 'n1hub_repo') {
    const missing = Object.entries(governance).filter(([, enabled]) => !enabled).map(([key]) => key);
    if (missing.length > 0) out.push(`governance command gap detected: ${missing.join(', ')}`);
    else out.push('run repo-native validate -> audit -> rebuild loop after mutations');
    out.push('prefer data/private/a2c tasks and reports/a2c artifacts for staged ingestion');
  }
  if (instructionReadiness.missing.length > 0) {
    out.push(`load missing instruction surfaces before mutation: ${instructionReadiness.missing.join(', ')}`);
  }
  if (doctrineReadiness.missing.length > 0) {
    out.push(`restore doctrine surfaces before deep mutation: ${doctrineReadiness.missing.join(', ')}`);
  }
  if (!mode.hasN1HubGovernance) {
    out.push('point --workspace-root and --kb-root at the N1Hub repository root before mutation');
  }
  if (cluster.metrics.triad_clusters > 0 && cluster.metrics.triad_coverage_ratio < 0.9) {
    out.push('typescript triad coverage below target; inspect docs and tests clusters');
  }
  return out;
};

export const buildWorkspaceReport = async (
  workspaceRoot: string,
  kbRoot: string | null,
): Promise<Record<string, unknown>> => {
  const mode = await detectWorkspaceMode(workspaceRoot, kbRoot);
  const kbState = await detectKbState(kbRoot);
  const scripts = await detectGovernanceScripts(workspaceRoot);
  const cluster = await analyzeTypescriptClusterContext(workspaceRoot);
  const instructionReadiness = await detectSurfaceReadiness(
    workspaceRoot,
    CORE_INSTRUCTION_SURFACE_FILES,
  );
  const doctrineReadiness = await detectSurfaceReadiness(
    workspaceRoot,
    CORE_ARCHITECTURE_DOCTRINE_FILES,
  );
  const inventory = await scanTopLevelInventory(workspaceRoot);
  const actions = await recommendedActions(
    mode,
    scripts,
    { metrics: cluster.metrics },
    instructionReadiness,
    doctrineReadiness,
  );
  return {
    workspace: mode,
    top_level_inventory: inventory,
    kb_state: kbState,
    typescript_cluster_context: { metrics: cluster.metrics },
    instruction_surface_readiness: {
      instruction_stack: instructionReadiness,
      architecture_doctrine: doctrineReadiness,
    },
    governance_scripts: scripts,
    recommended_actions: actions,
    timestamp: isoUtcNow(),
  };
};

export const runRecon = async (workspaceRoot: string, kbRootArg?: string): Promise<A2CCommandReport> => {
  const kbRoot = kbRootArg ? path.resolve(kbRootArg) : path.resolve(process.cwd());
  const report = await buildWorkspaceReport(workspaceRoot, kbRoot);
  const cluster = (report as { typescript_cluster_context?: { metrics?: { triad_clusters?: number; triad_coverage_ratio?: number } } }).typescript_cluster_context;
  const moduleData = {
    skill_id: SKILL_ID,
    module: 'RECON',
    timestamp: isoUtcNow(),
    status: 'COMPLETE',
    scope: { workspace_root: path.resolve(workspaceRoot), kb_root: kbRoot },
    metrics: {
      triad_clusters: Number(cluster?.metrics?.triad_clusters),
      triad_ratio: Number(cluster?.metrics?.triad_coverage_ratio),
      inventory_count: Array.isArray(report.top_level_inventory) ? report.top_level_inventory.length : 0,
      instruction_stack_ratio: Number(
        (
          report as {
            instruction_surface_readiness?: { instruction_stack?: { coverage_ratio?: number } };
          }
        ).instruction_surface_readiness?.instruction_stack?.coverage_ratio ?? 0,
      ),
      doctrine_ratio: Number(
        (
          report as {
            instruction_surface_readiness?: { architecture_doctrine?: { coverage_ratio?: number } };
          }
        ).instruction_surface_readiness?.architecture_doctrine?.coverage_ratio ?? 0,
      ),
    },
    results: report as unknown as Record<string, unknown>,
    warnings: [],
    errors: [],
    metadata: {
      confidence: 'HIGH',
      human_review_required: false,
      self_corrections: 0,
    },
  } as A2CCommandReport;
  return moduleData;
};
