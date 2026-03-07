// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { parseWorkflowConfig } from '@/lib/symphony/config';
import { renderIssuePrompt } from '@/lib/symphony/prompt';
import type { Issue } from '@/lib/symphony/types';
import { parseWorkflowContent } from '@/lib/symphony/workflow';

const issue: Issue = {
  id: 'issue-1',
  identifier: 'ABC-123',
  title: 'Example issue',
  description: 'desc',
  priority: 1,
  state: 'Todo',
  branch_name: null,
  url: null,
  labels: ['backend'],
  blocked_by: [],
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
};

describe('Symphony workflow and config', () => {
  const originalToken = process.env.LINEAR_TOKEN;
  const originalProjectSlug = process.env.LINEAR_PROJECT_SLUG;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.LINEAR_TOKEN;
    else process.env.LINEAR_TOKEN = originalToken;
    if (originalProjectSlug === undefined) delete process.env.LINEAR_PROJECT_SLUG;
    else process.env.LINEAR_PROJECT_SLUG = originalProjectSlug;
  });

  it('parses YAML front matter and resolves typed config values', () => {
    process.env.LINEAR_TOKEN = 'linear-secret';
    process.env.LINEAR_PROJECT_SLUG = 'n1hub';

    const definition = parseWorkflowContent(`---
tracker:
  kind: linear
  api_key: $LINEAR_TOKEN
  project_slug: $LINEAR_PROJECT_SLUG
polling:
  interval_ms: "15000"
workspace:
  root: "./tmp/workspaces"
agent:
  max_concurrent_agents_by_state:
    In Progress: "2"
    Todo: 3
    Closed: 0
codex:
  command: "codex app-server"
---
Issue {{ issue.identifier }} attempt {{ attempt }}
`);

    const config = parseWorkflowConfig(definition, '/tmp/WORKFLOW.md');

    expect(definition.prompt_template).toBe('Issue {{ issue.identifier }} attempt {{ attempt }}');
    expect(config.tracker.api_key).toBe('linear-secret');
    expect(config.tracker.project_slug).toBe('n1hub');
    expect(config.polling.interval_ms).toBe(15000);
    expect(config.agent.max_concurrent_agents_by_state).toEqual({
      'in progress': 2,
      todo: 3,
    });
    expect(config.workspace.root).toContain('tmp/workspaces');
    expect(config.agent.continue_after_success).toBe(true);
    expect(config.tracker.branch).toBe('real');
  });

  it('supports capsule_graph tracker config for N-Infinity workflows', () => {
    const definition = parseWorkflowContent(`---
tracker:
  kind: capsule_graph
  branch: dream
  agent_capsules:
    - capsule.foundation.n-infinity.weaver.v1
  mode: nightly
  night_start_hour: 2
  night_end_hour: 6
  timezone: America/Los_Angeles
agent:
  continue_after_success: false
---
Capsule task {{ issue.identifier }}
`);

    const config = parseWorkflowConfig(definition, '/tmp/NINFINITY_WORKFLOW.md');

    expect(config.tracker.kind).toBe('capsule_graph');
    expect(config.tracker.branch).toBe('dream');
    expect(config.tracker.agent_capsules).toEqual(['capsule.foundation.n-infinity.weaver.v1']);
    expect(config.tracker.mode).toBe('nightly');
    expect(config.tracker.night_start_hour).toBe(2);
    expect(config.tracker.night_end_hour).toBe(6);
    expect(config.tracker.timezone).toBe('America/Los_Angeles');
    expect(config.agent.continue_after_success).toBe(false);
  });

  it('renders strict Liquid prompts and fails on unknown variables', async () => {
    const rendered = await renderIssuePrompt({
      template: 'Issue {{ issue.identifier }} attempt {{ attempt }}',
      issue,
      attempt: 2,
    });

    expect(rendered).toBe('Issue ABC-123 attempt 2');

    await expect(
      renderIssuePrompt({
        template: 'Unknown {{ issue.missing_value }}',
        issue,
        attempt: null,
      }),
    ).rejects.toMatchObject({
      code: 'template_render_error',
    });
  });
});
