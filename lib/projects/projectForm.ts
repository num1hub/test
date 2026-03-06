import { z } from 'zod';
import type { ProjectCapsule } from '@/types/project';

export const PROJECT_STATUSES = [
  'draft',
  'active',
  'sovereign',
  'frozen',
  'archived',
  'quarantined',
  'legacy',
] as const;

export type ProjectFormValues = {
  name: string;
  capsuleId: string;
  status: (typeof PROJECT_STATUSES)[number];
  author: string;
  summary: string;
  keywords: string;
  parentId: string;
};

export const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Project name is required.'),
    capsuleId: z.string().optional(),
    status: z.enum(PROJECT_STATUSES),
    author: z.string().min(1, 'Author is required.'),
    summary: z.string().min(1, 'Summary is required.'),
    keywords: z.string().min(1, 'Provide 5-15 comma-separated keywords.'),
    parentId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const words = data.summary.trim().split(/\s+/u).filter(Boolean).length;
    if (words < 70 || words > 160) {
      ctx.addIssue({
        code: 'custom',
        path: ['summary'],
        message: 'Summary must be between 70 and 160 words.',
      });
    }

    const keywords = data.keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (keywords.length < 5 || keywords.length > 15) {
      ctx.addIssue({
        code: 'custom',
        path: ['keywords'],
        message: 'Keywords must contain 5 to 15 entries.',
      });
    }

    if (data.status !== 'draft' && !data.parentId) {
      ctx.addIssue({
        code: 'custom',
        path: ['parentId'],
        message: 'Non-draft projects should have a parent to satisfy outbound-link requirements.',
      });
    }
  });

export const baseProjectConfidenceVector = {
  extraction: 1,
  synthesis: 1,
  linking: 0.95,
  provenance_coverage: 0.9,
  validation_score: 1,
  contradiction_pressure: 0,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function ensureProjectId(input: string): string {
  if (!input) return '';
  const normalized = input.trim();
  if (/^capsule\.project\.[a-z0-9-]+\.v\d+$/u.test(normalized)) {
    return normalized;
  }

  const base = normalized
    .replace(/^capsule\./u, '')
    .replace(/^project\./u, '')
    .replace(/\.v\d+$/u, '');

  const slug = slugify(base);
  return `capsule.project.${slug || 'untitled'}.v1`;
}

export function buildProjectSemanticHash(name: string, capsuleId: string): string {
  const seeds = `${name} ${capsuleId} project hub n1hub capsuleos sovereign knowledge graph`;
  const tokens = seeds
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const deduped: string[] = [];
  for (const token of tokens) {
    if (!deduped.includes(token)) deduped.push(token);
  }

  while (deduped.length < 8) {
    deduped.push(`n${deduped.length + 1}`);
  }

  return deduped.slice(0, 8).join('-');
}

export function extractExistingParentId(capsule?: ProjectCapsule): string {
  if (!capsule || !Array.isArray(capsule.recursive_layer.links)) return '';
  const parent = capsule.recursive_layer.links.find((link) => link.relation_type === 'part_of');
  return parent?.target_id ?? '';
}

export function buildProjectPayload(args: {
  initialData?: ProjectCapsule;
  values: ProjectFormValues;
  normalizedCapsuleId: string;
}): ProjectCapsule {
  const { initialData, values, normalizedCapsuleId } = args;
  const summary = values.summary.trim();
  const keywords = values.keywords
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const semanticHash = buildProjectSemanticHash(values.name, normalizedCapsuleId);

  const existingNonHierarchyLinks = (initialData?.recursive_layer.links ?? []).filter(
    (link) => link.relation_type !== 'part_of',
  );

  const recursiveLinks = [...existingNonHierarchyLinks];
  if (values.parentId) {
    recursiveLinks.push({
      target_id: values.parentId,
      relation_type: 'part_of',
    });
  }

  return {
    metadata: {
      capsule_id: normalizedCapsuleId,
      version: initialData?.metadata.version ?? '1.0.0',
      status: values.status,
      type: 'project',
      subtype: 'hub',
      author: values.author,
      created_at: initialData?.metadata.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: values.name,
      semantic_hash: semanticHash,
    },
    core_payload: {
      content_type: 'markdown',
      content:
        initialData?.core_payload.content ??
        `# ${values.name}\n\n${summary}\n\n## Scope\n- Define and orchestrate project-level outcomes.\n- Connect child capsules via part_of relations.\n- Preserve sovereign execution clarity.`,
    },
    neuro_concentrate: {
      summary,
      keywords,
      confidence_vector:
        initialData?.neuro_concentrate.confidence_vector ?? baseProjectConfidenceVector,
      semantic_hash: semanticHash,
    },
    recursive_layer: {
      links: recursiveLinks,
    },
    integrity_sha3_512:
      typeof initialData?.integrity_sha3_512 === 'string'
        ? initialData.integrity_sha3_512
        : '0'.repeat(128),
  };
}
