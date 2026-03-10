// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { normalizeLinearIssue } from '@/lib/symphony/tracker';

describe('Symphony tracker linear normalization seam', () => {
  it('normalizes labels, blockers, timestamps, and branch hints from a Linear issue payload', () => {
    const issue = normalizeLinearIssue({
      id: 'issue-1',
      identifier: 'ABC-1',
      title: 'Example issue',
      description: 'test',
      priority: '2',
      branchName: 'feature/abc-1',
      url: 'https://linear.app/issue/ABC-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      state: { name: 'Todo' },
      labels: {
        nodes: [{ name: 'Backend' }, { name: 'Urgent' }],
      },
      inverseRelations: {
        nodes: [
          {
            issue: {
              id: 'blocker-1',
              identifier: 'ABC-0',
              state: { name: 'In Progress' },
            },
          },
        ],
      },
    });

    expect(issue).toEqual({
      id: 'issue-1',
      identifier: 'ABC-1',
      title: 'Example issue',
      description: 'test',
      priority: 2,
      state: 'Todo',
      branch_name: 'feature/abc-1',
      url: 'https://linear.app/issue/ABC-1',
      labels: ['backend', 'urgent'],
      blocked_by: [
        {
          id: 'blocker-1',
          identifier: 'ABC-0',
          state: 'In Progress',
        },
      ],
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-02T00:00:00.000Z',
    });
  });

  it('rejects malformed payloads without required issue fields', () => {
    expect(() => normalizeLinearIssue({ id: 'issue-1' })).toThrow(
      'Issue payload is missing required fields',
    );
  });
});
