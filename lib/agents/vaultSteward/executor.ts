import { z } from 'zod';

import { runLocalCodexStructuredTask } from '@/lib/agents/localCodex';
import { generateTextWithAiProvider } from '@/lib/ai/providerRuntime';
import { readOverlayCapsule, writeOverlayCapsule } from '@/lib/diff/branch-manager';

import { applyExecutorUpdate } from './maintenance-artifacts';
import { selectExecutorJobsForRun } from './queue-planning';
import {
  buildExecutorJsonSchema,
  buildExecutorPrompt,
  extractFirstJsonObject,
} from './prompting';
import {
  executorOutputSchema,
  vaultStewardLaneReportSchema,
  type VaultStewardConfig,
  type VaultStewardJob,
  type VaultStewardQueue,
} from './schemas';

function extractAffordableMaxTokens(message: string): number | null {
  const match = message.match(/can only afford (\d+)/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getBudgetRetryMaxTokens(message: string, requested: number): number | null {
  const affordable = extractAffordableMaxTokens(message);
  if (!affordable) return null;
  const bounded = Math.min(requested - 1, Math.max(200, affordable - 32));
  return bounded > 0 ? bounded : null;
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export async function runVaultStewardExecutorLane(
  config: VaultStewardConfig,
  queue: VaultStewardQueue,
  runId: string,
): Promise<{
  nextQueue: VaultStewardQueue;
  executedJobs: VaultStewardJob[];
  lane: z.infer<typeof vaultStewardLaneReportSchema>;
}> {
  const queuedJobs = queue.jobs.filter(
    (job) => job.status === 'queued' && job.suggested_branch === 'dream',
  );

  if (queuedJobs.length === 0) {
    return {
      nextQueue: queue,
      executedJobs: [],
      lane: vaultStewardLaneReportSchema.parse({
        id: 'maintainer',
        label: 'Capsule Maintainer',
        engine: 'provider',
        status: 'skipped',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'No queued Dream-branch capsule jobs were available for autonomous executor work.',
        error: null,
      }),
    };
  }

  const selectedJobs = selectExecutorJobsForRun(queue);
  const executedJobs: VaultStewardJob[] = [];
  const executionProviders = new Set<string>();
  let usedCodexFallback = false;

  for (const job of selectedJobs) {
    const maybeCapsules = await Promise.all(
      job.capsule_ids.map((capsuleId) => readOverlayCapsule(capsuleId, 'dream')),
    );
    const capsules = maybeCapsules.filter((entry): entry is NonNullable<typeof entry> => entry != null);
    if (capsules.length === 0) {
      continue;
    }

    const { system, prompt } = buildExecutorPrompt(job, capsules);
    let parsed: z.infer<typeof executorOutputSchema> | null = null;

    try {
      const result = await generateTextWithAiProvider({
        provider: config.provider ?? undefined,
        model: config.model ?? undefined,
        system,
        prompt,
        temperature: 0.15,
        maxTokens: 700,
        jsonMode: true,
      });
      const parsedRaw = extractFirstJsonObject(result.text);
      parsed = executorOutputSchema.parse(parsedRaw);
      executionProviders.add(result.provider ?? config.provider ?? 'auto');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Executor failed';
      const budgetRetryMaxTokens = getBudgetRetryMaxTokens(message, 700);
      if (budgetRetryMaxTokens) {
        try {
          const retried = await generateTextWithAiProvider({
            provider: config.provider ?? undefined,
            model: config.model ?? undefined,
            system,
            prompt,
            temperature: 0.15,
            maxTokens: budgetRetryMaxTokens,
            jsonMode: true,
          });
          const retriedParsedRaw = extractFirstJsonObject(retried.text);
          parsed = executorOutputSchema.parse(retriedParsedRaw);
          executionProviders.add(retried.provider ?? config.provider ?? 'auto');
        } catch {
          // fall through to Codex fallback
        }
      }

      if (!parsed) {
        try {
          const codexResult = await runLocalCodexStructuredTask<z.infer<typeof executorOutputSchema>>({
            prompt,
            schema: buildExecutorJsonSchema(),
            cwd: process.cwd(),
            timeoutMs: 40_000,
          });
          parsed = executorOutputSchema.parse(codexResult.data);
          executionProviders.add('chatgpt_local_codex');
          usedCodexFallback = true;
        } catch {
          // leave parsed as null
        }
      }
    }

    if (!parsed) {
      continue;
    }

    const updatesByCapsuleId = new Map(
      parsed.updates.map((update) => [update.capsule_id, update]),
    );

    for (const capsule of capsules) {
      const update = updatesByCapsuleId.get(capsule.metadata.capsule_id);
      if (!update) continue;
      const nextCapsule = applyExecutorUpdate(capsule, update, runId, job);
      await writeOverlayCapsule(nextCapsule, 'dream');
    }

    executedJobs.push(job);
  }

  if (executedJobs.length === 0) {
    return {
      nextQueue: queue,
      executedJobs: [],
      lane: vaultStewardLaneReportSchema.parse({
        id: 'maintainer',
        label: 'Capsule Maintainer',
        engine: 'provider',
        status: 'failed',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'Autonomous capsule executor work failed, so queued Dream jobs were left untouched.',
        error: null,
      }),
    };
  }

  const executedIds = new Set(executedJobs.map((job) => job.id));
  const nextQueue = {
    ...queue,
    updated_at: new Date().toISOString(),
    jobs: queue.jobs.map((job): VaultStewardJob =>
      executedIds.has(job.id) ? { ...job, status: 'completed' } : job,
    ),
  };
  const executedWorkstreams = uniqueBy(executedJobs.map((job) => job.workstream), (entry) => entry);

  return {
    nextQueue,
    executedJobs,
    lane: vaultStewardLaneReportSchema.parse({
      id: 'maintainer',
      label: 'Capsule Maintainer',
      engine: usedCodexFallback ? 'local_codex' : 'provider',
      status: 'completed',
      provider:
        executionProviders.size > 0
          ? Array.from(executionProviders).join(',')
          : config.provider ?? 'auto',
      model: usedCodexFallback ? null : config.model ?? null,
      summary: `Autonomously executed ${executedJobs.length} Dream-side capsule executor job${executedJobs.length === 1 ? '' : 's'} across ${executedWorkstreams.join(', ')} workstream${executedWorkstreams.length === 1 ? '' : 's'}${usedCodexFallback ? ' with Codex fallback on the execution lane.' : '.'}`,
      error: null,
    }),
  };
}
