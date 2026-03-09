// @anchor script:verify.root-docs links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,script:anchors.coverage,invariant:anchors.root-docs-policy note="Validates the N1Hub root-doc triad."
import fs from "node:fs";
import path from "node:path";

import { validateRootDocsBundle } from "../lib/anchors";

const ROOT = process.cwd();

function readOrEmpty(fileName: string, errors: string[]): string {
  const absPath = path.join(ROOT, fileName);
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    const code = cause.code ?? "UNKNOWN";
    errors.push(`Unable to read '${fileName}' (${code}).`);
    return "";
  }
}

function fail(errors: readonly string[]): never {
  console.error("\nRoot docs validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

function main(): void {
  const readErrors: string[] = [];
  const bundle = {
    readme: readOrEmpty("README.md", readErrors),
    agents: readOrEmpty("AGENTS.md", readErrors),
    codex: readOrEmpty("CODEX.md", readErrors),
  };

  const result = validateRootDocsBundle(bundle);
  const errors = [...readErrors, ...result.errors];
  if (errors.length > 0) fail(errors);

  console.log("Root docs validation passed.");
  console.log("Command coverage:");
  for (const [command, docs] of Object.entries(result.commandCoverage)) {
    const scope = docs.length > 0 ? docs.join(", ") : "none";
    console.log(`- npm run ${command}: ${scope}`);
  }

  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

main();
