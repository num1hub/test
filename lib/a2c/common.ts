import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const SKILL_ID = 'anything-to-capsules';

export const DIALECT_REPO_NATIVE = 'repo_native' as const;
export const DIALECT_LEGACY_RECURSIVE = 'legacy_recursive' as const;

export const CONFIDENCE_VECTOR_FIELDS = [
  'extraction',
  'synthesis',
  'linking',
  'provenance_coverage',
  'validation_score',
  'contradiction_pressure',
] as const;

export const ALLOWED_RELATIONS = new Set([
  'supports',
  'contradicts',
  'extends',
  'duplicates',
  'references',
  'depends_on',
  'derived_from',
  'implements',
  'part_of',
]);

export const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.csv',
  '.tsv',
  '.py',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.html',
  '.htm',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.ini',
  '.cfg',
  '.toml',
  '.sql',
  '.sh',
  '.ps1',
  '.rst',
]);

export const N1HUB_RETRIEVAL_SETTINGS = {
  citation_policy: {
    min_conf: 0.62,
    fallback: 'idk+dig_deep',
  },
  chunking: {
    size_tokens: 800,
    stride: 200,
  },
  retriever: {
    top_k: 6,
    mmr_lambda: 0.3,
    per_source_cap: 3,
  },
  reranker: {
    rerank: 24,
    keep: 8,
  },
};

export const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'with',
  'that',
  'this',
  'from',
  'have',
  'there',
  'their',
  'would',
  'could',
  'which',
  'should',
  'shouldn',
  'will',
  'into',
  'about',
  'were',
  'your',
  'when',
  'what',
  'can',
  'just',
  'then',
  'than',
  'them',
  'these',
  'those',
  'that',
  'they',
  'been',
  'also',
  'more',
  'most',
  'other',
]);

export const PII_PATTERN = /(?:api[_-]?key|token|secret|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{8,}['\"]?/gi;

export const isoUtcNow = (): string => new Date().toISOString();

export const canonicalizeDialect = (value: string): 'repo_native' | 'legacy_recursive' => {
  const normalized = String(value || '').toLowerCase().trim();
  if (
    !normalized ||
    normalized === 'repo_native' ||
    normalized === 'n1hub' ||
    normalized === 'recursive_layer'
  ) {
    return DIALECT_REPO_NATIVE;
  }
  return DIALECT_LEGACY_RECURSIVE;
};

export const tokenize = (value: string): string[] => {
  return String(value || '')
    .toLowerCase()
    .match(/[a-z0-9_]+/g)
    ?.map((token) => token.toLowerCase())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token)) || [];
};

export const uniqueTokens = (value: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of tokenize(value)) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
};

export const computeHash = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const stableSemanticHash = (value: string): string => crypto.createHash('sha3-512').update(value).digest('hex');

const canonicalizeJson = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (key.startsWith('$')) continue;
      out[key] = canonicalizeJson(obj[key]);
    }
    return out;
  }
  return value;
};

export const canonicalJsonDumps = (payload: unknown): string =>
  JSON.stringify(canonicalizeJson(payload), null, 2);

export const isN1HubRepoRoot = (root: string): boolean => {
  return Boolean(root && fs.existsSync(path.join(root, 'data', 'capsules')));
};

export const isTextFileExtension = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
};

export const redactedText = (value: string): string =>
  String(value || '').replace(PII_PATTERN, '[REDACTED]');

export const preferredCapsuleTitle = (metadata: Record<string, unknown> | null, fallback: string): string => {
  if (!metadata) return fallback;
  const title = (metadata as { [key: string]: unknown }).title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  const name = (metadata as { [key: string]: unknown }).name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return fallback;
};

export const parseConfidenceRecord = (raw: unknown): Record<string, number> => {
  const values = new Map<string, number>();
  for (const field of CONFIDENCE_VECTOR_FIELDS) {
    values.set(field, 0);
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const asNumber = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
      if (!Number.isFinite(asNumber)) continue;
      values.set(key, Math.max(0, Math.min(1, asNumber)));
    }
  }

  return Object.fromEntries(values.entries()) as Record<string, number>;
};
