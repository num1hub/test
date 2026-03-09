import fs from "node:fs";
import path from "node:path";

import { HOT_QUEUE_PATH, TASKS_DIR } from "./constants";
import type { QueueTask, TaskPacket } from "./types";

function stripCodeTicks(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(`+)([\s\S]*?)\1$/);
  if (!match) return trimmed;

  const [, fence, inner] = match;
  if (inner.includes(fence)) return trimmed;

  return inner.trim();
}

export function parseQueueTable(content: string): QueueTask[] {
  const lines = content.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.includes("| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |"),
  );
  if (headerIndex === -1) {
    throw new Error(`Could not locate the hot queue table in ${HOT_QUEUE_PATH}`);
  }

  const rows: QueueTask[] = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line.startsWith("|")) break;
    if (!line.endsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => stripCodeTicks(cell));
    if (cells.length !== 7) continue;

    rows.push({
      id: cells[0],
      priority: cells[1],
      executionBand: cells[2],
      ownerLane: cells[3],
      status: cells[4],
      goal: cells[5],
      surface: cells[6],
    });
  }

  return rows;
}

function findTaskFile(rootDir: string, taskId: string): string | null {
  const tasksDir = path.join(rootDir, TASKS_DIR);
  if (!fs.existsSync(tasksDir)) return null;

  const match = fs
    .readdirSync(tasksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(taskId) && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  return match ? path.join(tasksDir, match.name) : null;
}

function parseTopMetadata(lines: readonly string[]): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) break;
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(2, separator).trim().toLowerCase().replace(/\s+/g, "_");
    const value = stripCodeTicks(line.slice(separator + 1));
    meta[key] = value;
  }
  return meta;
}

function collectSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    sections.set(currentHeading, buffer.join("\n").trim());
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      currentHeading = line.slice(3).trim();
      buffer = [];
      continue;
    }
    if (currentHeading) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function parseList(section: string | undefined): string[] {
  if (!section) return [];

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(- |\d+\.\s+)/.test(line))
    .map((line) => stripCodeTicks(line.replace(/^(- |\d+\.\s+)/, "").trim()))
    .filter(Boolean);
}

function parseParagraph(section: string | undefined): string {
  if (!section) return "";

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("```"))
    .join(" ")
    .trim();
}

function parseCodeBlock(section: string | undefined): string | undefined {
  if (!section) return undefined;
  const match = section.match(/```(?:text|md|markdown)?\n([\s\S]*?)```/);
  return match?.[1]?.trim() || undefined;
}

function parseModeAndSkill(section: string | undefined): {
  primaryMode?: string;
  optionalSkill?: string;
} {
  if (!section) return {};

  const result: { primaryMode?: string; optionalSkill?: string } = {};
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^- /, "");
    if (trimmed.startsWith("Primary mode:")) {
      result.primaryMode = stripCodeTicks(trimmed.replace("Primary mode:", ""));
      continue;
    }
    if (trimmed.startsWith("Optional skill:")) {
      result.optionalSkill = stripCodeTicks(trimmed.replace("Optional skill:", ""));
    }
  }
  return result;
}

export function parseTaskPacket(file: string, content: string): TaskPacket {
  const lines = content.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim();
  if (!title) {
    throw new Error(`Task packet ${file} is missing a title`);
  }

  const metadata = parseTopMetadata(lines.slice(1));
  const sections = collectSections(content);
  const modes = parseModeAndSkill(sections.get("Mode and Skill"));

  return {
    id: title.split(" ")[0] ?? title,
    title,
    file,
    priority: metadata.priority,
    executionBand: metadata.execution_band,
    status: metadata.status,
    ownerLane: metadata.owner_lane,
    cluster: metadata.cluster,
    goal: parseParagraph(sections.get("Goal")),
    whyNow: parseParagraph(sections.get("Why Now")),
    scope: parseList(sections.get("Scope")),
    nonGoals: parseList(sections.get("Non-Goals")),
    deliverables: parseList(sections.get("Deliverables")),
    contextSnapshot: parseList(sections.get("Context Snapshot")),
    dependencies: parseList(sections.get("Dependencies")),
    sourceSignals: parseList(sections.get("Source Signals")),
    entryChecklist: parseList(sections.get("Entry Checklist")),
    implementationPlan: parseList(sections.get("Implementation Plan")),
    primaryMode: modes.primaryMode,
    optionalSkill: modes.optionalSkill,
    systemPromptSlice: parseCodeBlock(sections.get("System Prompt Slice")),
    operatorCommandPack: parseList(sections.get("Operator Command Pack")),
    acceptanceCriteria: parseList(sections.get("Acceptance Criteria")),
    verification: parseList(sections.get("Verification")),
    evidenceArtifacts: parseList(sections.get("Evidence and Artifacts")),
    risks: parseList(sections.get("Risks")),
    stopConditions: parseList(sections.get("Stop Conditions")),
    queueUpdateRule: parseList(sections.get("Queue Update Rule")),
    handoffNote: parseParagraph(sections.get("Handoff Note")),
  };
}

export function readTaskPacket(rootDir: string, taskId: string): TaskPacket | null {
  const taskFile = findTaskFile(rootDir, taskId);
  if (!taskFile) return null;
  return parseTaskPacket(taskFile, fs.readFileSync(taskFile, "utf8"));
}
