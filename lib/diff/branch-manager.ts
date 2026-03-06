import fs from 'fs/promises';
import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchName } from '@/types/branch';
import {
  isDefaultBranch,
  normalizeBranchName as normalizeBranchNameInput,
} from '@/types/branch';
import type { BranchManifest } from '@/contracts/diff';
import type { ScopeType } from '@/lib/diff/types';
import { dataPath } from '@/lib/dataPath';
import { saveVersionedCapsule } from '@/lib/versioning';

const CAPSULES_DIR = dataPath('capsules');
const BRANCHES_DIR = dataPath('branches');
const MAX_GRAPH_TRAVERSAL_NODES = 2_000;

interface LoadScopeOptions {
  scopeType?: ScopeType;
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive?: boolean;
}

interface EnsureCapsulesInBranchOptions {
  branch: BranchName;
  capsuleIds: string[];
  sourceBranch: BranchName;
  description?: string;
  scopeSeed?: {
    scopeType: ScopeType;
    scopeRootId?: string;
    recursive?: boolean;
  };
}

interface TombstoneRecord {
  capsuleId: string;
  branch: BranchName;
  deletedAt: string;
  reason?: string;
}

function sanitizeValue(value: string): string {
  return path.basename(value.trim());
}

function isCapsule(value: unknown): value is SovereignCapsule {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const metadata =
    candidate.metadata && typeof candidate.metadata === 'object'
      ? (candidate.metadata as Record<string, unknown>)
      : null;
  return Boolean(
    metadata?.capsule_id &&
      candidate.core_payload &&
      candidate.neuro_concentrate &&
      candidate.recursive_layer &&
      candidate.integrity_sha3_512,
  );
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function parseBranchFilename(file: string): {
  capsuleId: string;
  branch: BranchName;
  isTombstone: boolean;
  isLegacyDream: boolean;
  isReal: boolean;
} | null {
  const tombstoneMatch = file.match(/^(.+?)@([a-z0-9][a-z0-9._-]{0,63})\.tombstone\.json$/);
  if (tombstoneMatch) {
    return {
      capsuleId: tombstoneMatch[1],
      branch: tombstoneMatch[2],
      isTombstone: true,
      isLegacyDream: false,
      isReal: false,
    };
  }

  const canonicalMatch = file.match(/^(.+?)@([a-z0-9][a-z0-9._-]{0,63})\.json$/);
  if (canonicalMatch) {
    return {
      capsuleId: canonicalMatch[1],
      branch: canonicalMatch[2],
      isTombstone: false,
      isLegacyDream: false,
      isReal: false,
    };
  }

  const legacyDreamMatch = file.match(/^(.+?)\.dream\.json$/);
  if (legacyDreamMatch) {
    return {
      capsuleId: legacyDreamMatch[1],
      branch: 'dream',
      isTombstone: false,
      isLegacyDream: true,
      isReal: false,
    };
  }

  if (file.endsWith('.json')) {
    return {
      capsuleId: file.replace(/\.json$/, ''),
      branch: 'real',
      isTombstone: false,
      isLegacyDream: false,
      isReal: true,
    };
  }

  return null;
}

async function listCapsuleFiles(): Promise<string[]> {
  try {
    return await fs.readdir(CAPSULES_DIR);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function readRealCapsules(): Promise<SovereignCapsule[]> {
  const files = (await listCapsuleFiles())
    .map((file) => ({ file, parsed: parseBranchFilename(file) }))
    .filter((entry) => entry.parsed?.isReal)
    .map((entry) => entry.file)
    .sort((left, right) => left.localeCompare(right));

  const capsules = await Promise.all(
    files.map((file) => readJsonFile<SovereignCapsule>(path.join(CAPSULES_DIR, file))),
  );
  return capsules.filter(isCapsule);
}

function getChildrenMap(capsules: SovereignCapsule[]): Map<string, string[]> {
  const childrenMap = new Map<string, string[]>();

  for (const capsule of capsules) {
    const links = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links : [];
    for (const link of links) {
      if (link.relation_type !== 'part_of' || typeof link.target_id !== 'string') continue;
      const children = childrenMap.get(link.target_id) ?? [];
      children.push(capsule.metadata.capsule_id);
      childrenMap.set(link.target_id, children);
    }
  }

  return childrenMap;
}

function collectScopedIds(capsules: SovereignCapsule[], options: LoadScopeOptions = {}): string[] {
  const allIds = capsules
    .map((capsule) => capsule.metadata.capsule_id)
    .sort((left, right) => left.localeCompare(right));

  if (!options.scopeType || options.scopeType === 'vault') {
    if (!options.capsuleIds?.length && !options.scopeRootId) {
      return allIds;
    }
  }

  const seeds = new Set<string>();
  if (options.scopeRootId?.trim()) seeds.add(options.scopeRootId.trim());
  for (const capsuleId of options.capsuleIds ?? []) {
    if (capsuleId.trim()) seeds.add(capsuleId.trim());
  }

  if (seeds.size === 0) {
    return allIds;
  }
  if (!options.recursive) {
    return [...seeds].sort((left, right) => left.localeCompare(right));
  }

  const childrenMap = getChildrenMap(capsules);
  const visited = new Set<string>();
  const stack = [...seeds];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (visited.size > MAX_GRAPH_TRAVERSAL_NODES) {
      throw new Error('Scope traversal exceeded maximum node cap');
    }

    const children = childrenMap.get(current) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) stack.push(childId);
    }
  }

  return [...visited].sort((left, right) => left.localeCompare(right));
}

