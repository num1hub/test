import { generateTextWithAiProvider } from '@/lib/ai/providerRuntime';

import {
  aiOutputSchema,
  vaultStewardLaneReportSchema,
  type VaultStewardConfig,
  type VaultStewardQueue,
} from './schemas';
import {
  buildFallbackAnalysis,
  buildPrompt,
  buildScoutRepairPrompt,
  extractFirstJsonObject,
} from './prompting';
import type { VaultSignalSummary, VaultStewardScoutResult } from './queue-planning';

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

export async function runVaultStewardProviderScoutOnce(
  config: VaultStewardConfig,
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
): Promise<VaultStewardScoutResult> {
  const { system, prompt } = buildPrompt(summary, queue);

  try {
    const result = await generateTextWithAiProvider({
      provider: config.provider ?? undefined,
      model: config.model ?? undefined,
      system,
      prompt,
      temperature: 0.1,
      maxTokens: 1200,
      jsonMode: true,
    });
    const parsedRaw = extractFirstJsonObject(result.text);
    const parsed = aiOutputSchema.safeParse(parsedRaw);
    if (parsed.success) {
      return {
        normalized: parsed.data,
        provider: result.provider ?? config.provider ?? null,
        model: result.model ?? config.model ?? null,
        rawText: result.text,
        reason: 'provider_success',
        lane: vaultStewardLaneReportSchema.parse({
          id: 'scout',
          label: 'Scout',
          engine: 'provider',
          status: 'completed',
          provider: result.provider ?? config.provider ?? 'auto',
          model: result.model ?? config.model ?? null,
          summary: `Provider scout completed via ${result.provider ?? config.provider ?? 'auto'} and produced a structured capsule-maintenance plan.`,
          error: null,
        }),
      };
    }

    const repaired = await generateTextWithAiProvider({
      provider: config.provider ?? undefined,
      model: config.model ?? undefined,
      system:
        'You are a JSON repair assistant for N1Hub Vault Steward. Return strict JSON only and preserve the original maintenance intent.',
      prompt: buildScoutRepairPrompt(result.text),
      temperature: 0,
      maxTokens: 600,
      jsonMode: true,
    });
    const repairedRaw = extractFirstJsonObject(repaired.text);
    const repairedParsed = aiOutputSchema.safeParse(repairedRaw);
    if (repairedParsed.success) {
      return {
        normalized: repairedParsed.data,
        provider: result.provider ?? config.provider ?? null,
        model: result.model ?? config.model ?? null,
        rawText: [result.text, repaired.text].join('\n\n--- repair pass ---\n\n'),
        reason: 'analysis_repaired',
        lane: vaultStewardLaneReportSchema.parse({
          id: 'scout',
          label: 'Scout',
          engine: 'provider',
          status: 'completed',
          provider: result.provider ?? config.provider ?? 'auto',
          model: result.model ?? config.model ?? null,
          summary: `Provider scout completed via ${result.provider ?? config.provider ?? 'auto'} after a JSON repair pass recovered a structured capsule-maintenance plan.`,
          error: null,
        }),
      };
    }

    return {
      normalized: buildFallbackAnalysis(summary),
      provider: result.provider ?? config.provider ?? null,
      model: result.model ?? config.model ?? null,
      rawText: result.text,
      reason: 'used_fallback_analysis',
      lane: vaultStewardLaneReportSchema.parse({
        id: 'scout',
        label: 'Scout',
        engine: 'provider',
        status: 'failed',
        provider: result.provider ?? config.provider ?? 'auto',
        model: result.model ?? config.model ?? null,
        summary: `Provider scout completed via ${result.provider ?? config.provider ?? 'auto'}, but both the initial response and JSON repair pass failed validation, so the plan was normalized through the local fallback parser.`,
        error: null,
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'vault steward scout failed';
    const budgetRetryMaxTokens = getBudgetRetryMaxTokens(message, 1200);

    if (budgetRetryMaxTokens) {
      try {
        const { system: retrySystem, prompt: retryPrompt } = buildPrompt(summary, queue);
        const retried = await generateTextWithAiProvider({
          provider: config.provider ?? undefined,
          model: config.model ?? undefined,
          system: retrySystem,
          prompt: retryPrompt,
          temperature: 0.1,
          maxTokens: budgetRetryMaxTokens,
          jsonMode: true,
        });
        const retriedParsedRaw = extractFirstJsonObject(retried.text);
        const retriedParsed = aiOutputSchema.safeParse(retriedParsedRaw);
        if (retriedParsed.success) {
          return {
            normalized: retriedParsed.data,
            provider: retried.provider ?? config.provider ?? null,
            model: retried.model ?? config.model ?? null,
            rawText: retried.text,
            reason: 'provider_success',
            lane: vaultStewardLaneReportSchema.parse({
              id: 'scout',
              label: 'Scout',
              engine: 'provider',
              status: 'completed',
              provider: retried.provider ?? config.provider ?? 'auto',
              model: retried.model ?? config.model ?? null,
              summary: `Provider scout completed via ${retried.provider ?? config.provider ?? 'auto'} after an automatic low-budget retry.`,
              error: null,
            }),
          };
        }
      } catch {
        // fall through to compact retry
      }
    }

    try {
      const compactPrompt = buildPrompt(summary, queue, { compact: true });
      const compactResult = await generateTextWithAiProvider({
        provider: config.provider ?? undefined,
        model: config.model ?? undefined,
        system: compactPrompt.system,
        prompt: compactPrompt.prompt,
        temperature: 0.1,
        maxTokens: 900,
        jsonMode: true,
      });
      const compactParsedRaw = extractFirstJsonObject(compactResult.text);
      const compactParsed = aiOutputSchema.safeParse(compactParsedRaw);
      if (compactParsed.success) {
        return {
          normalized: compactParsed.data,
          provider: compactResult.provider ?? config.provider ?? null,
          model: compactResult.model ?? config.model ?? null,
          rawText: compactResult.text,
          reason: 'provider_success',
          lane: vaultStewardLaneReportSchema.parse({
            id: 'scout',
            label: 'Scout',
            engine: 'provider',
            status: 'completed',
            provider: compactResult.provider ?? config.provider ?? 'auto',
            model: compactResult.model ?? config.model ?? null,
            summary: `Provider scout completed via ${compactResult.provider ?? config.provider ?? 'auto'} after an automatic compact-prompt retry.`,
            error: null,
          }),
        };
      }

      const repaired = await generateTextWithAiProvider({
        provider: config.provider ?? undefined,
        model: config.model ?? undefined,
        system:
          'You are a JSON repair assistant for N1Hub Vault Steward. Return strict JSON only and preserve the original maintenance intent.',
        prompt: buildScoutRepairPrompt(compactResult.text),
        temperature: 0,
        maxTokens: 600,
        jsonMode: true,
      });
      const repairedRaw = extractFirstJsonObject(repaired.text);
      const repairedParsed = aiOutputSchema.safeParse(repairedRaw);
      if (repairedParsed.success) {
        return {
          normalized: repairedParsed.data,
          provider: compactResult.provider ?? config.provider ?? null,
          model: compactResult.model ?? config.model ?? null,
          rawText: [compactResult.text, repaired.text].join('\n\n--- repair pass ---\n\n'),
          reason: 'analysis_repaired',
          lane: vaultStewardLaneReportSchema.parse({
            id: 'scout',
            label: 'Scout',
            engine: 'provider',
            status: 'completed',
            provider: compactResult.provider ?? config.provider ?? 'auto',
            model: compactResult.model ?? config.model ?? null,
            summary: `Provider scout completed via ${compactResult.provider ?? config.provider ?? 'auto'} after a compact-prompt retry and JSON repair pass.`,
            error: null,
          }),
        };
      }
    } catch {
      // fall through to graph-derived fallback
    }

    return {
      normalized: buildFallbackAnalysis(summary),
      provider: config.provider ?? null,
      model: config.model ?? null,
      rawText: null,
      reason: 'used_fallback_analysis',
      lane: vaultStewardLaneReportSchema.parse({
        id: 'scout',
        label: 'Scout',
        engine: 'provider',
        status: 'failed',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'Provider scout failed, so Vault Steward fell back to graph-derived capsule maintenance heuristics.',
        error: message,
      }),
    };
  }
}
