import { getAiWalletProviderSecret, listAiWalletProviderSummaries } from '@/lib/aiWallet';
import {
  AI_WALLET_PROVIDER_IDS,
  type AiWalletProviderId,
  type AiWalletProviderSummary,
} from '@/lib/aiWalletSchema';

export interface AiProviderCatalogEntry extends AiWalletProviderSummary {
  available: boolean;
  selectedByDefault: boolean;
  baseUrl: string | null;
  defaultModel: string | null;
}

export interface AiTextGenerationRequest {
  provider?: AiWalletProviderId;
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AiTextGenerationResult {
  provider: AiWalletProviderId;
  model: string;
  text: string;
  endpoint: string;
  raw: unknown;
}

interface ResolvedProviderConfig {
  provider: AiWalletProviderId;
  secret: string;
  endpoint: string;
  model: string;
}

function getEnvProviderConfig(provider: AiWalletProviderId): ResolvedProviderConfig | null {
  switch (provider) {
    case 'gemini': {
      const secret = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
      if (!secret) return null;

      return {
        provider,
        secret,
        endpoint: trimSlash(process.env.GEMINI_API_BASE_URL?.trim() || defaultEndpoint(provider)),
        model: defaultModel(provider),
      };
    }
    case 'github_models': {
      const secret = process.env.GITHUB_MODELS_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || '';
      if (!secret) return null;

      return {
        provider,
        secret,
        endpoint: trimSlash(process.env.GITHUB_MODELS_BASE_URL?.trim() || defaultEndpoint(provider)),
        model: defaultModel(provider),
      };
    }
    default:
      return null;
  }
}

function createAiError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function withDefault<T>(value: T | undefined | null, fallback: T): T {
  return value ?? fallback;
}

function defaultEndpoint(provider: AiWalletProviderId): string {
  switch (provider) {
    case 'codex_subscription':
      return trimSlash(
        process.env.N1HUB_CODEX_SUBSCRIPTION_BASE_URL?.trim()
          ?? process.env.N1HUB_CHATGPT_SUBSCRIPTION_BASE_URL?.trim()
          ?? '',
      );
    case 'claude_subscription':
      return trimSlash(process.env.N1HUB_CLAUDE_SUBSCRIPTION_BASE_URL?.trim() ?? '');
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'deepseek':
      return 'https://api.deepseek.com';
    case 'github_models':
      return 'https://models.github.ai/inference';
    case 'grok':
      return 'https://api.x.ai/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'n1_subscription':
      return trimSlash(process.env.N1HUB_N1_SUBSCRIPTION_BASE_URL?.trim() ?? '');
  }
}

function defaultModel(provider: AiWalletProviderId): string {
  switch (provider) {
    case 'codex_subscription':
      return 'codex-subscription/default';
    case 'claude_subscription':
      return 'claude-subscription/default';
    case 'openai':
      return 'gpt-4.1-mini';
    case 'anthropic':
      return 'claude-3-5-sonnet-latest';
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'deepseek':
      return 'deepseek-chat';
    case 'github_models':
      return 'openai/gpt-4.1';
    case 'grok':
      return 'grok-4-fast-reasoning';
    case 'openrouter':
      return 'openai/gpt-4.1-mini';
    case 'n1_subscription':
      return 'n1/default';
  }
}

function parseOpenAiCompatibleText(payload: unknown): string {
  const record = payload as Record<string, unknown> | null;
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  for (const choice of choices) {
    const message = (choice as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string' && message.content.trim()) {
      return message.content.trim();
    }

    if (Array.isArray(message?.content)) {
      const text = message.content
        .flatMap((item) => {
          const entry = item as Record<string, unknown> | null;
          return typeof entry?.text === 'string' ? [entry.text] : [];
        })
        .join('\n')
        .trim();
      if (text) return text;
    }
  }

  throw createAiError('provider_response_error', 'Provider returned no assistant text');
}

function parseAnthropicText(payload: unknown): string {
  const record = payload as Record<string, unknown> | null;
  const content = Array.isArray(record?.content) ? record.content : [];
  const text = content
    .flatMap((item) => {
      const entry = item as Record<string, unknown> | null;
      return typeof entry?.text === 'string' ? [entry.text] : [];
    })
    .join('\n')
    .trim();

  if (!text) {
    throw createAiError('provider_response_error', 'Anthropic returned no text');
  }

  return text;
}

function parseGeminiText(payload: unknown): string {
  const record = payload as Record<string, unknown> | null;
  const candidates = Array.isArray(record?.candidates) ? record.candidates : [];
  for (const candidate of candidates) {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    const text = parts
      .flatMap((part) => {
        const entry = part as Record<string, unknown> | null;
        return typeof entry?.text === 'string' ? [entry.text] : [];
      })
      .join('\n')
      .trim();
    if (text) return text;
  }

  throw createAiError('provider_response_error', 'Gemini returned no text');
}

function parseFlexibleBridgeText(payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  const record = payload as Record<string, unknown> | null;
  if (typeof record?.text === 'string' && record.text.trim()) {
    return record.text.trim();
  }

  const parsers = [parseAnthropicText, parseOpenAiCompatibleText, parseGeminiText];
  for (const parser of parsers) {
    try {
      return parser(payload);
    } catch {
      continue;
    }
  }

  throw createAiError('provider_response_error', 'Bridge returned no supported text payload');
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error: unknown) {
    throw createAiError(
      'provider_response_error',
      error instanceof Error ? error.message : 'Provider returned invalid JSON',
    );
  }
}

