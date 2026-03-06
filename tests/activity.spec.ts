import { test, expect } from './fixtures';

test.describe('Activity Log / Telemetry', () => {
  test('displays activity log entries', async ({ authPage }) => {
    await authPage.goto('/new');

    const tempId = `capsule.logtest.${Date.now()}.v1`;
    const payload = {
      metadata: {
        capsule_id: tempId,
        version: '1.0.0',
        status: 'draft',
        type: 'concept',
        subtype: 'atomic',
        author: 'E2E',
        created_at: new Date().toISOString(),
        semantic_hash: 'z',
      },
      core_payload: { content_type: 'text', content: 'log test' },
      neuro_concentrate: {
        summary: 'log test',
        keywords: [],
        confidence_vector: [1, 1, 1, 1, 1, 1],
        semantic_hash: 'z',
      },
      recursive_layer: { links: [] },
      integrity_sha3_512: 'z',
    };

    await authPage.fill('textarea', JSON.stringify(payload));
    await authPage.click('button:has-text("Seal & Execute")');
    await authPage.waitForURL(new RegExp(`/vault/capsule/${tempId.replace(/\./g, '\\.')}`));

    await authPage.goto('/activity');

    await expect(authPage.getByText('System Telemetry')).toBeVisible();
    await expect(authPage.locator('.group').first()).toBeVisible();
    await expect(authPage.getByText(/create/i).first()).toBeVisible();
    await expect(authPage.getByText(`ID: ${tempId}`).first()).toBeVisible();
  });
});
