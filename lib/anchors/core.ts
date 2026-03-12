// @anchor interface:anchors.core-api links=interface:anchors.package-api,interface:anchors.metrics-api,interface:anchors.intelligence-api,invariant:anchors.root-docs-policy,script:extract.anchors,test:anchors.core-contract note="Deterministic extraction, rendering, and validation core for N1Hub anchor governance."
import fs from "node:fs";
import path from "node:path";

export type AnchorState = "active" | "experimental" | "deprecated";

export interface Anchor {
  id: string;
  category: string;
  name: string;
  file: string;
  line: number;
  links: string[];
  state: AnchorState;
  note: string;
}

export interface AnchorMeta {
  links: string[];
  state: AnchorState;
  note: string;
}

export interface AnchorIndexPayload {
  version: number;
  generated_at: string;
  root: string;
  anchor_count: number;
  anchors: Anchor[];
}

export interface ScanOptions {
  rootDir: string;
  includeExts?: ReadonlySet<string>;
  excludeDirs?: ReadonlySet<string>;
  excludeFiles?: ReadonlySet<string>;
  includeDirOverrides?: ReadonlySet<string>;
}

export interface ValidateOptions {
  spineChain?: readonly string[];
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  byId: Map<string, Anchor>;
}

export const DEFAULT_INCLUDE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".md",
]);

export const DEFAULT_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".tmp",
]);

const STALE_NODE_MODULES_PREFIX = "node_modules_stale_";

export const CAT_RE = /^[a-z][a-z0-9_-]*$/;
export const NAME_RE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
export const ANCHOR_LINE_RE =
  /@anchor\s+([A-Za-z][A-Za-z0-9_-]*):([^\s]+)\s*(.*)$/;

export const ALLOWED_STATES: ReadonlySet<AnchorState> = new Set([
  "active",
  "experimental",
  "deprecated",
]);