async function readRealCapsule(capsuleId: string): Promise<SovereignCapsule | null> {
  try {
    const capsule = await readJsonFile<SovereignCapsule>(getRealCapsulePath(capsuleId));
    return isCapsule(capsule) ? capsule : null;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeExplicitBranchCapsule(capsule: SovereignCapsule, branch: BranchName): Promise<void> {
  await writeJsonFile(getCanonicalBranchPath(capsule.metadata.capsule_id, branch), {
    ...capsule,
    metadata: {
      ...capsule.metadata,
      capsule_id: sanitizeValue(capsule.metadata.capsule_id),
    },
  });
}

async function removeFileIfPresent(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removeBranchArtifacts(capsuleId: string, branch: BranchName): Promise<void> {
  await removeFileIfPresent(getCanonicalBranchPath(capsuleId, branch));
  if (branch === 'dream') {
    await removeFileIfPresent(getLegacyDreamPath(capsuleId));
  }
}

export async function removeExplicitBranchCapsule(
  capsuleId: string,
  branch: BranchName,
): Promise<void> {
  if (isRealBranch(branch)) return;
  await removeBranchArtifacts(capsuleId, normalizeBranchName(branch));
  await removeFileIfPresent(getTombstonePath(capsuleId, branch));
}

/** Overlay dematerialization removes explicit files and can also prune manifest membership for hard deletes. */
export async function dematerializeOverlayCapsule(
  capsuleId: string,
  branch: BranchName,
  options: { removeFromManifest?: boolean } = {},
): Promise<void> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    throw new Error('Real branch cannot be dematerialized');
  }

  await removeExplicitBranchCapsule(capsuleId, normalizedBranch);

  if (!options.removeFromManifest) return;

  const manifest = await readBranchManifest(normalizedBranch);
  if (!manifest) return;
  await writeBranchManifest({
    ...manifest,
    capsuleIds: manifest.capsuleIds.filter((entry) => entry !== sanitizeValue(capsuleId)),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Normalizes branch names before any file-system access so branch-derived paths
 * stay canonical and safe regardless of which API entry point supplied them.
 */
export function normalizeBranchName(value: string): BranchName {
  const normalized = normalizeBranchNameInput(value);
  if (!normalized) {
    throw new Error('Invalid branch name');
  }
  return normalized;
}

/** Real is the implicit baseline branch and never gets a manifest. */
export function isRealBranch(branch: BranchName): boolean {
  return normalizeBranchName(branch) === 'real';
}

/** Real capsules keep their historical unsuffixed filenames for compatibility. */
export function getRealCapsulePath(capsuleId: string): string {
  return path.join(CAPSULES_DIR, `${sanitizeValue(capsuleId)}.json`);
}

/** Canonical non-real overlays use @branch filenames so scanners can exclude them deterministically. */
export function getCanonicalBranchPath(capsuleId: string, branch: BranchName): string {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    return getRealCapsulePath(capsuleId);
  }
  return path.join(CAPSULES_DIR, `${sanitizeValue(capsuleId)}@${sanitizeValue(normalizedBranch)}.json`);
}

/** Dream keeps a legacy read path until migration rewrites old files in place. */
export function getLegacyDreamPath(capsuleId: string): string {
  return path.join(CAPSULES_DIR, `${sanitizeValue(capsuleId)}.dream.json`);
}

/** Tombstones live beside branch files so deletion state survives manifest damage. */
export function getTombstonePath(capsuleId: string, branch: BranchName): string {
  return path.join(
    CAPSULES_DIR,
    `${sanitizeValue(capsuleId)}@${sanitizeValue(normalizeBranchName(branch))}.tombstone.json`,
  );
}

/** Base snapshots are immutable lineage anchors for three-way merge conflict checks. */
export function getBaseSnapshotPath(capsuleId: string, branch: BranchName): string {
  return path.join(
    BRANCHES_DIR,
    sanitizeValue(normalizeBranchName(branch)),
    `${sanitizeValue(capsuleId)}.base.json`,
  );
}

export async function readBaseSnapshot(
  capsuleId: string,
  branch: BranchName,
): Promise<SovereignCapsule | null> {
  try {
    const payload = await readJsonFile<SovereignCapsule & { _branch_base?: unknown }>(
      getBaseSnapshotPath(capsuleId, branch),
    );
    if (isCapsule(payload)) return payload;
    if (payload && typeof payload === 'object') {
      const payloadRecord = payload as Record<string, unknown>;
      if (!isCapsule({ ...payloadRecord, _branch_base: undefined })) {
        return null;
      }
      const capsule = { ...payloadRecord };
      delete capsule._branch_base;
      return capsule as SovereignCapsule;
    }
    return null;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function parseCapsuleBranchFilename(file: string): {
  capsuleId: string;
  branch: BranchName;
  isTombstone: boolean;
  isLegacyDream: boolean;
  isReal: boolean;
} | null {
  return parseBranchFilename(file);
}

/**
 * Branch metadata is stored separately from capsules because the validator
 * enforces a strict five-root JSON structure for every capsule document.
 */
export async function readBranchManifest(branch: BranchName): Promise<BranchManifest | null> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') return null;

  try {
    return await readJsonFile<BranchManifest>(
      path.join(BRANCHES_DIR, `${sanitizeValue(normalizedBranch)}.manifest.json`),
    );
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Manifest writes are centralized so routes never need to know where branch
 * membership, lineage, or descriptions live on disk.
 */
export async function writeBranchManifest(manifest: BranchManifest): Promise<void> {
  const normalizedBranch = normalizeBranchName(manifest.name);
  if (normalizedBranch === 'real') {
    throw new Error('Real branch does not use a manifest');
  }

  await writeJsonFile(path.join(BRANCHES_DIR, `${sanitizeValue(normalizedBranch)}.manifest.json`), {
    ...manifest,
    name: normalizedBranch,
    sourceBranch: normalizeBranchName(manifest.sourceBranch),
    capsuleIds: [...new Set(manifest.capsuleIds)].sort((left, right) => left.localeCompare(right)),
  });
}

/** Explicit existence still honors legacy dream files so the current UI keeps reading pre-migration state. */
export async function branchFileExists(capsuleId: string, branch: BranchName): Promise<boolean> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    return pathExists(getRealCapsulePath(capsuleId));
  }
  if (await pathExists(getCanonicalBranchPath(capsuleId, normalizedBranch))) {
    return true;
  }
  return normalizedBranch === 'dream' ? pathExists(getLegacyDreamPath(capsuleId)) : false;
}

/** Tombstones must shadow real fallback reads before any overlay file lookup. */
export async function tombstoneExists(capsuleId: string, branch: BranchName): Promise<boolean> {
  return pathExists(getTombstonePath(capsuleId, branch));
}

/**
 * Reads the effective branch value using sparse overlay semantics rather than
 * forcing every inherited capsule to be copied into every branch.
 */
export async function readOverlayCapsule(
  capsuleId: string,
  branch: BranchName,
): Promise<SovereignCapsule | null> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    return readRealCapsule(capsuleId);
  }
  if (await tombstoneExists(capsuleId, normalizedBranch)) {
    return null;
  }

  const canonicalPath = getCanonicalBranchPath(capsuleId, normalizedBranch);
  if (await pathExists(canonicalPath)) {
    const capsule = await readJsonFile<SovereignCapsule>(canonicalPath);
    return isCapsule(capsule) ? capsule : null;
  }

  if (normalizedBranch === 'dream' && (await pathExists(getLegacyDreamPath(capsuleId)))) {
    const capsule = await readJsonFile<SovereignCapsule>(getLegacyDreamPath(capsuleId));
    return isCapsule(capsule) ? capsule : null;
  }

  return readRealCapsule(capsuleId);
}

/**
 * Non-real writes update only explicit overlay files and manifests so branches
 * remain sparse instead of turning into full vault copies after the first edit.
 */
export async function writeOverlayCapsule(
  capsule: SovereignCapsule,
  branch: BranchName,
): Promise<void> {
  const normalizedBranch = normalizeBranchName(branch);
  const normalizedCapsule: SovereignCapsule = {
    ...capsule,
    metadata: {
      ...capsule.metadata,
      capsule_id: sanitizeValue(capsule.metadata.capsule_id),
    },
  };

  if (normalizedBranch === 'real') {
    await saveVersionedCapsule(normalizedCapsule, { branch: 'real' });
    return;
  }

  const manifest = await readBranchManifest(normalizedBranch);
  if (!manifest) {
    const error = new Error(`Branch "${normalizedBranch}" does not exist`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }

  await removeBranchArtifacts(normalizedCapsule.metadata.capsule_id, normalizedBranch);
  await removeFileIfPresent(getTombstonePath(normalizedCapsule.metadata.capsule_id, normalizedBranch));
  await saveVersionedCapsule(normalizedCapsule, { branch: normalizedBranch });
  await writeBranchManifest({
    ...manifest,
    capsuleIds: [...new Set([...manifest.capsuleIds, normalizedCapsule.metadata.capsule_id])],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Tombstones exist outside capsule JSON because deletion state and branch
 * ancestry cannot be persisted inside the validator-protected root structure.
 */
export async function tombstoneCapsule(
  capsuleId: string,
  branch: BranchName,
  reason?: string,
): Promise<void> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    throw new Error('Real branch deletions must remove the canonical file directly');
  }

  const manifest = await readBranchManifest(normalizedBranch);
  if (!manifest) {
    const error = new Error(`Branch "${normalizedBranch}" does not exist`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }

  await removeBranchArtifacts(capsuleId, normalizedBranch);
  await writeJsonFile(getTombstonePath(capsuleId, normalizedBranch), {
    capsuleId: sanitizeValue(capsuleId),
    branch: normalizedBranch,
    deletedAt: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  } satisfies TombstoneRecord);

  await writeBranchManifest({
    ...manifest,
    capsuleIds: [...new Set([...manifest.capsuleIds, sanitizeValue(capsuleId)])],
    updatedAt: new Date().toISOString(),
  });
}

/** Materialized branch listings intentionally exclude inherited real capsules and legacy dream aliases. */
export async function listExplicitBranchCapsules(branch: BranchName): Promise<SovereignCapsule[]> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    return readRealCapsules();
  }

  const files = await listCapsuleFiles();
  const capsules = await Promise.all(
    files
      .map((file) => ({ file, parsed: parseBranchFilename(file) }))
      .filter((entry) => {
        return (
          entry.parsed &&
          entry.parsed.branch === normalizedBranch &&
          !entry.parsed.isTombstone &&
          !entry.parsed.isLegacyDream &&
          !entry.parsed.isReal
        );
      })
      .sort((left, right) => left.file.localeCompare(right.file))
      .map(async (entry) => readJsonFile<SovereignCapsule>(path.join(CAPSULES_DIR, entry.file))),
  );

  return capsules.filter(isCapsule);
}

/**
 * Overlay graph loading starts from real and then applies branch overrides plus
 * tombstones so every reader sees identical sparse-branch semantics.
 */
export async function loadOverlayGraph(
  branch: BranchName,
  options: LoadScopeOptions = {},
): Promise<SovereignCapsule[]> {
  const normalizedBranch = normalizeBranchName(branch);
  const realCapsules = await readRealCapsules();
  const overlay = new Map<string, SovereignCapsule>(
    realCapsules.map((capsule) => [capsule.metadata.capsule_id, capsule] as const),
  );

  if (normalizedBranch !== 'real') {
    const files = await listCapsuleFiles();
    const branchFiles = files
      .map((file) => ({ file, parsed: parseBranchFilename(file) }))
      .filter(
        (entry): entry is {
          file: string;
          parsed: NonNullable<ReturnType<typeof parseBranchFilename>>;
        } => Boolean(entry.parsed && entry.parsed.branch === normalizedBranch && !entry.parsed.isReal),
      )
      .sort((left, right) => left.file.localeCompare(right.file));

    for (const entry of branchFiles) {
      if (entry.parsed.isTombstone) {
        overlay.delete(entry.parsed.capsuleId);
        continue;
      }

      const canonicalExists = await pathExists(
        getCanonicalBranchPath(entry.parsed.capsuleId, normalizedBranch),
      );
      if (entry.parsed.isLegacyDream && canonicalExists) {
        continue;
      }

      const capsule = await readJsonFile<SovereignCapsule>(path.join(CAPSULES_DIR, entry.file));
      if (isCapsule(capsule)) {
        overlay.set(entry.parsed.capsuleId, capsule);
      }
    }
  }

  const scopedIds = new Set(collectScopedIds([...overlay.values()], options));
  return [...overlay.values()]
    .filter((capsule) => scopedIds.has(capsule.metadata.capsule_id))
    .sort((left, right) => left.metadata.capsule_id.localeCompare(right.metadata.capsule_id));
}

/** Branch-aware validation needs the effective overlay membership, not just real capsule IDs. */
export async function getOverlayExistenceSet(branch: BranchName): Promise<Set<string>> {
  const capsules = await loadOverlayGraph(branch);
  return new Set(capsules.map((capsule) => capsule.metadata.capsule_id));
}

/**
 * Branch creation writes explicit files only for the requested scope and stores
 * immutable base snapshots so later merges can remain true three-way merges.
 */
export async function createBranch(opts: {
  newBranchName: BranchName;
  sourceBranch: BranchName;
  scopeType: ScopeType;
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive?: boolean;
  description?: string;
}): Promise<BranchManifest> {
  const newBranchName = normalizeBranchName(opts.newBranchName);
  const sourceBranch = normalizeBranchName(opts.sourceBranch);

  if (newBranchName === 'real') {
    throw new Error('Real branch cannot be created');
  }
  if (await readBranchManifest(newBranchName)) {
    const error = new Error(`Branch "${newBranchName}" already exists`) as NodeJS.ErrnoException;
    error.code = 'EEXIST';
    throw error;
  }

  const sourceGraph = await loadOverlayGraph(sourceBranch, { recursive: true });
  const scopedIds = collectScopedIds(sourceGraph, {
    scopeType: opts.scopeType,
    scopeRootId: opts.scopeRootId,
    capsuleIds: opts.capsuleIds,
    recursive: opts.recursive ?? true,
  });

  if (scopedIds.length === 0) {
    const error = new Error('Requested branch scope is empty') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }

  const now = new Date().toISOString();
  const manifest: BranchManifest = {
    name: newBranchName,
    sourceBranch,
    sourceProjectId: opts.scopeType === 'project' ? opts.scopeRootId ?? null : null,
    capsuleIds: scopedIds,
    createdAt: now,
    updatedAt: now,
    ...(opts.description ? { description: opts.description } : {}),
  };

  await writeBranchManifest(manifest);
  await ensureDir(path.join(BRANCHES_DIR, sanitizeValue(newBranchName)));

  for (const capsuleId of scopedIds) {
    const capsule = await readOverlayCapsule(capsuleId, sourceBranch);
    if (!capsule) continue;
    await writeExplicitBranchCapsule(capsule, newBranchName);
    const basePath = getBaseSnapshotPath(capsuleId, newBranchName);
    if (!(await pathExists(basePath))) {
      await writeJsonFile(basePath, capsule);
    }
  }

  return manifest;
}

/**
 * Branch deletion removes only overlay artifacts and manifests so deleting a
 * branch can never mutate the real capsule baseline.
 */
export async function deleteBranch(branch: BranchName, force: boolean = false): Promise<void> {
  const normalizedBranch = normalizeBranchName(branch);
  if (normalizedBranch === 'real') {
    throw new Error('Real branch cannot be deleted');
  }

  const manifest = await readBranchManifest(normalizedBranch);
  if (!manifest && !force) {
    const error = new Error(`Branch "${normalizedBranch}" does not exist`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }

  const files = await listCapsuleFiles();
  for (const file of files) {
    const parsed = parseBranchFilename(file);
    if (!parsed || parsed.branch !== normalizedBranch || parsed.isReal) continue;
    await removeFileIfPresent(path.join(CAPSULES_DIR, file));
  }

  await fs.rm(path.join(BRANCHES_DIR, sanitizeValue(normalizedBranch)), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(BRANCHES_DIR, `${sanitizeValue(normalizedBranch)}.manifest.json`), {
    force: true,
  });
}

/**
 * Legacy fork flows instantiate branches lazily, so this helper creates the
 * manifest on first use and seeds only the requested capsule set.
 */
export async function ensureCapsulesInBranch(
  options: EnsureCapsulesInBranchOptions,
): Promise<BranchManifest> {
  const branch = normalizeBranchName(options.branch);
  const sourceBranch = normalizeBranchName(options.sourceBranch);
  const capsuleIds = [...new Set(options.capsuleIds.map((capsuleId) => sanitizeValue(capsuleId)))].sort(
    (left, right) => left.localeCompare(right),
  );

  if (branch === 'real') {
    throw new Error('Real branch cannot be lazily materialized');
  }

  for (const capsuleId of capsuleIds) {
    if (await pathExists(getCanonicalBranchPath(capsuleId, branch))) {
      const error = new Error(`Capsule "${capsuleId}" is already materialized in ${branch}`) as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      throw error;
    }
  }

  let manifest = await readBranchManifest(branch);
  if (!manifest) {
    manifest = await createBranch({
      newBranchName: branch,
      sourceBranch,
      scopeType: options.scopeSeed?.scopeType ?? 'capsule',
      scopeRootId: options.scopeSeed?.scopeRootId ?? capsuleIds[0],
      capsuleIds,
      recursive: options.scopeSeed?.recursive ?? false,
      description: options.description,
    });

    const allPresent = await Promise.all(
      capsuleIds.map((capsuleId) => pathExists(getCanonicalBranchPath(capsuleId, branch))),
    );
    if (allPresent.every(Boolean)) {
      return manifest;
    }
  }

  const nextIds = new Set(manifest.capsuleIds);
  for (const capsuleId of capsuleIds) {
    if (await pathExists(getCanonicalBranchPath(capsuleId, branch))) continue;
    const capsule = await readOverlayCapsule(capsuleId, sourceBranch);
    if (!capsule) continue;
    await writeExplicitBranchCapsule(capsule, branch);
    const basePath = getBaseSnapshotPath(capsuleId, branch);
    if (!(await pathExists(basePath))) {
      await writeJsonFile(basePath, capsule);
    }
    nextIds.add(capsuleId);
  }

  const nextManifest: BranchManifest = {
    ...manifest,
    capsuleIds: [...nextIds].sort((left, right) => left.localeCompare(right)),
    updatedAt: new Date().toISOString(),
  };
  await writeBranchManifest(nextManifest);
  return nextManifest;
}

/** Branch selectors synthesize default branches with discovered manifests so the UI can always include real. */
export async function listBranches(): Promise<BranchManifest[]> {
  try {
    const files = await fs.readdir(BRANCHES_DIR);
    const manifests = await Promise.all(
      files
        .filter((file) => file.endsWith('.manifest.json'))
        .sort((left, right) => left.localeCompare(right))
        .map((file) => readJsonFile<BranchManifest>(path.join(BRANCHES_DIR, file))),
    );

    return manifests.filter((manifest) => manifest.name !== 'real');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function listBranchCapsuleIds(branch: BranchName): Promise<string[]> {
  return (await loadOverlayGraph(branch)).map((capsule) => capsule.metadata.capsule_id);
}

export async function getBranchInfo(branch: BranchName): Promise<{
  manifest: BranchManifest | null;
  materialized: number;
  tombstoned: number;
  isDefault: boolean;
}> {
  const normalizedBranch = normalizeBranchName(branch);
  const manifest = normalizedBranch === 'real' ? null : await readBranchManifest(normalizedBranch);
  const files = await listCapsuleFiles();

  let materialized = 0;
  let tombstoned = 0;

  for (const file of files) {
    const parsed = parseBranchFilename(file);
    if (!parsed || parsed.branch !== normalizedBranch || parsed.isReal) continue;
    if (parsed.isTombstone) tombstoned += 1;
    else if (!parsed.isLegacyDream) materialized += 1;
  }

  return {
    manifest,
    materialized,
    tombstoned,
    isDefault: isDefaultBranch(normalizedBranch),
  };
}