function mapProviderError(provider: AiWalletProviderId | undefined, status: number, payload: unknown): string | null {
  const record = payload as Record<string, unknown> | null;
  const errorRecord =
    record && typeof record.error === 'object' && !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : null;
  const rawMessage =
    typeof errorRecord?.message === 'string'
      ? errorRecord.message
      : typeof record?.message === 'string'
        ? record.message
        : '';

  if (
    provider === 'gemini' &&
    status === 400 &&
    /User location is not supported for the API use/i.test(rawMessage)
  ) {
    return 'Gemini API is blocked for the current Google account or server location. The key may be valid, but Google does not allow Gemini API use from this region/account.';
  }

  return null;
}

async function ensureResponseOk(response: Response, provider?: AiWalletProviderId): Promise<unknown> {
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const mappedMessage = mapProviderError(provider, response.status, payload);
    throw createAiError(
      'provider_request_failed',
      mappedMessage ?? `Provider returned status ${response.status}: ${JSON.stringify(payload).slice(0, 1000)}`,
    );
  }
  return payload;
}

async function generateTextThroughBridge(
  resolved: ResolvedProviderConfig,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const endpoint = resolved.endpoint;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resolved.secret}`,
      'X-N1-Provider': resolved.provider,
    },
    body: JSON.stringify({
      model: resolved.model,
      prompt: request.prompt.trim(),
      ...(request.system?.trim() ? { system: request.system.trim() } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      max_tokens: withDefault(request.maxTokens, 1024),
    }),
  });
  const payload = await ensureResponseOk(response, resolved.provider);
  return {
    provider: resolved.provider,
    model: resolved.model,
    endpoint,
    text: parseFlexibleBridgeText(payload),
    raw: payload,
  };
}

async function resolveProviderConfig(
  preferredProvider?: AiWalletProviderId,
  preferredModel?: string,
): Promise<ResolvedProviderConfig> {
  const candidateProviders = preferredProvider
    ? [preferredProvider]
    : [...AI_WALLET_PROVIDER_IDS];

  for (const provider of candidateProviders) {
    const config = await getAiWalletProviderSecret(provider);
    if (!config?.enabled || !config.secret.trim()) continue;

    const endpoint = trimSlash(config.endpoint?.trim() || defaultEndpoint(provider));
    if (!endpoint) {
      throw createAiError(
        'provider_endpoint_missing',
        `${provider} requires an endpoint before it can be used`,
      );
    }

    return {
      provider,
      secret: config.secret.trim(),
      endpoint,
      model: preferredModel?.trim() || config.preferredModel?.trim() || defaultModel(provider),
    };
  }

  for (const provider of candidateProviders) {
    const envConfig = getEnvProviderConfig(provider);
    if (!envConfig) continue;

    return {
      ...envConfig,
      model: preferredModel?.trim() || envConfig.model,
    };
  }

  if (preferredProvider) {
    throw createAiError(
      'provider_not_configured',
      `${preferredProvider} is not configured or enabled in AI Wallet`,
    );
  }

  throw createAiError(
    'no_available_ai_provider',
    'No enabled AI provider with valid credentials was found in AI Wallet',
  );
}

export async function getResolvedAiProviderCatalog(): Promise<AiProviderCatalogEntry[]> {
  const summaries = await listAiWalletProviderSummaries();
  const selectedDefault = summaries.find((entry) => entry.configured && entry.enabled)?.provider ?? null;

  return summaries.map((summary) => ({
    ...summary,
    available: summary.configured && summary.enabled,
    selectedByDefault: summary.provider === selectedDefault,
    baseUrl: summary.endpoint || defaultEndpoint(summary.provider) || null,
    defaultModel: summary.preferredModel || defaultModel(summary.provider),
  }));
}

export async function generateTextWithAiProvider(
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw createAiError('prompt_required', 'Prompt is required');
  }

  const resolved = await resolveProviderConfig(request.provider, request.model);
  const temperature = request.temperature;
  const maxTokens = request.maxTokens;
  const jsonMode = request.jsonMode === true;

  switch (resolved.provider) {
    case 'codex_subscription':
    case 'claude_subscription':
    case 'n1_subscription': {
      return generateTextThroughBridge(resolved, request);
    }

    case 'openai':
    case 'deepseek':
    case 'github_models':
    case 'grok':
    case 'openrouter':
    {
      const endpoint = `${resolved.endpoint}/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolved.secret}`,
          ...(resolved.provider === 'openrouter'
            ? {
                'HTTP-Referer': 'https://n1hub.com',
                'X-Title': 'N1Hub',
              }
            : {}),
          ...(resolved.provider === 'github_models'
            ? {
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              }
            : {}),
        },
        body: JSON.stringify({
          model: resolved.model,
          messages: [
            ...(request.system?.trim()
              ? [{ role: 'system', content: request.system.trim() }]
              : []),
            { role: 'user', content: prompt },
          ],
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      const payload = await ensureResponseOk(response, resolved.provider);
      return {
        provider: resolved.provider,
        model: resolved.model,
        endpoint,
        text: parseOpenAiCompatibleText(payload),
        raw: payload,
      };
    }

    case 'anthropic': {
      const endpoint = resolved.endpoint;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': resolved.secret,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: resolved.model,
          max_tokens: withDefault(maxTokens, 1024),
          ...(request.system?.trim() ? { system: request.system.trim() } : {}),
          messages: [{ role: 'user', content: prompt }],
          ...(temperature !== undefined ? { temperature } : {}),
        }),
      });
      const payload = await ensureResponseOk(response, resolved.provider);
      return {
        provider: resolved.provider,
        model: resolved.model,
        endpoint,
        text: parseAnthropicText(payload),
        raw: payload,
      };
    }

    case 'gemini': {
      const endpoint = `${resolved.endpoint}/models/${encodeURIComponent(resolved.model)}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': resolved.secret,
        },
        body: JSON.stringify({
          ...(request.system?.trim()
            ? {
                systemInstruction: {
                  parts: [{ text: request.system.trim() }],
                },
              }
            : {}),
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          ...(temperature !== undefined || maxTokens !== undefined
            ? {
                generationConfig: {
                  ...(temperature !== undefined ? { temperature } : {}),
                  ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
                },
              }
            : {}),
        }),
      });
      const payload = await ensureResponseOk(response, resolved.provider);
      return {
        provider: resolved.provider,
        model: resolved.model,
        endpoint,
        text: parseGeminiText(payload),
        raw: payload,
      };
    }
  }
}
