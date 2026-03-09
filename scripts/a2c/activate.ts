#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { runRecon } from '../../lib/a2c/recon';

const REQUIRED_PROTOCOL_PATHS = [
  'docs/a2c.md',
  'docs/a2c/protocols/activation-entry-protocol.md',
  'docs/a2c/protocols/autonomous-agent-protocol.md',
  'scripts/a2c/recon.ts',
  'scripts/a2c/investigate.ts',
  'scripts/a2c/ingest.ts',
  'scripts/a2c/audit.ts',
  'scripts/a2c/index.ts',
];

const parseRootArg = (argv: string[], name: '--workspace-root' | '--kb-root'): string | null => {
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] || null : null;
};

(async () => {
  const argv = process.argv.slice(2);
  const workspaceRoot = parseRootArg(argv, '--workspace-root') || process.cwd();
  const kbRoot = parseRootArg(argv, '--kb-root') || workspaceRoot;
  const requireReady = argv.includes('--require-ready');
  const report = await runRecon(workspaceRoot, kbRoot);
  const results = report.results as {
    workspace?: { mode?: string };
    governance_scripts?: Record<string, boolean>;
  };

  const protocolChecks = await Promise.all(
    REQUIRED_PROTOCOL_PATHS.map(async (relative) => ({
      relative,
      present: await fs
        .access(path.join(workspaceRoot, relative))
        .then(() => true)
        .catch(() => false),
    })),
  );
  const missingProtocolPaths = protocolChecks.filter((entry) => !entry.present).map((entry) => entry.relative);

  const workspaceMode = typeof results.workspace?.mode === 'string' ? results.workspace.mode : 'unknown';
  const governanceScripts = results.governance_scripts ?? {};
  const missingGovernanceScripts = Object.entries(governanceScripts)
    .filter(([, enabled]) => !enabled)
    .map(([name]) => name);
  const ready = workspaceMode !== 'unknown' && missingProtocolPaths.length === 0;

  const activationReport = {
    status: ready ? 'READY' : 'BLOCKED',
    workspace_root: path.resolve(workspaceRoot),
    kb_root: path.resolve(kbRoot),
    workspace_mode: workspaceMode,
    protocol_checks: protocolChecks,
    missing_protocol_paths: missingProtocolPaths,
    missing_governance_scripts: missingGovernanceScripts,
    recon: report,
  };

  if (requireReady) {
    if (!ready) {
      throw new Error(
        `Activation readiness checks did not pass (${[
          workspaceMode === 'unknown' ? 'workspace mode is unknown' : null,
          missingProtocolPaths.length > 0 ? `missing protocol surfaces: ${missingProtocolPaths.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('; ')})`,
      );
    }
  }

  await fs.writeFile(
    path.join(process.cwd(), 'reports', 'a2c', 'activation.json'),
    `${JSON.stringify(activationReport, null, 2)}\n`,
    'utf-8',
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: ready ? 'ready' : 'blocked',
        workspace_root: workspaceRoot,
        kb_root: kbRoot,
        workspace_mode: workspaceMode,
        ready,
        missing_protocol_paths: missingProtocolPaths,
        missing_governance_scripts: missingGovernanceScripts,
      },
      null,
      2,
    )}\n`,
  );
})();
