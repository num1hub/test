import { queryVault } from './query';
import { loadIndex } from './index';
import { tokenize } from './common';

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export const extractToolCalls = (payload: string): ToolCall[] => {
  const toolCalls: ToolCall[] = [];
  const plainActionRegex = /^\s*action:\s*([a-zA-Z_][a-zA-Z0-9_-]*)\((.*?)\)\s*$/m;
  const jsonBlock = payload.match(/```json([\s\S]*?)```/i);

  if (jsonBlock) {
    const raw = jsonBlock[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          const name = String((item as { name?: unknown }).name ?? '').trim();
          const args = (item as { args?: Record<string, unknown> }).args ?? {};
          if (name) toolCalls.push({ name, args: typeof args === 'object' ? args : {} });
        }
      }
      return toolCalls;
    } catch {
      // continue
    }
  }

  const lines = payload.split(/\r?\n/);
  for (const line of lines) {
    const match = plainActionRegex.exec(line);
    if (!match) continue;
    const name = match[1];
    const argsText = (match[2] || '').trim();
    const args: Record<string, unknown> = {};
    if (argsText) {
      for (const chunk of argsText.split(',').map((item) => item.trim())) {
        const [rawKey, rawValue] = chunk.split(':').map((value) => value.trim());
        if (!rawKey) continue;
        args[rawKey.replace(/^"|"$/g, '')] = rawValue.replace(/^"|"$/g, '');
      }
    }
    toolCalls.push({ name, args });
  }

  return toolCalls;
};

export const queryGraph = async (input: {
  kbRoot: string;
  query: string;
  topK?: number;
}): Promise<{ related: Array<{ id: string; score: number; title: string }> }> => {
  const response = await queryVault({
    kbRoot: input.kbRoot,
    query: input.query,
    topK: input.topK,
  });
  return {
    related: response.rows.map((row) => ({
      id: row.capsule_id,
      score: row.score,
      title: row.title,
    })),
  };
};

const negationTerm = (text: string): string[] =>
  ['not ', 'no ', 'never', 'cannot', 'cannot ', 'instead of', 'contradict', 'opposite'];

export const checkContradiction = (left: string, right: string, relationPairs: string[] = []): boolean => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  if (shared.length >= 8) return false;
  const lowerLeft = left.toLowerCase();
  const lowerRight = right.toLowerCase();
  for (const marker of negationTerm('')) {
    if (lowerLeft.includes(marker) || lowerRight.includes(marker)) {
      if (lowerLeft.includes(marker) !== lowerRight.includes(marker)) return true;
    }
  }

  for (const pair of relationPairs) {
    const [a, b] = pair.toLowerCase().split('::');
    if (!a || !b) continue;
    if (leftTokens.has(a) && rightTokens.has(b)) return true;
  }

  return false;
};

export const runReactToolLoop = async (input: {
  kbRoot: string;
  query: string;
  maxSteps?: number;
}): Promise<{ finalAnswer: string; steps: number; toolCalls: ToolCall[] }> => {
  const maxSteps = input.maxSteps ?? 4;
  let steps = 0;
  let memory = '';
  const toolCalls: ToolCall[] = [];

  while (steps < maxSteps) {
    steps += 1;
    const graph = await queryGraph({ kbRoot: input.kbRoot, query: input.query, topK: 4 });
    if (graph.related.length === 0) {
      return {
        finalAnswer: `No strong graph neighbors for: ${input.query}`,
        steps,
        toolCalls,
      };
    }

    const top = graph.related[0];
    const contradiction = checkContradiction(input.query, top.title);
    if (contradiction) {
      memory += `contradiction with ${top.id}`;
      continue;
    }

    memory += `resolved=${top.id}`;
    break;
  }

  return {
    finalAnswer: memory || 'no actionable graph signal found',
    steps,
    toolCalls,
  };
};

export const loadGraphNodes = async (kbRoot: string): Promise<Array<{ id: string; title: string }>> => {
  const index = await loadIndex(kbRoot);
  if (!index) return [];
  return index.graph.nodes
    .map((node) => ({ id: node.id, title: node.title }))
    .filter((node) => Boolean(node.id));
};
