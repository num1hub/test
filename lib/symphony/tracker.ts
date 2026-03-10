import fs from 'fs/promises';
import { readCapsulesFromDisk } from '@/lib/capsuleVault';
import { dataPath } from '@/lib/dataPath';
import { loadOverlayGraph } from '@/lib/diff/branch-manager';
import { resolveNInfinityAgentSpec } from '@/lib/ninfinity/registry';
import type { Issue, IssueBlockerRef, Logger, SymphonyConfig, TrackerClient } from './types';
import {
  asString,
  normalizeLinearIssue,
  readTrackerJson,
  trackerError,
} from './tracker-linear';
import { asRecord, isoNow, normalizeIssueState } from './utils';

export { normalizeLinearIssue } from './tracker-linear';

interface CapsuleGraphRunEntry {
  last_result_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_reason?: string;
  last_error?: string | null;
  last_window_key?: string;
}

interface CapsuleGraphRunState {
  version: 1;
  updated_at: string;
  jobs: Record<string, CapsuleGraphRunEntry>;
}

const CAPSULE_GRAPH_RUN_STATE_PATH = dataPath('private', 'capsule-graph-runs.json');

export class LinearTrackerClient implements TrackerClient {
  constructor(
    private readonly config: SymphonyConfig,
    private readonly logger: Logger,
  ) {}

  async fetchCandidateIssues(): Promise<Issue[]> {
    return this.fetchPaginatedIssues({
      stateNames: this.config.tracker.active_states,
    });
  }

  async fetchIssuesByStates(states: string[]): Promise<Issue[]> {
    if (states.length === 0) return [];
    return this.fetchPaginatedIssues({ stateNames: states });
  }

  async fetchIssueStatesByIds(ids: string[]): Promise<Issue[]> {
    if (ids.length === 0) return [];
    const body = await this.queryGraphQL(
      `
        query SymphonyIssueStates($ids: [ID!]) {
          issues(filter: { id: { in: $ids } }) {
            nodes {
              id
              identifier
              title
              description
              priority
              branchName
              url
              createdAt
              updatedAt
              state { name }
              labels { nodes { name } }
              inverseRelations(filter: { type: { eq: blocks } }) {
                nodes {
                  issue {
                    id
                    identifier
                    state { name }
                  }
                }
              }
            }
          }
        }
      `,
      { ids },
    );

    const issues = asRecord(body.data)?.issues;
    const nodes = Array.isArray(asRecord(issues)?.nodes) ? (asRecord(issues)?.nodes as unknown[]) : [];
    return nodes.map((node) => normalizeLinearIssue(node));
  }

  async executeRawQuery(query: string, variables?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.queryGraphQL(query, variables ?? {});
  }

