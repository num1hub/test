import fs from "node:fs";
import path from "node:path";

import type { SkillScaffoldResult } from "./types";

function slugifySkillName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Skill name must contain at least one alphanumeric character");
  }

  return slug;
}

function toTitleCaseToken(token: string): string {
  if (token.length === 0) return token;
  return `${token[0]?.toUpperCase() ?? ""}${token.slice(1)}`;
}

function formatSkillName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Skill name must not be empty");
  }

  if (trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }

  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(toTitleCaseToken)
    .join(" ");
}

function buildSkillDescription(name: string, slug: string): string {
  if (slug === "n1") {
    return "Operate as the durable N1 carrier skill for Egor N1, holding the repo-native assistant identity, read order, and handoff posture across planning, execution, and swarm lanes.";
  }

  return `Operate as the ${name} skill inside N1Hub with bounded read order, execution law, and handoff posture.`;
}

function buildSkillBody(name: string, slug: string): string {
  const description = buildSkillDescription(name, slug);
  const roleParagraph =
    slug === "n1"
      ? "Use this skill when the operator wants the main N1 carrier directly. This skill holds the stable assistant identity that persists across underlying model changes and keeps the handoff between Personal AI Assistant, TO-DO Executor, Swarm Conductor, and N1 Chief Orchestrator coherent."
      : `Use this skill when the operator wants ${name} to act as a distinct bounded lane inside N1Hub.`;
  const defaultLoop =
    slug === "n1"
      ? [
          "Load the instruction stack and the current working memory before answering from cold start.",
          "Decide whether the request belongs in Personal AI Assistant, TO-DO Executor, Swarm Conductor, or N1 Chief Orchestrator mode.",
          "Keep the response grounded in repo truth, active queue state, and capsule-native planning direction.",
          "Prefer the latest repo-sync and orchestration artifacts as compact cold-start bridges when they exist.",
          "When the work becomes durable, route it into the hot queue, teamwork artifacts, repo sync artifacts, orchestration artifacts, or a bounded execution packet.",
        ]
      : [
          "Load the instruction stack before acting.",
          "Confirm the exact lane, boundary, and verification posture.",
          "Carry out one bounded step without widening blast radius.",
          "Leave the next agent a clean handoff artifact when durable work remains.",
        ];
  const rules =
    slug === "n1"
      ? [
          "Keep the main assistant identity stable as `N1` even if the underlying LLM changes.",
          "Treat `README.md`, `AGENTS.md`, `CODEX.md`, `SOUL.md`, `CONTEXT.md`, and `MEMORY.md` as the core carrier surfaces.",
          "Use `TO-DO/`, teamwork artifacts, repo-sync artifacts, and orchestration artifacts instead of leaving durable planning as chat residue.",
          "Do not jump into swarm mode unless the task is clearly too large for one bounded lane.",
        ]
      : [
          "Do not bypass repo law, queue law, or verification gates.",
          "Prefer bounded execution over broad improvisation.",
          "Escalate back to the main assistant when planning outruns the lane boundary.",
        ];

  return [
    "---",
    `name: ${slug}`,
    `description: ${description}`,
    "---",
    "",
    `# ${name}`,
    "",
    roleParagraph,
    "",
    "## Read Order",
    "",
    "1. `README.md`",
    "2. `AGENTS.md`",
    "3. `CODEX.md`",
    "4. `SOUL.md`",
    "5. `CONTEXT.md`",
    "6. `MEMORY.md`",
    "7. `TO-DO/AGENT_OPERATING_MODES.md`",
    "8. `TO-DO/HOT_QUEUE.md` when the work is execution-bound",
    "9. `data/private/agents/n1/repo-sync.latest.json` when a fresh repo sync artifact exists",
    "10. `data/private/agents/n1/orchestration.latest.json` when a fresh orchestration artifact exists",
    "",
    "## Default Loop",
    "",
    ...defaultLoop.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Rules",
    "",
    ...rules.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function scaffoldSkill(
  rootDir: string,
  requestedName: string,
  options: { dryRun?: boolean; force?: boolean } = {},
): SkillScaffoldResult {
  const name = formatSkillName(requestedName);
  const slug = slugifySkillName(name);
  const skillDir = path.join(rootDir, "skills", slug);
  const skillFilePath = path.join(skillDir, "SKILL.md");
  const alreadyExists = fs.existsSync(skillFilePath);

  if (alreadyExists && !options.force) {
    throw new Error(`Skill already exists at skills/${slug}/SKILL.md`);
  }

  if (!options.dryRun) {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillFilePath, buildSkillBody(name, slug), "utf8");
  }

  return {
    name,
    slug,
    skillFilePath,
    created: !alreadyExists,
    overwritten: alreadyExists,
  };
}
