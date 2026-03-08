import { z } from 'zod';

export const AI_WALLET_PROVIDER_IDS = [
  'codex_subscription',
  'claude_subscription',
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'grok',
  'github_models',
  'openrouter',
  'n1_subscription',
] as const;

export type AiWalletProviderId = (typeof AI_WALLET_PROVIDER_IDS)[number];

export const aiWalletProviderIdSchema = z.enum(AI_WALLET_PROVIDER_IDS);

export const AI_WALLET_PROVIDER_SECTION_IDS = ['subscriptions', 'api_keys', 'platform'] as const;

export type AiWalletProviderSectionId = (typeof AI_WALLET_PROVIDER_SECTION_IDS)[number];

export const AI_WALLET_PROVIDER_SECTION_METADATA: Record<
  AiWalletProviderSectionId,
  {
    label: string;
    description: string;
  }
> = {
  subscriptions: {
    label: 'Subscriptions',
    description:
      'Bring your own subscription-backed auth or bridge endpoints for ChatGPT/Codex and Claude-style access.',
  },
  api_keys: {
    label: 'API Providers',
    description:
      'Direct provider API keys for model families such as ChatGPT, Claude, Gemini, DeepSeek, Grok, and GitHub Models.',
  },
  platform: {
    label: 'Platform & Routing',
    description:
      'Internal or routing-oriented providers that can sit behind DeepMine, agent workflows, or hosted N1 lanes.',
  },
};

export const AI_WALLET_PROVIDER_METADATA: Record<
  AiWalletProviderId,
  {
    label: string;
    family: string;
    section: AiWalletProviderSectionId;
    mode: 'api_key' | 'auth_key';
    placeholder: string;
    helperText: string;
    endpointLabel?: string;
  }
> = {
  codex_subscription: {
    label: 'ChatGPT / Codex Subscription',
    family: 'ChatGPT',
    section: 'subscriptions',
    mode: 'auth_key',
    placeholder: 'codex-auth-...',
    helperText:
      'Use a compatible private or approved full bridge endpoint for ChatGPT/Codex subscription access, separate from the OpenAI API key slot.',
    endpointLabel: 'Bridge URL (full endpoint)',
  },
  claude_subscription: {
    label: 'Claude Subscription',
    family: 'Claude',
    section: 'subscriptions',
    mode: 'auth_key',
    placeholder: 'claude-auth-...',
    helperText:
      'Use a compatible private or approved full bridge endpoint for Claude subscription access, separate from the Anthropic API key slot.',
    endpointLabel: 'Bridge URL (full endpoint)',
  },
  openai: {
    label: 'OpenAI API',
    family: 'ChatGPT',
    section: 'api_keys',
    mode: 'api_key',
    placeholder: 'sk-...',
    helperText: 'Direct API access for OpenAI-backed models and agent workloads.',
    endpointLabel: 'Base URL (optional)',
  },
  anthropic: {
    label: 'Anthropic API',
    family: 'Claude',
    section: 'api_keys',
    mode: 'api_key',
    placeholder: 'sk-ant-...',
    helperText: 'Bring your own Anthropic key for Claude-powered reasoning.',
    endpointLabel: 'Base URL (optional)',
  },
  gemini: {
    label: 'Google Gemini',
    family: 'Gemini',
    section: 'api_keys',
    mode: 'api_key',
    placeholder: 'AIza...',
    helperText:
      'Connect Gemini with a Google AI Studio API key. N1Hub also supports server-side GEMINI_API_KEY fallback for trusted local bring-up.',
    endpointLabel: 'Base URL (optional)',
  },
  deepseek: {
    label: 'DeepSeek',
    family: 'DeepSeek',
    section: 'api_keys',
    mode: 'api_key',
    placeholder: 'sk-...',
    helperText: 'Connect DeepSeek directly for chat and reasoning workloads.',
    endpointLabel: 'Base URL (optional)',
  },
  grok: {
    label: 'Grok (xAI)',
    family: 'Grok',
    section: 'api_keys',
    mode: 'api_key',
    placeholder: 'xai-...',
    helperText: 'Connect xAI Grok directly for reasoning and coding-oriented requests.',
    endpointLabel: 'Base URL (optional)',
  },
  github_models: {
    label: 'GitHub Models',
    family: 'GitHub',
    section: 'platform',
    mode: 'api_key',
    placeholder: 'github_pat_...',
    helperText:
      'Connect GitHub Models with a PAT that has the models scope. Preferred Model should be the exact model id, not a display label. You can also point the base URL at an organization-attributed inference path.',
    endpointLabel: 'Base URL (optional)',
  },
  openrouter: {
    label: 'OpenRouter',
    family: 'Router',
    section: 'platform',
    mode: 'api_key',
    placeholder: 'sk-or-...',
    helperText: 'Route multiple model families through one broker-style provider.',
    endpointLabel: 'Base URL (optional)',
  },
  n1_subscription: {
    label: 'N1 Subscription',
    family: 'N1',
    section: 'platform',
    mode: 'auth_key',
    placeholder: 'n1-auth-...',
    helperText: 'Connect a hosted N1 entitlement or internal authorization key.',
  },
};

export const aiWalletProviderConfigSchema = z.object({
  provider: aiWalletProviderIdSchema,
  mode: z.enum(['api_key', 'auth_key']),
  secret: z.string().min(1),
  enabled: z.boolean(),
  preferredModel: z.string().trim().max(120).optional(),
  endpoint: z.string().trim().max(500).optional(),
  updatedAt: z.string().datetime(),
});

export type AiWalletProviderConfig = z.infer<typeof aiWalletProviderConfigSchema>;

const aiWalletProvidersSchema = z.object({
  codex_subscription: aiWalletProviderConfigSchema.optional(),
  claude_subscription: aiWalletProviderConfigSchema.optional(),
  openai: aiWalletProviderConfigSchema.optional(),
  anthropic: aiWalletProviderConfigSchema.optional(),
  gemini: aiWalletProviderConfigSchema.optional(),
  deepseek: aiWalletProviderConfigSchema.optional(),
  grok: aiWalletProviderConfigSchema.optional(),
  github_models: aiWalletProviderConfigSchema.optional(),
  openrouter: aiWalletProviderConfigSchema.optional(),
  n1_subscription: aiWalletProviderConfigSchema.optional(),
});

export const aiWalletStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime(),
  providers: aiWalletProvidersSchema,
});

export type AiWalletStore = z.infer<typeof aiWalletStoreSchema>;

export interface AiWalletProviderSummary {
  provider: AiWalletProviderId;
  label: string;
  mode: 'api_key' | 'auth_key';
  configured: boolean;
  enabled: boolean;
  preferredModel: string | null;
  endpoint: string | null;
  secretHint: string | null;
  updatedAt: string | null;
  helperText: string;
}

export const aiWalletUpdateSchema = z.object({
  provider: aiWalletProviderIdSchema,
  action: z.enum(['save', 'clear']).default('save'),
  secret: z.string().trim().max(4096).optional(),
  enabled: z.boolean().default(true),
  preferredModel: z.string().trim().max(120).optional(),
  endpoint: z.string().trim().max(500).optional(),
});

export type AiWalletUpdateInput = z.infer<typeof aiWalletUpdateSchema>;
