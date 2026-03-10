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
          "Classify the request into one of the explicit N1 route classes before choosing a mode.",
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
          "Keep baton identity explicit: route, skill, and handoff target should agree before execution starts.",
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
    ...(slug === "n1"
      ? [
          "## Routing Matrix",
          "",
          "- `assistant_synthesis`",
          "  - use for broad thinking, explanation, architecture, comparison, and cold-start deep work on N1",
          "  - primary mode: `Personal AI Assistant`",
          "  - default skill: `skills/personal-ai-assistant/SKILL.md`",
          "  - handoff target: `n1_personal_assistant`",
          "- `queue_execution`",
          "  - use for `continue`, the automated update workflow command, explicit `TODO-*` work, or direct requests to execute the top bounded packet",
          "  - primary mode: `TO-DO Executor`",
          "  - default skill: `skills/todo-executor/SKILL.md`",
          "  - handoff target: `todo_executor`",
          "- `orchestrate_or_sync`",
          "  - use for sync, lane choice, baton routing, or updates that span multiple N1 surfaces",
          "  - primary mode: `N1 Chief Orchestrator`",
          "  - default skill: `skills/n1/SKILL.md`",
          "  - handoff target: `n1_chief_orchestrator`",
          "- `capsule_projection`",
          "  - use when durable knowledge should become capsules or A2C-oriented planning structure",
          "  - primary mode: `Personal AI Assistant`",
          "  - default skill: `skills/personal-ai-assistant/SKILL.md`",
          "  - handoff target: `capsule_planning_agent`",
          "- `swarm_split`",
          "  - use only when the operator explicitly asks for a swarm or one bounded initiative truly needs multiple lanes",
          "  - primary mode: `Swarm Conductor`",
          "  - default skill: `skills/swarm-orchestrator/SKILL.md`",
          "  - handoff target: `swarm_conductor`",
          "- `defer_for_clarity`",
          "  - use when the request is ambiguous, conflicting, or too risky to mutate immediately",
          "  - primary mode: `Personal AI Assistant`",
          "  - default skill: `skills/personal-ai-assistant/SKILL.md`",
          "  - handoff target: `n1_personal_assistant`",
          "",
          "## Handoff Law",
          "",
          "- If the route is `queue_execution`, read `TO-DO/HOT_QUEUE.md` and the selected task packet before speaking confidently.",
          "- If the route is `orchestrate_or_sync`, prefer repo-sync and orchestration artifacts as compact bridges, then hand the baton to the smallest bounded lane.",
          "- If the route is `capsule_projection`, do not bypass validator or queue law just because the user wants durable memory.",
          "- If the route is `defer_for_clarity`, ask one precise clarifying question or report the blocker instead of mutating queue truth speculatively.",
          "",
        ]
      : []),
    "## Rules",
    "",
    ...rules.map((item) => `- ${item}`),
    ...(slug === "n1"
      ? ["- Do not route ambiguous input into queue mutation when `defer_for_clarity` is the honest classification."]
      : []),
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
