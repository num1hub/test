// @anchor arch:a2c.runtime links=flow:a2c.workspace-recon,arch:symphony.runtime,doc:a2c.reference note="Repo-native Anything-to-Capsules runtime index and canonical graph loader for N1Hub."
import fs from 'fs/promises';
import path from 'path';
import { computeIntegrityHash, isRecordObject } from '@/lib/validator/utils';
import type { A2CIndexPayload, CanonicalEdge, CanonicalNode } from './types';
import { parseConfidenceRecord, preferredCapsuleTitle } from './common';
import { resolveRuntimeLayout } from './layout';

const CAPTURE_RELATION_KEYS = ['recursive_layer', 'recursive'];

const isArrayOfObjects = (value: unknown): value is Array<Record<string, unknown>> =>
  Array.isArray(value) && value.every((item) => isRecordObject(item));

const resolveLinks = (payload: Record<string, unknown>): CanonicalEdge[] => {
  const edges: CanonicalEdge[] = [];

  for (const relationKey of CAPTURE_RELATION_KEYS) {
    const section = payload[relationKey];
    if (!isRecordObject(section)) continue;
    const links = section.links;
    if (!isArrayOfObjects(links)) continue;

    for (const raw of links) {
      const target = typeof raw.target_id === 'string' ? raw.target_id : typeof raw.target_capsule_id === 'string' ? raw.target_capsule_id : '';
      const rel = typeof raw.relation_type === 'string' ? raw.relation_type : typeof raw.rel === 'string' ? raw.rel : '';
      const source = typeof payload.metadata === 'object' && payload.metadata !== null ? (payload.metadata as Record<string, unknown>).capsule_id : '';
      if (!target || !rel || typeof source !== 'string') continue;
      edges.push({ source, target, relation: rel });
    }
  }

  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source}|${edge.relation}|${edge.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const extractNodeFromPayload = (
  payload: Record<string, unknown>,
  filePath: string,
  kbRoot: string,
  defaultType = 'capsule',
): CanonicalNode | null => {
  const metadata = isRecordObject(payload.metadata) ? payload.metadata : null;
  const neuro = isRecordObject(payload.neuro_concentrate) ? payload.neuro_concentrate : null;

  if (!metadata) return null;

  const capsuleId = typeof metadata.capsule_id === 'string' ? metadata.capsule_id.trim() : '';
  if (!capsuleId) return null;

  const status = typeof metadata.status === 'string' ? metadata.status : 'draft';
  const type = typeof metadata.type === 'string' ? metadata.type : defaultType;
  const title = preferredCapsuleTitle(metadata, path.parse(filePath).name);
  const summary = typeof neuro?.summary === 'string' ? neuro.summary : '';

  const keywords = isRecordObject(neuro) && Array.isArray(neuro.keywords)
    ? neuro.keywords.filter((item): item is string => typeof item === 'string')
    : [];
  const entities = isRecordObject(neuro) && Array.isArray(neuro.entities)
    ? neuro.entities.filter((item): item is string => typeof item === 'string')
    : [];
  const tags = isRecordObject(metadata) && Array.isArray(metadata.tags)
    ? metadata.tags.filter((item): item is string => typeof item === 'string')
    : [];

  const confidence = parseConfidenceRecord(isRecordObject(neuro) ? neuro.confidence_vector : undefined);
  const updatedAt = typeof metadata.updated_at === 'string'
    ? metadata.updated_at
    : typeof metadata.created_at === 'string'
      ? metadata.created_at
      : '';

  return {
    id: capsuleId,
    file: path.relative(kbRoot, filePath).replace(/\\/g, '/'),
    type,
    status,
    title,
    summary,
    keywords,
    entities,
    tags,
    updated_at: updatedAt,
    confidence_vector: confidence,
  };
};

export const loadIndex = async (kbRoot: string): Promise<A2CIndexPayload | null> => {
  const layout = resolveRuntimeLayout(kbRoot);
  try {
    const raw = await fs.readFile(layout.indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (isRecordObject(parsed)) {
      return parsed as A2CIndexPayload;
    }
    return null;
  } catch {
    return null;
  }
};

export const writeIndex = async (kbRoot: string, indexPayload: A2CIndexPayload): Promise<string> => {
  const layout = resolveRuntimeLayout(kbRoot);
  await fs.mkdir(path.dirname(layout.indexPath), { recursive: true });
  const payload = `${JSON.stringify(indexPayload, null, 2)}\n`;
  await fs.writeFile(layout.indexPath, payload, 'utf-8');
  return layout.indexPath;
};

export const buildIndex = async (kbRoot: string, defaultNodeType = 'capsule'): Promise<{ index: A2CIndexPayload; issues: string[]; written: boolean }> => {
  const layout = resolveRuntimeLayout(kbRoot);
  const issues: string[] = [];

  const allFiles = await fs.readdir(layout.vaultDir).catch(() => [] as string[]);
  const candidateFiles = allFiles.filter((name) => name.endsWith('.json') && !name.includes('@')).sort();

  const nodes: CanonicalNode[] = [];
  const seenNodeIds = new Set<string>();

  for (const fileName of candidateFiles) {
    const filePath = path.join(layout.vaultDir, fileName);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecordObject(parsed)) {
        issues.push(`${fileName}: not an object`);
        continue;
      }

      const node = extractNodeFromPayload(parsed, filePath, kbRoot, defaultNodeType);
      if (!node) {
        issues.push(`${fileName}: missing capsule metadata`);
        continue;
      }
      if (seenNodeIds.has(node.id)) {
        issues.push(`${fileName}: duplicate capsule_id`);
        continue;
      }
      seenNodeIds.add(node.id);
      nodes.push(node);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unreadable';
      issues.push(`${fileName}: ${message}`);
    }
  }

  const nodeById = new Map<string, CanonicalNode>();
  for (const node of nodes) nodeById.set(node.id, node);

  const edges: CanonicalEdge[] = [];
  for (const fileName of candidateFiles) {
    const filePath = path.join(layout.vaultDir, fileName);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecordObject(parsed)) continue;
      const sourceLinks = resolveLinks(parsed);
      for (const edge of sourceLinks) {
        const validTarget = nodeById.has(edge.target);
        if (!validTarget) {
          continue;
        }
        edges.push(edge);
      }
    } catch {
      continue;
    }
  }

  const generatedAt = new Date().toISOString();
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;
  const avgValidation =
    nodes.length > 0
      ? nodes.reduce((acc, node) => acc + (node.confidence_vector.validation_score ?? 0), 0) / nodes.length
      : 0;

  const index: A2CIndexPayload = {
    graph: {
      project: 'CapsuleOS Knowledge Base',
      version: '2.1.0',
      generated_at: generatedAt,
      nodes,
      edges,
      metrics: {
        total_nodes: nodeCount,
        total_edges: edgeCount,
        graph_density: Number(density.toFixed(6)),
        average_system_confidence: Number(avgValidation.toFixed(6)),
      },
    },
  };

  const indexPath = await writeIndex(kbRoot, index);

  return { index, issues, written: true };
};

export const verifyIndexGeometry = async (kbRoot: string): Promise<{ valid: boolean; error?: string; index: A2CIndexPayload | null }> => {
  const index = await loadIndex(kbRoot);
  if (!index) return { valid: false, error: 'No index available', index: null };
  if (!index.graph || !Array.isArray(index.graph.nodes) || !Array.isArray(index.graph.edges)) {
    return { valid: false, error: 'Invalid index schema', index };
  }
  return { valid: true, index };
};

export const rebuildIndex = async (kbRoot: string): Promise<A2CIndexPayload> => {
  const result = await buildIndex(kbRoot);
  if (result.issues.length > 0) {
    // keep canonical behavior: still writes partial index when issues exist
  }
  return result.index;
};

export { computeIntegrityHash };
