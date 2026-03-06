import { test, expect } from './fixtures';

test.describe('Capsule CRUD and Operations', () => {
  const newCapsuleId = `capsule.e2e.test.${Date.now()}.v1`;

  test('creates a new capsule and views details', async ({ authPage }) => {
    await authPage.goto('/new');

    const payload = {
      metadata: {
        capsule_id: newCapsuleId,
        version: '1.0.0',
        status: 'draft',
        type: 'operations',
        subtype: 'atomic',
        author: 'E2E',
        created_at: new Date().toISOString(),
        semantic_hash: 'x',
      },
      core_payload: { content_type: 'text', content: 'E2E Test Payload' },
      neuro_concentrate: {
        summary: 'E2E Summary',
        keywords: [],
        confidence_vector: [1, 1, 1, 1, 1, 1],
        semantic_hash: 'x',
      },
      recursive_layer: { links: [] },
      integrity_sha3_512: 'x',
    };

    await authPage.fill('textarea', JSON.stringify(payload, null, 2));
    await authPage.click('button:has-text("Seal & Execute")');

    await authPage.waitForURL(new RegExp(`/vault/capsule/${newCapsuleId.replace(/\./g, '\\.')}`));
    await expect(authPage.getByRole('heading', { name: newCapsuleId })).toBeVisible({
      timeout: 30_000,
    });
    const payloadPreview = authPage
      .locator('h2:has-text("Core Payload")')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
      .locator('pre')
      .first();
    await expect(payloadPreview).toContainText('E2E Test Payload');
  });

  test('edits an existing capsule and verifies version history', async ({ authPage }) => {
    await authPage.goto('/vault/capsule/capsule.test.setup.v1/edit?branch=real');

    const textarea = authPage.locator('textarea');
    const parsed = JSON.parse(await textarea.inputValue()) as {
      neuro_concentrate: { summary: string };
    };
    parsed.neuro_concentrate.summary = 'Updated summary text';
    await textarea.fill(JSON.stringify(parsed, null, 2));

    await authPage.click('button:has-text("Save Capsule")');
    await authPage.waitForURL(/\/vault\/capsule\/capsule\.test\.setup\.v1\?branch=real/);
    const summaryText = authPage
      .locator('h2:has-text("Neuro Concentrate")')
      .locator('xpath=ancestor::div[contains(@class,"border")][1]')
      .locator('p')
      .first();
    await expect(summaryText).toContainText('Updated summary text');

    await authPage.click('button:has-text("History")');
    await expect(authPage.getByText('Immutable History Log')).toBeVisible();
    await expect(authPage.locator('li.group').first()).toBeVisible();
  });

  test('handles Real/Dream branching', async ({ authPage }) => {
    const capsuleId = 'capsule.test.setup.v1';
    await authPage.goto(`/vault/capsule/${capsuleId}`);

    const token = await authPage.evaluate(() => window.localStorage.getItem('n1hub_vault_token'));
    const baselineRes = await authPage.request.get(`/api/capsules/${capsuleId}?branch=real`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const baseline = await baselineRes.json();
    const baselineSummary = baseline.neuro_concentrate.summary as string;

    await authPage.click('button:has-text("Fork to Dream")');
    await expect(authPage.getByText(/Dream branch instantiated successfully/i)).toBeVisible();

    await authPage.click('a:has-text("Edit Dream")');
    const dreamSummary = `Dream state summary ${Date.now()}`;

    const textarea = authPage.locator('textarea');
    let content = await textarea.inputValue();
    content = content.replace(baselineSummary, dreamSummary);
    await textarea.fill(content);
    await authPage.click('button:has-text("Save Dream")');

    await authPage.waitForURL(/\/vault\/capsule\/capsule\.test\.setup\.v1\?branch=dream/);
    const summaryText = authPage
      .locator('h2:has-text("Neuro Concentrate")')
      .locator('xpath=ancestor::div[contains(@class,"border")][1]')
      .locator('p')
      .first();
    await expect(summaryText).toContainText(dreamSummary);

    await authPage.click('button:has-text("Real")');
    await expect(summaryText).not.toContainText(dreamSummary);

    await authPage.click('button:has-text("Dream")');
    await authPage.click('button:has-text("Diff")');
    await expect(authPage.getByText('Branch Differential Analysis')).toBeVisible();
    await authPage.locator('div.fixed.inset-0 button').first().click();

    authPage.once('dialog', (dialog) => dialog.accept());
    await authPage.click('button:has-text("Promote to Real")');
    await expect(authPage.getByText(/Dream promoted to Real baseline/i)).toBeVisible();
    await expect(summaryText).toContainText(dreamSummary);
  });
});
