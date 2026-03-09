// @anchor interface:anchors.intelligence-api links=interface:anchors.package-api,interface:anchors.core-api,interface:anchors.scorecard-api,script:anchors.intelligence,test:anchors.intelligence-contract note="Graph topology analysis API for the N1Hub anchor graph."
import type { Anchor } from "./core";

export interface AnchorGraphIntelligence {
  anchorCount: number;
  edgeCount: number;
  brokenLinkCount: number;
  zeroInboundCount: number;
  weakComponentCount: number;
  reciprocalEdgeRatio: number;
  stronglyConnectedComponentCount: number;
  largestStronglyConnectedComponentSize: number;
  topOutDegree: Array<{ id: string; out: number }>;
  topInDegree: Array<{ id: string; in: number }>;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function buildAdjacency(anchors: readonly Anchor[]): {
  byId: Map<string, Anchor>;
  adj: Map<string, string[]>;
  inDegree: Map<string, number>;
  edgeCount: number;
  brokenLinkCount: number;
  reciprocalEdgeCount: number;
} {
  const byId = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const anchor of anchors) {
    inDegree.set(anchor.id, 0);
    adj.set(anchor.id, []);
  }

  let edgeCount = 0;
  let brokenLinkCount = 0;
  let reciprocalEdgeCount = 0;

  for (const anchor of anchors) {
    const links = anchor.links ?? [];
    const next: string[] = [];
    for (const linkedId of links) {
      edgeCount += 1;
      if (!byId.has(linkedId)) {
        brokenLinkCount += 1;
        continue;
      }
      next.push(linkedId);
      inDegree.set(linkedId, (inDegree.get(linkedId) ?? 0) + 1);
      if (byId.get(linkedId)?.links?.includes(anchor.id)) {
        reciprocalEdgeCount += 1;
      }
    }
    adj.set(anchor.id, next);
  }

  return {
    byId,
    adj,
    inDegree,
    edgeCount,
    brokenLinkCount,
    reciprocalEdgeCount,
  };
}

function countWeakComponents(adj: Map<string, string[]>): number {
  const undirected = new Map<string, Set<string>>();
  for (const id of adj.keys()) {
    undirected.set(id, new Set<string>());
  }
  for (const [from, links] of adj) {
    for (const to of links) {
      undirected.get(from)?.add(to);
      undirected.get(to)?.add(from);
    }
  }

  const visited = new Set<string>();
  let components = 0;
  for (const id of undirected.keys()) {
    if (visited.has(id)) continue;
    components += 1;
    const queue: string[] = [id];
    visited.add(id);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index] as string;
      for (const next of undirected.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return components;
}

function tarjanScc(adj: Map<string, string[]>): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const sccs: string[][] = [];

  const strongConnect = (id: string): void => {
    indices.set(id, index);
    low.set(id, index);
    index += 1;
    stack.push(id);
    onStack.add(id);

    for (const next of adj.get(id) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        low.set(id, Math.min(low.get(id) as number, low.get(next) as number));
      } else if (onStack.has(next)) {
        low.set(id, Math.min(low.get(id) as number, indices.get(next) as number));
      }
    }

    if ((low.get(id) as number) === (indices.get(id) as number)) {
      const component: string[] = [];
      while (true) {
        const node = stack.pop() as string;
        onStack.delete(node);
        component.push(node);
        if (node === id) break;
      }
      sccs.push(component);
    }
  };

  for (const id of adj.keys()) {
    if (!indices.has(id)) strongConnect(id);
  }

  return sccs;
}

export function analyzeAnchorGraph(
  anchors: readonly Anchor[],
): AnchorGraphIntelligence {
  const {
    adj,
    inDegree,
    edgeCount,
    brokenLinkCount,
    reciprocalEdgeCount,
  } = buildAdjacency(anchors);

  const zeroInboundCount = [...inDegree.values()].filter((value) => value === 0).length;
  const weakComponentCount = countWeakComponents(adj);
  const sccs = tarjanScc(adj);
  const largestStronglyConnectedComponentSize = sccs.reduce(
    (max, current) => Math.max(max, current.length),
    0,
  );

  const topOutDegree = [...anchors]
    .map((anchor) => ({ id: anchor.id, out: (adj.get(anchor.id) ?? []).length }))
    .sort((a, b) => b.out - a.out || compareText(a.id, b.id))
    .slice(0, 10);

  const topInDegree = [...inDegree.entries()]
    .map(([id, value]) => ({ id, in: value }))
    .sort((a, b) => b.in - a.in || compareText(a.id, b.id))
    .slice(0, 10);

  return {
    anchorCount: anchors.length,
    edgeCount,
    brokenLinkCount,
    zeroInboundCount,
    weakComponentCount,
    reciprocalEdgeRatio: edgeCount === 0 ? 0 : round(reciprocalEdgeCount / edgeCount, 3),
    stronglyConnectedComponentCount: sccs.length,
    largestStronglyConnectedComponentSize,
    topOutDegree,
    topInDegree,
  };
}
