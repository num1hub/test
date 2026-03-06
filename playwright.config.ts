import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  expect: {
    timeout: 15_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/setup/globalSetup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    storageState: undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      'NEXT_TELEMETRY_DISABLED=1 DATA_DIR=./data-test VAULT_PASSWORD=testpass123 npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