const MARKDOWN_EXT = ".md";
const FENCE_RE = /^\s*(```|~~~)/;
const MARKDOWN_COMMENT_ANCHOR_RE = /^\s*<!--\s*@anchor\b/;
const CODE_COMMENT_ANCHOR_RE = /^\s*(\/\/|\/\*|\*)\s*@anchor\b/;
const HTML_COMMENT_CLOSE = "-->";

const MERMAID_CLASS_DEFS = new Map<string, string>([
  ["arch", "#1d4ed8"],
  ["interface", "#0f766e"],
  ["invariant", "#b45309"],
  ["flow", "#047857"],
  ["script", "#7c3aed"],
  ["doc", "#475569"],
  ["test", "#b91c1c"],
]);

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function stripCommentClose(value: string): string {
  return value.endsWith(HTML_COMMENT_CLOSE)
    ? value.slice(0, -HTML_COMMENT_CLOSE.length)
    : value;
}

export function toPosixPath(filePath: string): string {
  if (typeof filePath !== "string") {
    throw new TypeError(`toPosixPath expected string, got ${typeof filePath}`);
  }
  return filePath.split(path.sep).join("/");
}

export function normalizeNewlines(text: string): string {
  if (typeof text !== "string") {
    throw new TypeError(
      `normalizeNewlines expected string, got ${typeof text}`,
    );
  }
  return text.replace(/\r\n/g, "\n");
}

export function normalizeAnchor(anchor: Partial<Anchor>): Anchor {
  const category = anchor.category ?? "unknown";
  const name = anchor.name ?? "unknown";
  return {
    id: anchor.id ?? `${category}:${name}`,
    category,
    name,
    file: anchor.file ?? "",
    line: anchor.line ?? 0,
    links: Array.isArray(anchor.links) ? anchor.links : [],
    state: (anchor.state ?? "active") as AnchorState,
    note: anchor.note ?? "",
  };
}

export function parseMeta(metaStr = ""): AnchorMeta {
  const source = metaStr || "";
  const meta: AnchorMeta = { links: [], state: "active", note: "" };

  const linksMatch = source.match(/\blinks=([^\s]+)/);
  if (linksMatch) {
    meta.links = linksMatch[1]
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => stripCommentClose(token));
  }

  const stateMatch = source.match(/\bstate=([^\s]+)/);
  if (stateMatch) {
    const parsed = stripCommentClose(stateMatch[1]);
    if (
      parsed === "active" ||
      parsed === "experimental" ||
      parsed === "deprecated"
    ) {
      meta.state = parsed;
    } else {
      meta.state = parsed as AnchorState;
    }
  }

  const noteMatch = source.match(/\bnote="([^"]+)"/);
  if (noteMatch) {
    meta.note = noteMatch[1];
  }

  return meta;
}

export function isCommentAnchorLine(line: string, ext: string): boolean {
  if (ext === MARKDOWN_EXT) return MARKDOWN_COMMENT_ANCHOR_RE.test(line);
  return CODE_COMMENT_ANCHOR_RE.test(line);
}

export function extractAnchorsFromText(file: string, content: string): Anchor[] {
  const relFile = toPosixPath(file);
  const lines = content.split(/\r?\n/);
  const isMarkdown = relFile.endsWith(MARKDOWN_EXT);
  let inFence = false;
  const anchors: Anchor[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (isMarkdown) {
      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
    }

    const match = line.match(ANCHOR_LINE_RE);
    if (!match) continue;

    const [, category, nameRaw, metaRaw] = match;
    const name = stripCommentClose(nameRaw);
    const meta = parseMeta(metaRaw);

    anchors.push({
      id: `${category}:${name}`,
      category,
      name,
      file: relFile,
      line: index + 1,
      links: meta.links,
      state: meta.state,
      note: meta.note,
    });
  }

  return anchors;
}

function shouldSkipDir(
  dirName: string,
  relPath: string,
  excludeDirs: ReadonlySet<string>,
  includeOverrides: ReadonlySet<string>,
): boolean {
  if (includeOverrides.has(relPath)) return false;
  if (dirName.toLowerCase().startsWith(STALE_NODE_MODULES_PREFIX)) return true;
  return excludeDirs.has(dirName);
}

export function scanAnchors(options: ScanOptions): Anchor[] {
  const includeExts = options.includeExts ?? DEFAULT_INCLUDE_EXTS;
  const excludeDirs = options.excludeDirs ?? DEFAULT_EXCLUDE_DIRS;
  const excludeFiles = options.excludeFiles ?? new Set<string>();
  const includeOverrides = options.includeDirOverrides ?? new Set<string>();
  const rootDir = path.resolve(options.rootDir);
  const anchors: Anchor[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => compareText(a.name, b.name));

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = toPosixPath(path.relative(rootDir, absPath));

      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name, relPath, excludeDirs, includeOverrides)) {
          continue;
        }
        walk(absPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!includeExts.has(path.extname(entry.name))) continue;
      if (excludeFiles.has(relPath)) continue;

      const text = fs.readFileSync(absPath, "utf8");
      anchors.push(...extractAnchorsFromText(relPath, text));
    }
  }

  walk(rootDir);
  return sortAnchors(anchors);
}

export function sortAnchors(anchors: readonly Anchor[]): Anchor[] {
  return [...anchors].sort((a, b) => {
    if (a.id !== b.id) return compareText(a.id, b.id);
    if (a.file !== b.file) return compareText(a.file, b.file);
    return a.line - b.line;
  });
}

export function renderAnchorMap(anchors: readonly Anchor[]): string {
  const grouped = new Map<string, Anchor[]>();
  for (const anchor of anchors) {
    if (!grouped.has(anchor.category)) grouped.set(anchor.category, []);
    grouped.get(anchor.category)?.push(anchor);
  }

  let out =
    "# Anchor Map\n\n" +
    "> Auto-generated. Do not hand-edit.\n" +
    "> See docs/ANCHORS_SPEC.md for governance rules.\n\n";

  for (const category of Array.from(grouped.keys()).sort(compareText)) {
    out += `## ${category}\n`;
    const items = sortAnchors(grouped.get(category) ?? []);
    for (const anchor of items) {
      const href = path.posix.relative("docs", anchor.file);
      const links =
        anchor.links.length > 0 ? ` (links: ${anchor.links.join(", ")})` : "";
      const note = anchor.note ? ` - ${anchor.note}` : "";
      out += `- \`${anchor.id}\` - [\`${anchor.file}:${anchor.line}\`](${href}#L${anchor.line})${links}${note}\n`;
    }
    out += "\n";
  }

  return out;
}

