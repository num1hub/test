import type { Issue, IssueBlockerRef } from './types';
import { asRecord } from './utils';

function trackerError(code: string, message: string, cause?: unknown): Error & { code: string; cause?: unknown } {
  const error = new Error(message) as Error & { code: string; cause?: unknown };
  error.code = code;
  error.cause = cause;
  return error;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function parsePriority(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function collectRelationNodes(value: unknown): Array<Record<string, unknown>> {
  const record = asRecord(value);
  const nodes = record?.nodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => item !== null);
}

function normalizeLabels(value: unknown): string[] {
  const record = asRecord(value);
  const nodes = record?.nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes
    .map((node) => asRecord(node))
    .flatMap((node) => {
      const name = asString(node?.name);
      return name ? [name.toLowerCase()] : [];
    });
}

function normalizeBlockedBy(value: unknown): IssueBlockerRef[] {
  const nodes = collectRelationNodes(value);
  return nodes.map((node) => {
    const issue = asRecord(node.issue) ?? asRecord(node.relatedIssue) ?? asRecord(node.sourceIssue) ?? null;
    return {
      id: asString(issue?.id),
      identifier: asString(issue?.identifier),
      state: asString(asRecord(issue?.state)?.name),
    };
  });
}

export function normalizeLinearIssue(node: unknown): Issue {
  const record = asRecord(node);
  if (!record) {
    throw trackerError('linear_unknown_payload', 'Issue payload is not an object');
  }

  const id = asString(record.id);
  const identifier = asString(record.identifier);
  const title = asString(record.title);
  const state = asString(asRecord(record.state)?.name);

  if (!id || !identifier || !title || !state) {
    throw trackerError('linear_unknown_payload', 'Issue payload is missing required fields');
  }

  return {
    id,
    identifier,
    title,
    description: asString(record.description),
    priority: parsePriority(record.priority),
    state,
    branch_name: asString(record.branchName ?? record.branch_name),
    url: asString(record.url),
    labels: normalizeLabels(record.labels),
    blocked_by: normalizeBlockedBy(record.inverseRelations ?? record.blockedBy ?? record.relations),
    created_at: parseTimestamp(record.createdAt ?? record.created_at),
    updated_at: parseTimestamp(record.updatedAt ?? record.updated_at),
  };
}

export async function readTrackerJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error: unknown) {
    throw trackerError('linear_unknown_payload', 'Linear returned invalid JSON', error);
  }
}

export { trackerError };
