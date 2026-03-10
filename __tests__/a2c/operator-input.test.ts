// @vitest-environment node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureRuntimeLayout } from '@/lib/a2c/layout';
import { stageOperatorInput } from '@/lib/a2c/ingest';
import { runTaskPacketCommand } from '@/lib/a2c/todoPacket';

const createdRoots: string[] = [];

const createWorkspace = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-a2c-operator-input-'));
  createdRoots.push(root);
  const layout = await ensureRuntimeLayout(root, true);
  return { root, layout };
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('A2C operator input pipeline', () => {
  it('stages actionable input and preserves verification plus stop-condition hints in packet output', async () => {
    const { root, layout } = await createWorkspace();

    const staged = await stageOperatorInput(
      root,
      {
        text: [
          'Take TODO-001 and harden A2C query safety.',
          '',
          'Scope:',
          '- lib/a2c/query.ts',
          '- scripts/a2c/query.ts',
          '',
          'Acceptance Criteria:',
          '- default query path leaves data/private/a2c untouched',
          '',
          'Stop Conditions:',
          '- stop if a hidden caller still depends on write side effects',
          '',
          'Verification:',
          '- npm run typecheck',
          '- npx vitest run __tests__/a2c/*.test.ts',
        ].join('\n'),
        source: { channel: 'api', actor: 'test-harness' },
      },
    );

    expect(staged.normalized.task_refs).toEqual(['TODO-001']);
    expect(staged.normalized.file_hints).toContain('lib/a2c/query.ts');
    expect(staged.normalized.verification_hints).toContain('npm run typecheck');
    expect(staged.normalized.stop_condition_hints).toContain(
      'stop if a hidden caller still depends on write side effects',
    );

    const report = await runTaskPacketCommand([
      '--kb-root',
      root,
      '--intake-id',
      staged.intake_id,
    ]);
    const packet = report.results.packet as {
      status: string;
      verification: string[];
      stop_conditions: string[];
      markdown_path: string;
    };

    expect(report.status).toBe('COMPLETE');
    expect(packet.status).toBe('READY');
    expect(packet.verification).toContain('npm run typecheck');
    expect(packet.verification).toContain('npx vitest run __tests__/a2c/*.test.ts');
    expect(packet.stop_conditions).toContain(
      'stop if a hidden caller still depends on write side effects',
    );
    expect(packet.markdown_path.startsWith(layout.packetCandidatesDir)).toBe(true);
  });

  it('defers planning-heavy vague input instead of forcing a queue packet', async () => {
    const { root } = await createWorkspace();

    const staged = await stageOperatorInput(root, {
      text: 'Think more deeply about N1Hub architecture and compare options before coding anything.',
      source: { channel: 'chat' },
    });

    const report = await runTaskPacketCommand([
      '--kb-root',
      root,
      '--intake-id',
      staged.intake_id,
    ]);
    const packet = report.results.packet as {
      status: string;
      defer_reason?: string;
    };

    expect(staged.normalized.route_class_hint).toBe('assistant_synthesis');
    expect(report.status).toBe('PARTIAL');
    expect(packet.status).toBe('DEFERRED');
    expect(packet.defer_reason).toContain('route_class_hint');
  });

  it('defers noisy input with insufficient bounded signal', async () => {
    const { root } = await createWorkspace();

    const staged = await stageOperatorInput(root, {
      text: 'lol idk maybe something??',
      source: { channel: 'chat' },
    });

    const report = await runTaskPacketCommand([
      '--kb-root',
      root,
      '--intake-id',
      staged.intake_id,
    ]);
    const packet = report.results.packet as {
      status: string;
      defer_reason?: string;
    };

    expect(report.status).toBe('PARTIAL');
    expect(packet.status).toBe('DEFERRED');
    expect(packet.defer_reason).toBeTruthy();
  });

  it('defers over-broad execution requests even when they look action-oriented', async () => {
    const { root } = await createWorkspace();

    const staged = await stageOperatorInput(root, {
      text: [
        'Refactor the whole repository and finish all open tasks.',
        '',
        'Verification:',
        '- npm run typecheck',
      ].join('\n'),
      source: { channel: 'api' },
    });

    const report = await runTaskPacketCommand([
      '--kb-root',
      root,
      '--intake-id',
      staged.intake_id,
    ]);
    const packet = report.results.packet as {
      status: string;
      defer_reason?: string;
    };

    expect(report.status).toBe('PARTIAL');
    expect(packet.status).toBe('DEFERRED');
    expect(packet.defer_reason).toContain('too broad');
  });
});
