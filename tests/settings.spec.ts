import { test, expect } from './fixtures';

test.describe('System Preferences', () => {
  test('toggles theme between dark and light', async ({ authPage }) => {
    await authPage.goto('/settings');

    await expect(authPage.locator('html')).toHaveClass(/dark/);

    await authPage.click('button:has-text("Light Mode")');
    await expect(authPage.locator('html')).not.toHaveClass(/dark/);

    await authPage.click('button:has-text("Dark Mode")');
    await expect(authPage.locator('html')).toHaveClass(/dark/);
  });

  test('changes master password successfully', async ({ authPage }) => {
    const newPassword = 'newsecurepass123';

    await authPage.goto('/settings');

    const inputs = authPage.locator('input[type="password"]');
    await inputs.nth(0).fill('testpass123');
    await inputs.nth(1).fill(newPassword);
    await inputs.nth(2).fill(newPassword);
    await authPage.click('button:has-text("Save New Password")');
    await expect(authPage.getByText('Password updated successfully.')).toBeVisible();

    await authPage.click('button:has-text("Terminate Session")');
    await authPage.waitForURL(/\/login/);

    await authPage.fill('input[type="password"]', 'testpass123');
    await authPage.click('button[type="submit"]');
    await expect(authPage.getByText(/Access Denied/i)).toBeVisible();

    await authPage.fill('input[type="password"]', newPassword);
    await authPage.click('button[type="submit"]');
    await authPage.waitForURL('**/vault');

    // Restore default test password so subsequent suites remain deterministic.
    await authPage.goto('/settings');
    const restoreInputs = authPage.locator('input[type="password"]');
    await restoreInputs.nth(0).fill(newPassword);
    await restoreInputs.nth(1).fill('testpass123');
    await restoreInputs.nth(2).fill('testpass123');
    await authPage.click('button:has-text("Save New Password")');
    await expect(authPage.getByText('Password updated successfully.')).toBeVisible();
  });
});