  private async fetchPaginatedIssues(options: { stateNames: string[] }): Promise<Issue[]> {
    const collected: Issue[] = [];
    let after: string | null = null;

    while (true) {
      const payload = await this.queryGraphQL(
        `
          query SymphonyIssues($projectSlug: String!, $stateNames: [String!], $after: String) {
            issues(
              first: 50
              after: $after
              filter: {
                project: { slugId: { eq: $projectSlug } }
                state: { name: { in: $stateNames } }
              }
            ) {
              nodes {
                id
                identifier
                title
                description
                priority
                branchName
                url
                createdAt
                updatedAt
                state { name }
                labels { nodes { name } }
                inverseRelations(filter: { type: { eq: blocks } }) {
                  nodes {
                    issue {
                      id
                      identifier
                      state { name }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        {
          projectSlug: this.config.tracker.project_slug,
          stateNames: options.stateNames,
          after,
        },
      );

      const issues = asRecord(payload.data)?.issues;
      const nodes = Array.isArray(asRecord(issues)?.nodes) ? (asRecord(issues)?.nodes as unknown[]) : [];
      const pageInfo = asRecord(asRecord(issues)?.pageInfo);

      collected.push(...nodes.map((node) => normalizeLinearIssue(node)));

      const hasNextPage = pageInfo?.hasNextPage === true;
      const endCursor = asString(pageInfo?.endCursor);

      if (!hasNextPage) {
        break;
      }

      if (!endCursor) {
        throw trackerError('linear_missing_end_cursor', 'Linear pageInfo.endCursor missing');
      }

      after = endCursor;
    }

    return collected;
  }

  private async queryGraphQL(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const endpoint = this.config.tracker.endpoint;
    const apiKey = this.config.tracker.api_key;

    if (!apiKey) {
      throw trackerError('missing_tracker_api_key', 'Linear API key is missing');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw trackerError(
          'linear_api_status',
          `Linear returned status ${response.status}: ${text.slice(0, 500)}`,
        );
      }

      const payload = await readTrackerJson(response);
      const errors = payload.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const message = errors
          .map((entry) => asString((entry as { message?: unknown }).message) ?? 'GraphQL error')
          .join('; ');
        throw trackerError('linear_graphql_errors', message);
      }

      if (!asRecord(payload.data)) {
        throw trackerError('linear_unknown_payload', 'Linear payload missing data object');
      }

      return payload;
    } catch (error: unknown) {
      if ((error as { code?: string }).code) {
        throw error;
      }
      this.logger.warn('tracker_request_failed', {
        tracker_kind: this.config.tracker.kind,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
      throw trackerError('linear_api_request', 'Linear request failed', error);
    }
  }
}

export function createTrackerClient(
  config: SymphonyConfig,
  logger: Logger,
): TrackerClient {
  if (config.tracker.kind === 'capsule_graph') {
    return new CapsuleGraphTrackerClient(config, logger);
  }
  return new LinearTrackerClient(config, logger);
}

export function isTerminalBlocker(blocker: IssueBlockerRef, terminalStates: string[]): boolean {
  if (!blocker.state) return false;
  const state = normalizeIssueState(blocker.state);
  return terminalStates.map(normalizeIssueState).includes(state);
}

function getDateParts(date: Date, timeZone: string | null): { year: string; month: string; day: string; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';

  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: Number.parseInt(lookup('hour'), 10),
  };
}

function shiftDateKey(date: Date, deltaDays: number, timeZone: string | null): string {
  const shifted = new Date(date.valueOf() + deltaDays * 24 * 60 * 60 * 1000);
  const { year, month, day } = getDateParts(shifted, timeZone);
  return `${year}-${month}-${day}`;
}

function resolveCapsuleWindow(
  config: SymphonyConfig['tracker'],
  now: Date,
): { active: boolean; windowKey: string } {
  const parts = getDateParts(now, config.timezone);
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`;

  if (config.mode === 'continuous') {
    return { active: true, windowKey: `continuous:${dayKey}` };
  }

  if (config.night_start_hour === config.night_end_hour) {
    return { active: true, windowKey: `nightly:${dayKey}` };
  }

  if (config.night_start_hour < config.night_end_hour) {
    const active = parts.hour >= config.night_start_hour && parts.hour < config.night_end_hour;
    return { active, windowKey: `nightly:${dayKey}` };
  }

  const active = parts.hour >= config.night_start_hour || parts.hour < config.night_end_hour;
  const anchorDayKey =
    parts.hour < config.night_end_hour
      ? shiftDateKey(now, -1, config.timezone)
      : dayKey;
  return { active, windowKey: `nightly:${anchorDayKey}` };
}

function encodeCapsuleGraphIssueId(windowKey: string, capsuleId: string): string {
  return `capsule-graph:${windowKey}:${capsuleId}`;
}

function decodeCapsuleGraphIssueId(
  issueId: string,
): { windowKey: string; capsuleId: string } | null {
  if (!issueId.startsWith('capsule-graph:')) return null;
  const parts = issueId.split(':');
  if (parts.length < 4) return null;
  return {
    windowKey: `${parts[1]}:${parts[2]}`,
    capsuleId: parts.slice(3).join(':'),
  };
}

async function readCapsuleGraphRunState(): Promise<CapsuleGraphRunState> {
  try {
    return JSON.parse(await fs.readFile(CAPSULE_GRAPH_RUN_STATE_PATH, 'utf-8')) as CapsuleGraphRunState;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        version: 1,
        updated_at: new Date(0).toISOString(),
        jobs: {},
      };
    }
    throw error;
  }
}

async function writeCapsuleGraphRunState(state: CapsuleGraphRunState): Promise<void> {
  await fs.mkdir(dataPath('private'), { recursive: true });
  await fs.writeFile(CAPSULE_GRAPH_RUN_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function isCapsuleGraphCoolingDown(
  config: SymphonyConfig['tracker'],
  windowKey: string,
  entry: CapsuleGraphRunEntry | undefined,
): boolean {
  if (!entry?.last_success_at) return false;
  if (entry.last_window_key === windowKey) return true;
  const elapsedMs = Date.now() - new Date(entry.last_success_at).valueOf();
  return elapsedMs < config.cooldown_hours * 60 * 60 * 1000;
}

async function buildCapsuleGraphSummary(branch: string | null): Promise<{
  total: number;
  orphaned: number;
  byType: Record<string, number>;
  mostLinked: string[];
}> {
  const selectedBranch = branch?.trim() || 'real';
  const capsules =
    selectedBranch === 'real'
      ? await readCapsulesFromDisk()
      : await loadOverlayGraph(selectedBranch);

  const byType: Record<string, number> = {};
  const degree = new Map<string, number>();

  for (const capsule of capsules) {
    const record = asRecord(capsule);
    const metadata = asRecord(record?.metadata);
    const recursiveLayer = asRecord(record?.recursive_layer);
    const capsuleId = typeof metadata?.capsule_id === 'string' ? metadata.capsule_id : null;
    const type = typeof metadata?.type === 'string' ? metadata.type : 'unknown';
    byType[type] = (byType[type] ?? 0) + 1;

    if (!capsuleId) continue;
    const links = Array.isArray(recursiveLayer?.links) ? recursiveLayer.links : [];
    degree.set(capsuleId, degree.get(capsuleId) ?? 0);
    for (const link of links) {
      const targetId = asRecord(link)?.target_id;
      degree.set(capsuleId, (degree.get(capsuleId) ?? 0) + 1);
      if (typeof targetId === 'string') {
        degree.set(targetId, (degree.get(targetId) ?? 0) + 1);
      }
    }
  }

  const mostLinked = [...degree.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([capsuleId, count]) => `${capsuleId} (${count})`);
  const orphaned = [...degree.values()].filter((count) => count === 0).length;

  return {
    total: capsules.length,
    orphaned,
    byType,
    mostLinked,
  };
}

export class CapsuleGraphTrackerClient implements TrackerClient {
  constructor(
    private readonly config: SymphonyConfig,
    private readonly logger: Logger,
  ) {}

  async fetchCandidateIssues(): Promise<Issue[]> {
    const window = resolveCapsuleWindow(this.config.tracker, new Date());
    if (!window.active) {
      return [];
    }

    return (await this.buildIssues(window.windowKey, this.config.tracker.active_states[0] ?? 'Night Shift')).filter(
      (issue) => normalizeIssueState(issue.state) === normalizeIssueState(this.config.tracker.active_states[0] ?? 'Night Shift'),
    );
  }

  async fetchIssuesByStates(states: string[]): Promise<Issue[]> {
    const requested = states.map(normalizeIssueState);
    const window = resolveCapsuleWindow(this.config.tracker, new Date());
    if (!window.active) {
      return [];
    }

    const issues = await this.buildIssues(window.windowKey, this.config.tracker.active_states[0] ?? 'Night Shift');
    return issues.filter((issue) => requested.includes(normalizeIssueState(issue.state)));
  }

  async fetchIssueStatesByIds(ids: string[]): Promise<Issue[]> {
    const window = resolveCapsuleWindow(this.config.tracker, new Date());
    const state = window.active
      ? this.config.tracker.active_states[0] ?? 'Night Shift'
      : 'Paused';
    const issues = await this.buildIssues(window.windowKey, state);
    const byId = new Map(issues.map((issue) => [issue.id, issue]));

    return ids
      .map((id) => {
        const decoded = decodeCapsuleGraphIssueId(id);
        if (!decoded) return byId.get(id) ?? null;
        return byId.get(id) ?? this.buildSingleIssue(decoded.capsuleId, decoded.windowKey, state, null);
      })
      .filter((issue): issue is Issue => issue !== null);
  }

  async reportRunResult(issue: Issue, result: import('./types').AgentRunResult): Promise<void> {
    const decoded = decodeCapsuleGraphIssueId(issue.id);
    const capsuleId = decoded?.capsuleId ?? issue.id;
    const windowKey = decoded?.windowKey ?? 'unknown';
    const state = await readCapsuleGraphRunState();
    const now = isoNow();

    state.jobs[capsuleId] = {
      ...state.jobs[capsuleId],
      last_result_at: now,
      last_success_at: result.success ? now : state.jobs[capsuleId]?.last_success_at,
      last_failure_at: result.success ? state.jobs[capsuleId]?.last_failure_at : now,
      last_reason: result.reason,
      last_error: result.error,
      last_window_key: result.success ? windowKey : state.jobs[capsuleId]?.last_window_key,
    };
    state.updated_at = now;
    await writeCapsuleGraphRunState(state);
    this.logger.info('capsule_graph_run_recorded', {
      issue_id: issue.id,
      issue_identifier: issue.identifier,
      result: result.reason,
      success: result.success,
    });
  }

  private async buildIssues(windowKey: string, state: string): Promise<Issue[]> {
    const runState = await readCapsuleGraphRunState();
    const summary = await buildCapsuleGraphSummary(this.config.tracker.branch).catch((error: unknown) => {
      this.logger.warn('capsule_graph_summary_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });

    return this.config.tracker.agent_capsules
      .map((capsuleId) =>
        this.buildSingleIssue(
          capsuleId,
          windowKey,
          isCapsuleGraphCoolingDown(this.config.tracker, windowKey, runState.jobs[capsuleId])
            ? 'Paused'
            : state,
          summary,
        ),
      )
      .filter((issue): issue is Issue => issue !== null);
  }

  private buildSingleIssue(
    capsuleId: string,
    windowKey: string,
    state: string,
    summary: Awaited<ReturnType<typeof buildCapsuleGraphSummary>> | null,
  ): Issue | null {
    const spec = resolveNInfinityAgentSpec(capsuleId);
    const issueId = encodeCapsuleGraphIssueId(windowKey, capsuleId);
    const identifier = `NINF-${spec.slug.toUpperCase()}-${windowKey.replace(/[^0-9A-Za-z]+/g, '-')}`;
    const typeSummary = summary
      ? Object.entries(summary.byType)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 4)
          .map(([type, count]) => `${type}:${count}`)
          .join(', ')
      : 'unknown';
    const description = [
      `N-Infinity capsule graph task for ${spec.displayName}.`,
      '',
      `Mission: ${spec.mission}`,
      `Branch: ${this.config.tracker.branch ?? 'real'}`,
      `Window: ${windowKey}`,
      '',
      'Graph Snapshot:',
      `- total capsules: ${summary?.total ?? 'unknown'}`,
      `- orphaned capsules: ${summary?.orphaned ?? 'unknown'}`,
      `- type distribution: ${typeSummary}`,
      `- most linked: ${summary?.mostLinked.join(', ') || 'unknown'}`,
      '',
      'Focus:',
      ...spec.focus.map((entry) => `- ${entry}`),
      '',
      'Operating Contract:',
      '- Work conservatively against the real capsule files and validator rules.',
      '- Prefer validated graph improvements, auditable suggestions, and small trustworthy edits.',
      '- If external model reasoning is useful, use DeepMine-backed generation rather than inventing facts.',
    ].join('\n');

    return {
      id: issueId,
      identifier,
      title: spec.title,
      description,
      priority: spec.priority,
      state,
      branch_name: this.config.tracker.branch ?? 'real',
      url: null,
      labels: ['n-infinity', 'capsule-graph', spec.slug],
      blocked_by: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
