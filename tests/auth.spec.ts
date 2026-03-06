import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/vault');
    await expect(page).toHaveURL(/\/login/);
  });

  test('displays error on incorrect password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Access Denied/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in successfully with correct password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/vault');
    const token = await page.evaluate(() => window.localStorage.getItem('n1hub_vault_token'));
    expect(token).toBeTruthy();
  });

  test('logs out correctly via settings', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vault');

    await page.goto('/settings');
    await page.click('button:has-text("Terminate Session")');

    await page.waitForURL(/\/login/, { timeout: 60_000 });
    const token = await page.evaluate(() => window.localStorage.getItem('n1hub_vault_token'));
    expect(token).toBeNull();
  });
});
