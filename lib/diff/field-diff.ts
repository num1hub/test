import type { DiffOptions, FieldChange, SemanticTag } from '@/contracts/diff';
import type { SovereignCapsule } from '@/types/capsule';
import { normalizeConfidenceVector, stableHash } from '@/lib/validator/utils';
import type { ResolvedDiffOptions } from '@/lib/diff/types';
import {
  DEFAULT_DIFF_RECURSION_CAP,
  getDefaultIgnorePaths,
  isIgnoredPath,
  levenshteinDistance,
  normalizeForDiff,
} from '@/lib/diff/utils';

export interface ComparatorContext {
  capsuleId: string;
  capsuleType?: string;
  path: string[];
  pathString: string;
  options: Required<DiffOptions>;
}

export interface FieldComparator {
  id: string;
  matches: (ctx: ComparatorContext, left: unknown, right: unknown) => boolean;
  compare: (
    ctx: ComparatorContext,
    left: unknown,
    right: unknown,
    recurse: (l: unknown, r: unknown, nextPath: string[]) => FieldChange[],
  ) => FieldChange[];
}

const comparatorRegistry = new Map<string, FieldComparator>();
let builtinsRegistered = false;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const isPrimitive = (value: unknown): boolean => {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
};

const isNonTextPrimitive = (value: unknown): boolean => {
  return value === undefined || value === null || ['number', 'boolean'].includes(typeof value);
};

const isPrimitiveArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value) && value.every((item) => isPrimitive(item));
};

const isObjectArray = (value: unknown): value is Record<string, unknown>[] => {
  return Array.isArray(value) && value.every((item) => isRecord(item));
};

function semanticTagForPath(pathString: string): SemanticTag | undefined {
  if (pathString === '$.metadata.status') return 'status-transition';
  if (pathString === '$.metadata.priority') return 'priority-change';
  if (pathString === '$.metadata.dueDate') return 'due-date-change';
  if (pathString === '$.metadata.progress') return 'progress-change';
  if (
    pathString === '$.metadata.estimatedHours' ||
    pathString === '$.metadata.actualHours'
  ) {
    return 'effort-change';
  }
  if (
    pathString === '$.core_payload.content' ||
    pathString === '$.neuro_concentrate.summary'
  ) {
    return 'content-change';
  }
  if (
    pathString === '$.neuro_concentrate.confidence_vector' ||
    pathString.startsWith('$.neuro_concentrate.confidence_vector.')
  ) {
    return 'confidence-change';
  }
  return undefined;
}

function buildFieldChange(
  path: string,
  left: unknown,
  right: unknown,
): FieldChange {
  const changeType =
    left === undefined ? 'added' : right === undefined ? 'removed' : 'modified';

  return {
    path,
    oldValue: left,
    newValue: right,
    changeType,
    semanticTag: semanticTagForPath(path),
  };
}

function compareArrayMultiset(left: unknown[], right: unknown[]): boolean {
  const leftHashes = left.map((item) => stableHash(normalizeForDiff(item))).sort();
  const rightHashes = right.map((item) => stableHash(normalizeForDiff(item))).sort();
  if (leftHashes.length !== rightHashes.length) return false;
  return leftHashes.every((hash, index) => hash === rightHashes[index]);
}

function buildComparatorContext(
  capsuleId: string,
  capsuleType: string | undefined,
  path: string[],
  options: ResolvedDiffOptions,
): ComparatorContext {
  return {
    capsuleId,
    capsuleType,
    path,
    pathString: path.length === 0 ? '$' : `$.${path.join('.')}`,
    options: {
      scopeType: options.scopeType ?? 'vault',
      scopeRootId: options.scopeRootId ?? '',
      capsuleIds: options.capsuleIds ?? [],
      recursive: options.recursive,
      cascadeDeletes: options.cascadeDeletes,
      ignorePaths: options.ignorePaths ?? getDefaultIgnorePaths(),
      textMode: options.textMode,
    },
  };
}

function getComparators(): FieldComparator[] {
  if (!builtinsRegistered) {
    registerBuiltInComparators();
    builtinsRegistered = true;
  }
  return [...comparatorRegistry.values()];
}

export function registerFieldComparator(comp: FieldComparator): void {
  comparatorRegistry.set(comp.id, comp);
}

export function unregisterFieldComparator(id: string): void {
  comparatorRegistry.delete(id);
}

