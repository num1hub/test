import fs from 'fs/promises';
import path from 'path';

interface ExportSummary {
  source: string;
  exports: string[];
  tests: string[];
  invariantHints: string[];
}

interface ClusterContext {
  sourceClusters: ExportSummary[];
  docClusters: ExportSummary[];
  testClusters: ExportSummary[];
  metrics: {
    source_clusters: number;
    doc_clusters: number;
    test_clusters: number;
    triad_clusters: number;
    triad_coverage_ratio: number;
  };
}

const A2C_TEST_FILE_RE = /(a2c|cluster|capsule).*\.test\.(?:ts|tsx)$/i;

const EXPORT_RE = /^(export)\s+(?:type|interface|class|const|function)\s+([A-Za-z_][A-Za-z0-9_]*)/;
const TEST_TITLE_RE = /\b(?:it|test)\(\s*['\"]([^'\"]+)['\"]/;
const DOC_TITLE_RE = /^#\s+(.*\S)\s*$/;
const INVARIANT_HINTS = [
  'determin',
  'reject',
  'validate',
  'detect',
  'coverage',
  'duplicate',
  'citation',
  'pii',
  'conflict',
  'hash',
  'rollout',
  'rollback',
  'readiness',
  'threshold',
];

const readLines = async (filePath: string): Promise<string[]> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return raw.split(/\r?\n/);
  } catch {
    return [];
  }
};

const collectFiles = async (rootDir: string, predicate: (filePath: string) => boolean): Promise<string[]> => {
  const out: string[] = [];

  const walk = async (dirPath: string): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (entry.isFile() && predicate(entryPath)) {
        out.push(entryPath);
      }
    }
  };

  await walk(rootDir);
  return out.sort();
};

const scanExports = (lines: string[]): string[] => {
  const out: string[] = [];
  for (const line of lines) {
    const match = EXPORT_RE.exec(line.trim());
    if (!match) continue;
    out.push(match[2]);
  }
  return [...new Set(out)].sort();
};

const scanTests = (lines: string[]): string[] => {
  const out: string[] = [];
  for (const line of lines) {
    const match = TEST_TITLE_RE.exec(line);
    if (match) out.push(match[1].trim());
  }
  return [...new Set(out)];
};

const invariantHints = (lines: string[]): string[] => {
  const joined = lines.join(' ').toLowerCase();
  return INVARIANT_HINTS.filter((hint) => joined.includes(hint));
};

export const analyzeTypescriptClusterContext = async (workspaceRoot: string): Promise<ClusterContext> => {
  const root = path.resolve(workspaceRoot);
  const srcDir = path.join(root, 'lib');
  const docsDir = path.join(root, 'docs', 'a2c', 'protocols');
  const testsDir = path.join(root, '__tests__');

  const sourceClusters: ExportSummary[] = [];
  const docClusters: ExportSummary[] = [];
  const testClusters: ExportSummary[] = [];

  try {
    const srcEntries = await fs.readdir(srcDir, { withFileTypes: true });
    const tsFiles = srcEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.ts'));
    for (const file of tsFiles.slice(0, 120)) {
      const filePath = path.join(srcDir, file.name);
      const lines = await readLines(filePath);
      sourceClusters.push({
        source: filePath,
        exports: scanExports(lines),
        tests: [],
        invariantHints: invariantHints(lines),
      });
    }
  } catch {
    // allow empty context if scanning unavailable
  }

  try {
    const docEntries = await fs.readdir(docsDir);
    for (const name of docEntries.slice(0, 120)) {
      if (!name.endsWith('-cluster.md')) continue;
      const filePath = path.join(docsDir, name);
      const lines = await readLines(filePath);
      const docLines = lines.slice(1);
      const title = lines.find((line) => DOC_TITLE_RE.test(line)) ?? '';
      const match = title ? DOC_TITLE_RE.exec(title) : null;
      docClusters.push({
        source: match ? match[1].trim() : name,
        exports: [],
        tests: [match ? 'cluster-documentation' : 'cluster'],
        invariantHints: invariantHints(docLines),
      });
    }
  } catch {
    // optional
  }

  try {
    const testFiles = await collectFiles(testsDir, (filePath) => A2C_TEST_FILE_RE.test(path.basename(filePath)));
    for (const filePath of testFiles.slice(0, 80)) {
      const lines = await readLines(filePath);
      testClusters.push({
        source: filePath,
        exports: [],
        tests: scanTests(lines),
        invariantHints: invariantHints(lines),
      });
    }
  } catch {
    // optional
  }

  const triadClusters = testClusters.filter((entry) => entry.invariantHints.some((hint) => hint.includes('coverage'))).length;
  const triadCoverage = sourceClusters.length > 0 ? triadClusters / Math.max(1, sourceClusters.length) : 0;

  return {
    sourceClusters,
    docClusters,
    testClusters,
    metrics: {
      source_clusters: sourceClusters.length,
      doc_clusters: docClusters.length,
      test_clusters: testClusters.length,
      triad_clusters: triadClusters,
      triad_coverage_ratio: Number(triadCoverage.toFixed(3)),
    },
  };
};

export const renderClusterContextMarkdown = (context: ClusterContext): string => {
  const lines = [
    '# TypeScript Cluster Context',
    '',
    `- Source clusters: ${context.metrics.source_clusters}`,
    `- Test clusters: ${context.metrics.test_clusters}`,
    `- Triad clusters: ${context.metrics.triad_clusters}`,
    `- Triad coverage ratio: ${context.metrics.triad_coverage_ratio}`,
    '',
    '## Signals',
    ...context.testClusters.slice(0, 12).map((entry) => `- ${path.basename(entry.source)}`),
    '',
  ];
  return lines.join('\n');
};
