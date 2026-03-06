import fs from 'fs/promises';
import path from 'path';
import { test, expect } from './fixtures';

test.describe('Import / Export Operations', () => {
  test('exports all capsules', async ({ authPage }) => {
    await authPage.goto('/vault');

    const downloadPromise = authPage.waitForEvent('download');
    await authPage.click('button:has-text("Export All")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('n1hub_vault_export');
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('imports capsules via modal', async ({ authPage }) => {
    const importPayload = [
      {
        metadata: {
          capsule_id: 'capsule.import.v1',
          version: '1.0.0',
          status: 'sovereign',
          type: 'foundation',
          subtype: 'atomic',
          author: 'E2E',
          created_at: new Date().toISOString(),
          semantic_hash: 'y',
        },
        core_payload: { content_type: 'text', content: 'Imported content' },
        neuro_concentrate: {
          summary: 'Imported summary',
          keywords: [],
          confidence_vector: [1, 1, 1, 1, 1, 0],
          semantic_hash: 'y',
        },
        recursive_layer: { links: [] },
        integrity_sha3_512: 'y',
      },
    ];

    const importPath = path.join(process.cwd(), 'data-test', 'temp-import.json');
    await fs.writeFile(importPath, JSON.stringify(importPayload), 'utf-8');

    await authPage.goto('/vault');
    await authPage.click('button:has-text("Import")');
    await expect(authPage.getByText('Import Sovereign Assets')).toBeVisible();

    await authPage.setInputFiles('input[type="file"]', importPath);
    await expect(authPage.getByText('1 valid capsules')).toBeVisible();

    await authPage.click('button:has-text("Execute Import")');
    await expect(authPage.getByText(/Imported: 1/)).toBeVisible();
    await expect(authPage.getByText('capsule.import.v1')).toBeVisible();

    await fs.rm(importPath, { force: true });
  });
});