function registerBuiltInComparators(): void {
  const builtins: FieldComparator[] = [
    {
      id: 'ignored-path-comparator',
      matches: (ctx) => isIgnoredPath(ctx.pathString, ctx.options.ignorePaths),
      compare: () => [],
    },
    {
      id: 'confidence-vector-comparator',
      matches: (ctx) => ctx.pathString === '$.neuro_concentrate.confidence_vector',
      compare: (ctx, left, right, recurse) => {
        const normalizedLeft = normalizeConfidenceVector(
          left as Parameters<typeof normalizeConfidenceVector>[0],
        );
        const normalizedRight = normalizeConfidenceVector(
          right as Parameters<typeof normalizeConfidenceVector>[0],
        );

        if (stableHash(normalizedLeft) === stableHash(normalizedRight)) {
          return [];
        }

        if (!normalizedLeft || !normalizedRight) {
          return [buildFieldChange(ctx.pathString, left, right)];
        }

        return recurse(normalizedLeft, normalizedRight, ctx.path);
      },
    },
    {
      id: 'keywords-set-comparator',
      matches: (ctx) => ctx.pathString === '$.neuro_concentrate.keywords',
      compare: (ctx, left, right) => {
        const normalize = (value: unknown) =>
          [...new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])].sort();

        const leftKeywords = normalize(left);
        const rightKeywords = normalize(right);
        return stableHash(leftKeywords) === stableHash(rightKeywords)
          ? []
          : [buildFieldChange(ctx.pathString, leftKeywords, rightKeywords)];
      },
    },
    {
      id: 'links-skip-comparator',
      matches: (ctx) => ctx.pathString === '$.recursive_layer.links',
      compare: () => [],
    },
    {
      id: 'primitive-comparator',
      matches: (_ctx, left, right) => isNonTextPrimitive(left) && isNonTextPrimitive(right),
      compare: (ctx, left, right) =>
        Object.is(left, right) ? [] : [buildFieldChange(ctx.pathString, left, right)],
    },
    {
      id: 'text-comparator',
      matches: (_ctx, left, right) => typeof left === 'string' || typeof right === 'string',
      compare: (ctx, left, right) => {
        const leftText = typeof left === 'string' ? left : '';
        const rightText = typeof right === 'string' ? right : '';
        const isEqual =
          ctx.options.textMode === 'levenshtein'
            ? levenshteinDistance(leftText, rightText) === 0
            : leftText === rightText;
        return isEqual ? [] : [buildFieldChange(ctx.pathString, left, right)];
      },
    },
    {
      id: 'primitive-array-set-comparator',
      matches: (_ctx, left, right) => isPrimitiveArray(left) && isPrimitiveArray(right),
      compare: (ctx, left, right) => {
        const normalizedLeft = [...(left as unknown[])].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        );
        const normalizedRight = [...(right as unknown[])].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        );
        return stableHash(normalizedLeft) === stableHash(normalizedRight)
          ? []
          : [buildFieldChange(ctx.pathString, normalizedLeft, normalizedRight)];
      },
    },
    {
      id: 'object-array-set-comparator',
      matches: (_ctx, left, right) => isObjectArray(left) && isObjectArray(right),
      compare: (ctx, left, right) =>
        compareArrayMultiset(left as unknown[], right as unknown[])
          ? []
          : [buildFieldChange(ctx.pathString, left, right)],
    },
    {
      id: 'object-recursive-comparator',
      matches: (_ctx, left, right) =>
        (isRecord(left) && (isRecord(right) || right === undefined || right === null)) ||
        (isRecord(right) && (left === undefined || left === null)),
      compare: (_ctx, left, right, recurse) => {
        const leftRecord = isRecord(left) ? left : {};
        const rightRecord = isRecord(right) ? right : {};
        const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();

        return keys.flatMap((key) => recurse(leftRecord[key], rightRecord[key], [..._ctx.path, key]));
      },
    },
    {
      id: 'fallback-comparator',
      matches: () => true,
      compare: (ctx, left, right) =>
        stableHash(normalizeForDiff(left)) === stableHash(normalizeForDiff(right))
          ? []
          : [buildFieldChange(ctx.pathString, left, right)],
    },
  ];

  for (const comparator of builtins) {
    comparatorRegistry.set(comparator.id, comparator);
  }
}

/**
 * Field diffing routes every path through a comparator registry so new capsule
 * types can add semantics without modifying the core recursion logic.
 */
export function diffCapsuleFields(
  left: SovereignCapsule,
  right: SovereignCapsule,
  options: ResolvedDiffOptions = {
    branchA: 'real',
    branchB: 'real',
    scopeType: 'vault',
    recursive: false,
    cascadeDeletes: false,
    ignorePaths: getDefaultIgnorePaths(),
    textMode: 'exact',
    recursionDepthCap: DEFAULT_DIFF_RECURSION_CAP,
  },
): FieldChange[] {
  const ignorePaths = getDefaultIgnorePaths(options.ignorePaths);
  const normalizedOptions: ResolvedDiffOptions = {
    ...options,
    ignorePaths,
    recursionDepthCap: options.recursionDepthCap ?? DEFAULT_DIFF_RECURSION_CAP,
  };

  const recurse = (
    l: unknown,
    r: unknown,
    path: string[],
    depth: number,
  ): FieldChange[] => {
    if (depth > normalizedOptions.recursionDepthCap) {
      return [buildFieldChange(path.length === 0 ? '$' : `$.${path.join('.')}`, l, r)];
    }

    const capsuleId =
      (typeof right.metadata?.capsule_id === 'string' && right.metadata.capsule_id) ||
      left.metadata.capsule_id;
    const capsuleType =
      (typeof right.metadata?.type === 'string' && right.metadata.type) ||
      left.metadata.type;
    const ctx = buildComparatorContext(capsuleId, capsuleType, path, normalizedOptions);

    for (const comparator of getComparators()) {
      if (!comparator.matches(ctx, l, r)) continue;
      return comparator.compare(ctx, l, r, (nextLeft, nextRight, nextPath) =>
        recurse(nextLeft, nextRight, nextPath, depth + 1),
      );
    }

    return [];
  };

  return recurse(left, right, [], 0).filter((change) => change.path !== '$');
}
