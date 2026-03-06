import { test, expect } from './fixtures';

test.describe('Vault Dashboard', () => {
  test('displays initial setup capsule', async ({ authPage }) => {
    const setupCard = authPage.locator('a.group.block.h-full').filter({
      hasText: 'capsule.test.setup.v1',
    });
    await expect(setupCard.first()).toBeVisible();
  });

  test('search filters the capsule list', async ({ authPage }) => {
    await authPage.fill('input[placeholder*="Search"]', 'setup.v1');
    await expect(authPage.getByText('capsule.test.setup.v1')).toBeVisible();

    await authPage.fill('input[placeholder*="Search"]', 'nonexistent_capsule');
    await expect(authPage.getByText(/No capsules match/i)).toBeVisible();
  });

  test('type filters update the list', async ({ authPage }) => {
    await authPage.click('button:has-text("Foundation")');
    await expect(authPage.getByText('capsule.test.setup.v1')).not.toBeVisible();

    await authPage.click('button:has-text("Concept")');
    await expect(authPage.getByText('capsule.test.setup.v1')).toBeVisible();
  });

  test('batch selection and deletion', async ({ authPage }) => {
    const tempId = 'capsule.to.delete.v1';

    await authPage.goto('/new');
    const tempCapsule = {
      metadata: {
        capsule_id: tempId,
        version: '1.0.0',
        status: 'draft',
        type: 'concept',
        subtype: 'atomic',
        author: 'E2E',
        created_at: new Date().toISOString(),
        semantic_hash: 'x',
      },
      core_payload: { content_type: 'text', content: 'temp' },
      neuro_concentrate: {
        summary: 'temp summary',
        keywords: [],
        confidence_vector: [1, 1, 1, 1, 1, 1],
        semantic_hash: 'x',
      },
      recursive_layer: { links: [] },
      integrity_sha3_512: 'x',
    };

    await authPage.fill('textarea', JSON.stringify(tempCapsule));
    await authPage.click('button:has-text("Seal & Execute")');
    await authPage.waitForURL(/\/vault\/capsule\/capsule\.to\.delete\.v1/);

    await authPage.goto('/vault');
    await expect(authPage.getByText(tempId)).toBeVisible();

    const card = authPage.locator('div.group.relative').filter({ hasText: tempId }).first();
    await card.hover();
    await card.locator('div.cursor-pointer').first().click();

    await expect(authPage.getByText('1 Selected')).toBeVisible();

    authPage.once('dialog', (dialog) => dialog.accept());
    await authPage.click('button:has-text("Delete")');

    await expect(authPage.getByText(/Successfully purged 1 capsules\./)).toBeVisible();
    await expect(authPage.getByText(tempId)).not.toBeVisible();
  });
});
