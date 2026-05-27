// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      // E2E tests don't go through real OAuth; set a non-empty value so
      // useAuth's missing-client-id guard doesn't throw on the connect click.
      NEXT_PUBLIC_GITHUB_CLIENT_ID:
        process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? 'e2e-test-client-id',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
