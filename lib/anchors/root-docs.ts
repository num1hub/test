// @anchor invariant:anchors.root-docs-policy links=interface:anchors.package-api,doc:governance.anchors-spec,script:verify.root-docs,interface:anchors.core-api,test:anchors.root-docs-contract note="Root-doc triad validation keeps README, AGENTS, and CODEX aligned with the wider N1Hub instruction stack."
import {
  ROOT_DOC_REQUIRED_COMMANDS,
  ROOT_DOC_REQUIRED_MENTIONS,
} from "./config";

export interface RootDocsBundle {
  readme: string;
  agents: string;
  codex: string;
}

export interface RootDocsPolicy {
  requiredAnchorIds: Readonly<{
    readme: string;
    agents: string;
    codex: string;
  }>;
  requiredCommands: readonly string[];
  requiredMentions: Readonly<{
    readme: readonly string[];
    agents: readonly string[];
    codex: readonly string[];
  }>;
}

export interface RootDocsValidationResult {
  errors: string[];
  warnings: string[];
  anchorsByDoc: Readonly<{
    readme: string[];
    agents: string[];
    codex: string[];
  }>;
  commandCoverage: Readonly<Record<string, string[]>>;
}

const DOC_KEYS = ["readme", "agents", "codex"] as const;
type DocKey = (typeof DOC_KEYS)[number];

export const DEFAULT_ROOT_DOCS_POLICY: RootDocsPolicy = {
  requiredAnchorIds: {
    readme: "doc:n1hub.readme",
    agents: "doc:n1hub.agents",
    codex: "doc:n1hub.codex",
  },
  requiredCommands: ROOT_DOC_REQUIRED_COMMANDS,
  requiredMentions: ROOT_DOC_REQUIRED_MENTIONS,
};

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new TypeError(
      `Root docs bundle field '${fieldName}' must be a string, got ${typeof value}`,
    );
  }
  return value;
}

export function extractMarkdownAnchorIds(text: string): string[] {
  const source = ensureString(text, "text");
  const ids: string[] = [];
  const re = /<!--\s*@anchor\s+([A-Za-z][A-Za-z0-9_-]*:[^\s]+)\b/g;
  let match: RegExpExecArray | null = re.exec(source);

  while (match) {
    ids.push(match[1]);
    match = re.exec(source);
  }

  return ids;
}

export function extractNpmRunCommands(text: string): string[] {
  const source = ensureString(text, "text");
  const commands: string[] = [];
  const re = /\bnpm run ([a-z0-9:_-]+)/gi;
  let match: RegExpExecArray | null = re.exec(source);

  while (match) {
    commands.push(match[1].toLowerCase());
    match = re.exec(source);
  }

  return commands;
}

function validateDocBody(
  key: DocKey,
  text: string,
  policy: RootDocsPolicy,
  errors: string[],
  anchorsByDoc: Record<DocKey, string[]>,
): void {
  if (text.trim().length === 0) {
    errors.push(`Root doc '${key}' is empty.`);
    return;
  }

  const anchors = extractMarkdownAnchorIds(text);
  anchorsByDoc[key] = anchors;
  const requiredAnchor = policy.requiredAnchorIds[key];
  if (!anchors.includes(requiredAnchor)) {
    errors.push(
      `Root doc '${key}' must include anchor '${requiredAnchor}' for deterministic graph linkage.`,
    );
  }

  for (const token of policy.requiredMentions[key]) {
    if (!text.includes(token)) {
      errors.push(`Root doc '${key}' must mention '${token}'.`);
    }
  }
}

export function validateRootDocsBundle(
  bundle: RootDocsBundle,
  policy: RootDocsPolicy = DEFAULT_ROOT_DOCS_POLICY,
): RootDocsValidationResult {
  const readme = ensureString(bundle.readme, "readme");
  const agents = ensureString(bundle.agents, "agents");
  const codex = ensureString(bundle.codex, "codex");

  const errors: string[] = [];
  const warnings: string[] = [];
  const anchorsByDoc: Record<DocKey, string[]> = {
    readme: [],
    agents: [],
    codex: [],
  };

  validateDocBody("readme", readme, policy, errors, anchorsByDoc);
  validateDocBody("agents", agents, policy, errors, anchorsByDoc);
  validateDocBody("codex", codex, policy, errors, anchorsByDoc);

  const commandSources: Record<DocKey, Set<string>> = {
    readme: new Set(extractNpmRunCommands(readme)),
    agents: new Set(extractNpmRunCommands(agents)),
    codex: new Set(extractNpmRunCommands(codex)),
  };

  const commandCoverage: Record<string, string[]> = {};
  for (const command of policy.requiredCommands) {
    const docs = DOC_KEYS.filter((key) => commandSources[key].has(command));
    commandCoverage[command] = docs;

    if (docs.length === 0) {
      errors.push(
        `Root docs triad must reference command 'npm run ${command}' in at least one file.`,
      );
    }

    if (docs.length === 1) {
      warnings.push(
        `Command 'npm run ${command}' appears in only one root doc (${docs[0]}). Consider repeating it for operational discoverability.`,
      );
    }
  }

  return { errors, warnings, anchorsByDoc, commandCoverage };
}
