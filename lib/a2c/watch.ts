import fs from 'fs/promises';
import path from 'path';
import { ensureRuntimeLayout, resolveRuntimeLayout } from './layout';
import { isoUtcNow, isTextFileExtension, computeHash, redactedText } from './common';
import type { IngestAttempt } from './types';

interface WatchState {
  lastSize: number;
  lastMtimeMs: number;
  observedAt: number;
}

export class DebouncedDropzoneWatcher {
  private observed = new Map<string, WatchState>();
  private readonly settleMs: number;

  constructor(
    private readonly pipelineRoot: string,
    private readonly dropzoneDir: string,
    private readonly reportArtifactDir: string,
    options: { settleMs?: number } = {},
  ) {
    this.settleMs = options.settleMs ?? 700;
  }

  private isStable(item: WatchState, currentSize: number, currentMtimeMs: number): boolean {
    const age = Date.now() - item.observedAt;
    const sizeStable = item.lastSize === currentSize;
    const mtimeStable = item.lastMtimeMs === currentMtimeMs;
    return age >= this.settleMs && sizeStable && mtimeStable;
  }

  async scanOnce(): Promise<IngestAttempt[]> {
    const layout = resolveRuntimeLayout(this.pipelineRoot);
    await ensureRuntimeLayout(this.pipelineRoot);
    const candidates: string[] = [];

    const files = await fs.readdir(this.dropzoneDir).catch(() => [] as string[]);
    for (const file of files) {
      const candidatePath = path.join(this.dropzoneDir, file);
      if (!(await this.isFile(candidatePath))) continue;
      if (!isTextFileExtension(candidatePath)) continue;
      candidates.push(candidatePath);
    }

    const ready: IngestAttempt[] = [];
    for (const inputPath of candidates) {
      try {
        const stat = await fs.stat(inputPath);
        const previous = this.observed.get(inputPath);
        const now = Date.now();

        if (!previous) {
          this.observed.set(inputPath, {
            lastSize: stat.size,
            lastMtimeMs: stat.mtimeMs,
            observedAt: now,
          });
          continue;
        }

        if (!this.isStable(previous, stat.size, stat.mtimeMs)) {
          this.observed.set(inputPath, {
            lastSize: stat.size,
            lastMtimeMs: stat.mtimeMs,
            observedAt: now,
          });
          continue;
        }

        const payload = await this.processReadyFile(inputPath, layout).catch(() => null);
        this.observed.delete(inputPath);
        if (payload) ready.push(payload);
      } catch {
        this.observed.delete(inputPath);
      }
    }

    return ready;
  }

  private async isFile(candidatePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(candidatePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async processReadyFile(inputPath: string, layout: ReturnType<typeof resolveRuntimeLayout>): Promise<IngestAttempt | null> {
    const sourceText = await fs.readFile(inputPath, 'utf-8');
    const archiveName = `${Date.now()}-${path.basename(inputPath)}-${computeHash(sourceText).slice(0, 10)}.txt`;
    const archived = path.join(layout.intakeArchiveRawDir, archiveName);
    await fs.mkdir(layout.intakeArchiveRawDir, { recursive: true });
    await fs.copyFile(inputPath, archived);

    const draftId = `${path.basename(inputPath)}.${computeHash(sourceText).slice(0, 10)}`;
    const draft = {
      draftPath: path.join(layout.pipelineQuarantineDir, `${draftId}.json`),
      draftId,
      source: inputPath,
      stagedAt: isoUtcNow(),
      sourceHash: computeHash(sourceText),
      attempt: 1,
    };

    const safePayload = {
      source: inputPath,
      staged_at: draft.stagedAt,
      source_hash: draft.sourceHash,
      draft_id: draft.draftId,
      attempt: draft.attempt,
      source_text_preview: redactedText(String(sourceText).slice(0, 240)),
    };

    await fs.mkdir(layout.pipelineQuarantineDir, { recursive: true });
    await fs.writeFile(draft.draftPath, `${JSON.stringify(safePayload, null, 2)}\n`, 'utf-8');

    const reportPath = path.join(this.reportArtifactDir, `${draft.draftId}.json`);
    await fs.mkdir(this.reportArtifactDir, { recursive: true });
    const report = { draft, status: 'staged', text_length: sourceText.length, created_at: isoUtcNow() };
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

    const queueLine = JSON.stringify({
      event: 'QUEUED',
      draft_id: draft.draftId,
      source: inputPath,
      staged_at: draft.stagedAt,
      source_hash: draft.sourceHash,
    });

    await fs.appendFile(layout.queueLedgerPath, `${queueLine}\n`, 'utf-8');

    return {
      inputPath,
      draft,
      normalizedText: sourceText,
      status: 'staged',
      warnings: [],
      errors: [],
    };
  }
}

export const runDaemonWatcher = async (argv: string[]): Promise<{
  status: 'COMPLETE' | 'PARTIAL';
  staged: IngestAttempt[];
}> => {
  const root = process.cwd();
  const layout = resolveRuntimeLayout(root);
  const dropzone = layout.intakeDropzoneDir;
  const reporter = layout.pipelineWorkspaceDir;
  const watcher = new DebouncedDropzoneWatcher(root, dropzone, reporter, { settleMs: 700 });

  const once = argv.includes('--once');
  const dryRun = argv.includes('--dry-run');

  const staged = await watcher.scanOnce();
  if (!dryRun) {
    // intentionally keep staging only; ingestion pipeline owns actual transform.
    for (const item of staged) {
      // emit minimal event for operator visibility
      const parsed = JSON.parse(await fs.readFile(item.draft.draftPath, 'utf-8')) as Record<string, unknown>;
      parsed.status = 'staged';
      await fs.writeFile(item.draft.draftPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
    }
  }

  return {
    status: 'COMPLETE',
    staged,
  };
};
