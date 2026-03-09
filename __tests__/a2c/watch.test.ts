// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DebouncedDropzoneWatcher, runDaemonWatcher } from '@/lib/a2c/watch';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';

const createdRoots: string[] = [];
const originalCwd = process.cwd();

const exists = async (filePath: string) =>
  fs.access(filePath).then(() => true).catch(() => false);

const createRuntime = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-watch-'));
  createdRoots.push(root);
  const layout = await ensureRuntimeLayout(root);
  return { root, layout };
};

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('lib/a2c/watch', () => {
  it('stages a stable text file into quarantine, workspace, archive, and queue artifacts', async () => {
    const { root, layout } = await createRuntime();
    const inputPath = path.join(layout.intakeDropzoneDir, 'ore.md');
    await fs.writeFile(inputPath, '# Raw ore\n\nAnything to Capsules ore body.\n', 'utf-8');

    const watcher = new DebouncedDropzoneWatcher(
      root,
      layout.intakeDropzoneDir,
      layout.pipelineWorkspaceDir,
      { settleMs: 0 },
    );

    expect(await watcher.scanOnce()).toHaveLength(0);

    const staged = await watcher.scanOnce();
    expect(staged).toHaveLength(1);
    expect(staged[0]?.status).toBe('staged');
    expect(await exists(staged[0]!.draft.draftPath)).toBe(true);

    const workspaceArtifact = path.join(
      layout.pipelineWorkspaceDir,
      `${staged[0]!.draft.draftId}.json`,
    );
    expect(await exists(workspaceArtifact)).toBe(true);

    const archiveItems = await fs.readdir(layout.intakeArchiveRawDir);
    expect(archiveItems).toHaveLength(1);

    const queueLedger = await fs.readFile(layout.queueLedgerPath, 'utf-8');
    expect(queueLedger).toContain('"event":"QUEUED"');
    expect(queueLedger).toContain(staged[0]!.draft.draftId);

    const quarantinedPayload = JSON.parse(
      await fs.readFile(staged[0]!.draft.draftPath, 'utf-8'),
    ) as { source_text_preview?: string };
    expect(quarantinedPayload.source_text_preview).toContain('Anything to Capsules');
  });

  it('ignores non-text files in the dropzone', async () => {
    const { root, layout } = await createRuntime();
    const inputPath = path.join(layout.intakeDropzoneDir, 'binary.bin');
    await fs.writeFile(inputPath, Buffer.from([0, 1, 2, 3]));

    const watcher = new DebouncedDropzoneWatcher(
      root,
      layout.intakeDropzoneDir,
      layout.pipelineWorkspaceDir,
      { settleMs: 0 },
    );

    expect(await watcher.scanOnce()).toHaveLength(0);
    expect(await watcher.scanOnce()).toHaveLength(0);
    expect(await fs.readdir(layout.intakeArchiveRawDir)).toHaveLength(0);
    expect(await fs.readdir(layout.pipelineQuarantineDir)).toHaveLength(0);
  });

  it('supports one-shot dry-run staging without writing runtime artifacts', async () => {
    const { root, layout } = await createRuntime();
    const inputPath = path.join(layout.intakeDropzoneDir, 'one-shot.md');
    await fs.writeFile(inputPath, '# Settled ore\n\nThis file should be visible in a one-shot dry-run.\n', 'utf-8');
    const settledAt = new Date(Date.now() - 5_000);
    await fs.utimes(inputPath, settledAt, settledAt);

    process.chdir(root);
    const result = await runDaemonWatcher(['--once', '--dry-run']);

    expect(result.status).toBe('COMPLETE');
    expect(result.staged).toHaveLength(1);
    expect(await exists(result.staged[0]!.draft.draftPath)).toBe(false);
    expect(
      await exists(
        path.join(layout.pipelineWorkspaceDir, `${result.staged[0]!.draft.draftId}.json`),
      ),
    ).toBe(false);
    expect(await exists(layout.queueLedgerPath)).toBe(false);
    expect(await fs.readdir(layout.intakeArchiveRawDir)).toHaveLength(0);
    expect(await fs.readdir(layout.pipelineQuarantineDir)).toHaveLength(0);
  });
});