function toMermaidId(anchorId: string): string {
  return `A_${anchorId.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

export function renderAnchorGraphMermaid(anchors: readonly Anchor[]): string {
  const sorted = [...anchors].sort((a, b) => compareText(a.id, b.id));
  const edges: Array<{ from: string; to: string }> = [];

  for (const anchor of sorted) {
    for (const link of anchor.links) {
      edges.push({ from: anchor.id, to: link });
    }
  }
  edges.sort((a, b) => {
    if (a.from !== b.from) return compareText(a.from, b.from);
    return compareText(a.to, b.to);
  });

  let mermaid = "graph TD\n";
  mermaid += "%% Auto-generated. Do not hand-edit.\n\n";

  for (const [category, fill] of MERMAID_CLASS_DEFS.entries()) {
    mermaid += `classDef ${category} fill:${fill},stroke:#334155,stroke-width:1px;\n`;
  }
  mermaid += "classDef unknown fill:#cbd5e1,stroke:#334155,stroke-width:1px;\n\n";

  for (const anchor of sorted) {
    mermaid += `${toMermaidId(anchor.id)}["${anchor.id}"]\n`;
  }
  mermaid += "\n";

  for (const anchor of sorted) {
    const nodeId = toMermaidId(anchor.id);
    const klass = MERMAID_CLASS_DEFS.has(anchor.category)
      ? anchor.category
      : "unknown";
    mermaid += `class ${nodeId} ${klass};\n`;
  }
  mermaid += "\n";

  for (const edge of edges) {
    mermaid += `${toMermaidId(edge.from)} --> ${toMermaidId(edge.to)}\n`;
  }

  return mermaid;
}

export function buildAnchorIndexPayload(
  anchors: readonly Anchor[],
  version = 1,
  root = ".",
): AnchorIndexPayload {
  return {
    version,
    generated_at: new Date().toISOString(),
    root,
    anchor_count: anchors.length,
    anchors: sortAnchors(anchors),
  };
}

export function getChainErrors(
  chain: readonly string[],
  anchorsById: Map<string, { links?: readonly string[] }>,
): string[] {
  if (!Array.isArray(chain)) {
    throw new TypeError(`getChainErrors expected chain array, got ${typeof chain}`);
  }
  if (!(anchorsById instanceof Map)) {
    throw new TypeError(
      `getChainErrors expected anchorsById map, got ${typeof anchorsById}`,
    );
  }

  const errors: string[] = [];
  const lastIndex = chain.length - 1;

  for (let index = 0; index <= lastIndex; index += 1) {
    const id = chain[index];
    const anchor = anchorsById.get(id);
    if (!anchor) {
      errors.push(`Missing anchor for chain id '${id}'`);
      continue;
    }

    if (index === lastIndex) continue;
    const next = chain[index + 1];
    const links = anchor.links;
    if (!Array.isArray(links) || !links.includes(next)) {
      errors.push(`Missing chain link: '${id}' must link to '${next}'`);
    }
  }

  return errors;
}

export function validateAnchors(
  anchors: readonly Anchor[],
  options: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byId = new Map<string, Anchor>();
  const sorted = sortAnchors(anchors);

  for (const anchor of sorted) {
    if (!CAT_RE.test(anchor.category)) {
      errors.push(
        `Invalid category '${anchor.category}' in ${anchor.file}:${anchor.line} (id: ${anchor.id})`,
      );
    }
    if (!NAME_RE.test(anchor.name)) {
      errors.push(
        `Invalid name '${anchor.name}' in ${anchor.file}:${anchor.line} (id: ${anchor.id})`,
      );
    }
    if (!ALLOWED_STATES.has(anchor.state)) {
      errors.push(
        `Invalid state '${anchor.state}' in ${anchor.file}:${anchor.line} (id: ${anchor.id})`,
      );
    }

    if (byId.has(anchor.id)) {
      const first = byId.get(anchor.id) as Anchor;
      errors.push(
        `Duplicate anchor id '${anchor.id}' at ${anchor.file}:${anchor.line} (already at ${first.file}:${first.line})`,
      );
    } else {
      byId.set(anchor.id, anchor);
    }
  }

  let hasBrokenLinks = false;
  for (const anchor of sorted) {
    for (const linkedId of anchor.links) {
      if (!byId.has(linkedId)) {
        hasBrokenLinks = true;
        errors.push(
          `Broken link: '${anchor.id}' links to missing '${linkedId}' (${anchor.file}:${anchor.line})`,
        );
      }
    }
  }

  if (!hasBrokenLinks) {
    const inDegree = new Map<string, number>();
    for (const anchor of sorted) inDegree.set(anchor.id, 0);
    for (const anchor of sorted) {
      for (const linkedId of anchor.links) {
        if (!inDegree.has(linkedId)) continue;
        inDegree.set(linkedId, (inDegree.get(linkedId) ?? 0) + 1);
      }
    }

    const spineSet = new Set(options.spineChain ?? []);
    for (const anchor of sorted) {
      if (spineSet.has(anchor.id)) continue;
      if ((inDegree.get(anchor.id) ?? 0) === 0) {
        warnings.push(`Zombie anchor: ${anchor.id} (${anchor.file}:${anchor.line})`);
      }
    }
  }

  if (options.spineChain && options.spineChain.length > 0) {
    errors.push(...getChainErrors(options.spineChain, byId));
    for (const id of options.spineChain) {
      const anchor = byId.get(id);
      if (!anchor) continue;
      if (!Array.isArray(anchor.links) || anchor.links.length === 0) {
        errors.push(`Spine anchor '${id}' must have at least 1 outbound link`);
      }
    }
  }

  return { errors, warnings, byId };
}

