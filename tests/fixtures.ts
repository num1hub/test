import { test as base, expect, type Page } from '@playwright/test';

type AuthFixtures = {
  authPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authPage: async ({ page }, setAuthPage) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('n1hub_theme', 'dark');
    });

    await page.goto('/login');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vault', { timeout: 60_000 });

    await setAuthPage(page);

    await page.evaluate(() => {
      window.localStorage.removeItem('n1hub_vault_token');
      window.localStorage.removeItem('n1hub_theme');
    });
  },
});

export { expect };
