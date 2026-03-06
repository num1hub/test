#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '../lib/dataPath';
import {
  getBaseSnapshotPath,
  getCanonicalBranchPath,
  getLegacyDreamPath,
  readBranchManifest,
  writeBranchManifest,
} from '../lib/diff/branch-manager';
import type { BranchManifest } from '../contracts/diff';

const CAPSULES_DIR = dataPath('capsules');
const BRANCHES_DIR = dataPath('branches');

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function backupDirectories(timestamp: string, dryRun: boolean): Promise<string> {
  const backupRoot = dataPath('backups', `branches-migration-${timestamp}`);
  if (dryRun) return backupRoot;

  await fs.mkdir(backupRoot, { recursive: true });
  if (await exists(CAPSULES_DIR)) {
    await fs.cp(CAPSULES_DIR, path.join(backupRoot, 'capsules'), { recursive: true });
  }
  if (await exists(BRANCHES_DIR)) {
    await fs.cp(BRANCHES_DIR, path.join(backupRoot, 'branches'), { recursive: true });
  }
  return backupRoot;
}

async function main() {
  if (!(await exists(CAPSULES_DIR))) {
    process.stdout.write('No data/capsules directory found. Nothing to migrate.\n');
    return;
  }

  const dryRun = hasFlag('--dry-run');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = await backupDirectories(timestamp, dryRun);

  if (dryRun) {
    process.stdout.write(`Dry run. Backup would be created at ${backupDir}\n`);
  } else {
    process.stdout.write(`Backup created at ${backupDir}\n`);
  }

  const files = await fs.readdir(CAPSULES_DIR);
  const legacyDreamFiles = files.filter((file) => file.endsWith('.dream.json')).sort();

  let renamed = 0;
  let skipped = 0;
  let baseSnapshotsCreated = 0;
  const manifestIds = new Set<string>();

  const existingManifest = await readBranchManifest('dream');
  existingManifest?.capsuleIds.forEach((id) => manifestIds.add(id));

  for (const file of legacyDreamFiles) {
    const capsuleId = file.slice(0, -'.dream.json'.length);
    const legacyPath = getLegacyDreamPath(capsuleId);
    const canonicalPath = getCanonicalBranchPath(capsuleId, 'dream');

    if (await exists(canonicalPath)) {
      skipped += 1;
    } else if (!dryRun) {
      await fs.rename(legacyPath, canonicalPath);
      renamed += 1;
    } else {
      renamed += 1;
    }

    manifestIds.add(capsuleId);

    const basePath = getBaseSnapshotPath(capsuleId, 'dream');
    if (!(await exists(basePath))) {
      const sourcePath = (await exists(canonicalPath)) || dryRun ? canonicalPath : getCanonicalBranchPath(capsuleId, 'dream');
      const payload = JSON.parse(await fs.readFile(await exists(canonicalPath) ? canonicalPath : legacyPath, 'utf-8')) as Record<string, unknown>;
      const basePayload = {
        ...payload,
        _branch_base: {
          approximate: true,
          migratedAt: new Date().toISOString(),
        },
      };

      if (!dryRun) {
        await fs.mkdir(path.dirname(basePath), { recursive: true });
        await fs.writeFile(basePath, JSON.stringify(basePayload, null, 2), 'utf-8');
      }
      void sourcePath;
      baseSnapshotsCreated += 1;
    }
  }

  const manifest: BranchManifest = {
    name: 'dream',
    sourceBranch: 'real',
    sourceProjectId: existingManifest?.sourceProjectId ?? null,
    capsuleIds: [...manifestIds].sort((left, right) => left.localeCompare(right)),
    createdAt: existingManifest?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(existingManifest?.description ? { description: existingManifest.description } : {}),
    ...(existingManifest?.archived ? { archived: existingManifest.archived } : {}),
  };

  if (!dryRun) {
    await writeBranchManifest(manifest);
  }

  process.stdout.write(`Found:    ${legacyDreamFiles.length} legacy dream files\n`);
  process.stdout.write(`Renamed:  ${renamed}\n`);
  process.stdout.write(`Skipped:  ${skipped}\n`);
  process.stdout.write(`Manifest: ${existingManifest ? 'updated' : 'created'}\n`);
  process.stdout.write(`Base snapshots: ${baseSnapshotsCreated} created\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Branch migration failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
