import { z } from 'zod';

import { getLocalCodexAvailability, runLocalCodexStructuredTask } from '@/lib/agents/localCodex';

import {
  codexReviewerOutputSchema,
  vaultStewardLaneReportSchema,
} from './schemas';
import {
  buildCodexReviewerJsonSchema,
  buildCodexReviewerPrompt,
} from './prompting';

type VaultStewardReviewerInput = Parameters<typeof buildCodexReviewerPrompt>[0];

export type VaultStewardReviewerResult =
  | {
      available: true;
      output: z.infer<typeof codexReviewerOutputSchema>;
      rawText: string;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
  | {
      available: false;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    };

export async function runVaultStewardCodexReviewer(
  input: VaultStewardReviewerInput,
): Promise<VaultStewardReviewerResult> {
  const availability = await getLocalCodexAvailability();
  if (!availability.available) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex reviewer lane is unavailable, so the swarm kept provider-led review only.',
        error: availability.reason,
      }),
    };
  }

  try {
    const result = await runLocalCodexStructuredTask<z.infer<typeof codexReviewerOutputSchema>>({
      prompt: buildCodexReviewerPrompt(input),
      schema: buildCodexReviewerJsonSchema(),
      cwd: process.cwd(),
      timeoutMs: 40_000,
    });
    const parsed = codexReviewerOutputSchema.parse(result.data);
    return {
      available: true,
      output: parsed,
      rawText: result.text,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'completed',
        provider: 'chatgpt_local_codex',
        model: result.model,
        summary: parsed.review_summary,
        error: null,
      }),
    };
  } catch (error: unknown) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'failed',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex reviewer lane failed, so the swarm kept the current run without subscription review notes.',
        error: error instanceof Error ? error.message : 'Codex reviewer failed',
      }),
    };
  }
}