export function validateCommentPlacement(
  rootDir: string,
  anchors: readonly Anchor[],
): string[] {
  const cache = new Map<string, string[]>();
  const errors: string[] = [];

  for (const anchor of anchors) {
    const absPath = path.join(rootDir, anchor.file);
    if (!cache.has(absPath)) {
      cache.set(absPath, fs.readFileSync(absPath, "utf8").split(/\r?\n/));
    }

    const lines = cache.get(absPath) ?? [];
    const line = lines[anchor.line - 1] ?? "";
    if (!isCommentAnchorLine(line, path.extname(anchor.file))) {
      errors.push(
        `Anchor is not in a comment at ${anchor.file}:${anchor.line} (id: ${anchor.id})`,
      );
    }
  }

  return errors;
}

export function headerThreshold(totalLines: number): number {
  if (!Number.isFinite(totalLines) || totalLines < 0) {
    throw new TypeError(
      `headerThreshold expected non-negative finite number, got ${totalLines}`,
    );
  }
  return Math.min(50, Math.max(15, Math.ceil(totalLines * 0.15)));
}

export function validateSpineHeaders(
  rootDir: string,
  anchors: readonly Anchor[],
  spineFiles: readonly string[],
): string[] {
  const errors: string[] = [];
  const byFile = new Map<string, Anchor[]>();
  for (const anchor of anchors) {
    if (!byFile.has(anchor.file)) byFile.set(anchor.file, []);
    byFile.get(anchor.file)?.push(anchor);
  }

  for (const spineFile of spineFiles) {
    const absPath = path.join(rootDir, spineFile);
    const totalLines = fs.readFileSync(absPath, "utf8").split(/\r?\n/).length;
    const threshold = headerThreshold(totalLines);
    const fileAnchors = byFile.get(spineFile) ?? [];
    const archLines = fileAnchors
      .filter((anchor) => anchor.category === "arch")
      .map((anchor) => anchor.line);
    const inHeader = archLines.filter((line) => line <= threshold);

    if (inHeader.length === 0) {
      const seen = archLines.join(", ") || "none";
      errors.push(
        `Spine header anchor missing in ${spineFile} (threshold=${threshold}, arch lines=${seen})`,
      );
    }
  }

  return errors;
}

export function isMapFresh(savedMap: string, anchors: readonly Anchor[]): boolean {
  return normalizeNewlines(savedMap) === normalizeNewlines(renderAnchorMap(anchors));
}

export function readIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    const cast = error as NodeJS.ErrnoException;
    if (cast.code === "ENOENT") return null;
    throw error;
  }
}

export function detectEol(text: string): "\n" | "\r\n" {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function normalizeEol(text: string, eol: "\n" | "\r\n"): string {
  if (eol === "\r\n") return text.replace(/\r?\n/g, "\r\n");
  return text.replace(/\r\n/g, "\n");
}

export function writeIfChanged(filePath: string, content: string): boolean {
  const existing = readIfExists(filePath);
  const eol = existing ? detectEol(existing) : "\n";
  const normalized = normalizeEol(content, eol);
  if (existing === normalized) return false;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalized);
  return true;
}

export function hasAnchorPayloadChanged(
  existingJson: string | null,
  anchors: readonly Anchor[],
): boolean {
  if (existingJson === null) return true;

  try {
    const parsed = JSON.parse(existingJson) as { anchors?: Partial<Anchor>[] };
    const prev = (parsed.anchors ?? []).map(normalizeAnchor);
    const next = sortAnchors(anchors).map(normalizeAnchor);
    return JSON.stringify(prev) !== JSON.stringify(next);
  } catch {
    return true;
  }
}
