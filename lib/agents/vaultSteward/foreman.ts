import { z } from 'zod';

import { getLocalCodexAvailability, runLocalCodexStructuredTask } from '@/lib/agents/localCodex';

import {
  shouldBypassCodexForemanCadenceHold,
  shouldRunCodexForeman,
  type VaultSignalSummary,
  type VaultStewardScoutResult,
} from './queue-planning';
import {
  buildCodexSupervisorJsonSchema,
  buildCodexSupervisorPrompt,
} from './prompting';
import {
  codexSupervisorOutputSchema,
  vaultStewardLaneReportSchema,
  type VaultStewardQueue,
} from './schemas';

export type VaultStewardForemanResult =
  | {
      available: true;
      output: z.infer<typeof codexSupervisorOutputSchema>;
      rawText: string;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
  | {
      available: false;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    };

export async function runVaultStewardCodexForeman(
  summary: VaultSignalSummary,
  scout: VaultStewardScoutResult,
  queue: VaultStewardQueue,
): Promise<VaultStewardForemanResult> {
  const bypassCadenceHold = shouldBypassCodexForemanCadenceHold(scout, queue);
  const readiness = shouldRunCodexForeman(scout, queue);

  if (!bypassCadenceHold && !readiness.run) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: readiness.summary,
        error: null,
      }),
    };
  }

  const availability = await getLocalCodexAvailability();
  if (!availability.available) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex foreman lane is unavailable, so Vault Steward kept the provider scout plan.',
        error: availability.reason,
      }),
    };
  }

  try {
    const result = await runLocalCodexStructuredTask<z.infer<typeof codexSupervisorOutputSchema>>({
      prompt: buildCodexSupervisorPrompt(summary, scout, queue),
      schema: buildCodexSupervisorJsonSchema(),
      cwd: process.cwd(),
      timeoutMs: 40_000,
    });
    const parsed = codexSupervisorOutputSchema.parse(result.data);
    return {
      available: true,
      output: parsed,
      rawText: result.text,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'completed',
        provider: 'chatgpt_local_codex',
        model: result.model,
        summary: parsed.supervisor_summary,
        error: null,
      }),
    };
  } catch (error: unknown) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'failed',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex supervisor lane failed during execution, so Vault Steward kept the provider scout plan.',
        error: error instanceof Error ? error.message : 'Codex foreman failed',
      }),
    };
  }
}
