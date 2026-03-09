export const HOT_QUEUE_PATH = "TO-DO/HOT_QUEUE.md";
export const TASKS_DIR = "TO-DO/tasks";
export const TEAMWORK_LATEST_PATH = "data/private/agents/n1/teamwork.latest.json";
export const TEAMWORK_HISTORY_PATH = "data/private/agents/n1/teamwork.history.jsonl";
export const REPO_SYNC_LATEST_PATH = "data/private/agents/n1/repo-sync.latest.json";
export const REPO_SYNC_HISTORY_PATH = "data/private/agents/n1/repo-sync.history.jsonl";
export const ORCHESTRATION_LATEST_PATH = "data/private/agents/n1/orchestration.latest.json";
export const ORCHESTRATION_HISTORY_PATH = "data/private/agents/n1/orchestration.history.jsonl";
export const AUTOMATED_UPDATE_REPORTS_DIR = "reports/n1/automated-update";
export const REPO_SYNC_REPORTS_DIR = "reports/n1/repo-sync";
export const ORCHESTRATION_REPORTS_DIR = "reports/n1/orchestration";
export const CAPSULES_DIR = "data/capsules";
export const A2C_INDEX_PATH = "data/private/a2c/index.json";
export const A2C_TASKS_DIR = "data/private/a2c/tasks";
export const A2C_PIPELINE_DIR = "data/private/a2c/ingest_pipeline";
export const A2C_DROPZONE_DIR = "data/private/a2c/intake/dropzone";
export const A2C_REPORTS_DIR = "reports/a2c";
export const VAULT_STEWARD_RUNTIME_PATH = "data/private/agents/vault-steward.runtime.json";
export const VAULT_STEWARD_LATEST_PATH = "data/private/agents/vault-steward.latest.json";
export const WORKFLOW_PATH = "WORKFLOW.md";
export const NINFINITY_WORKFLOW_PATH = "NINFINITY_WORKFLOW.md";

export const CORE_INSTRUCTION_STACK = [
  "README.md",
  "AGENTS.md",
  "CODEX.md",
  "SOUL.md",
  "CONTEXT.md",
  "MEMORY.md",
  "TOOLS.md",
  "TO-DO/README.md",
  "TO-DO/AGENT_OPERATING_MODES.md",
  HOT_QUEUE_PATH,
] as const;
