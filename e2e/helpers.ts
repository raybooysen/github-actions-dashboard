// e2e/helpers.ts
// Shared test utilities for Playwright E2E tests.
// Uses page.route() to intercept GitHub API calls and page.addInitScript() to seed localStorage.

import type { Page } from '@playwright/test';
import {
  mockUser,
  mockRepos,
  mockRunning,
  mockPassed,
  mockFailed,
} from '../test/fixtures';

// -- Mock data (constants using fixtures) --

export const MOCK_TOKEN = 'gho_test_token_e2e_1234567890';

export const MOCK_USER = mockUser;
export const MOCK_REPOS = mockRepos;
export const MOCK_RUNNING_RUN = mockRunning;
export const MOCK_PASSED_RUN = mockPassed;
export const MOCK_FAILED_RUN = mockFailed;

// Runs for api-server: one running, one passed
export const MOCK_API_SERVER_RUNS = {
  total_count: 2,
  workflow_runs: [MOCK_RUNNING_RUN, MOCK_PASSED_RUN],
};

// Runs for web-app: one failed
export const MOCK_WEB_APP_RUNS = {
  total_count: 1,
  workflow_runs: [MOCK_FAILED_RUN],
};

/**
 * Seeds localStorage with a mock token BEFORE the page navigates.
 * Must be called before page.goto().
 */
export const seedAuth = async (page: Page, token = MOCK_TOKEN): Promise<void> => {
  await page.addInitScript((tkn: string) => {
    window.localStorage.setItem('gh_actions_token', tkn);
  }, token);
};

/**
 * Intercepts all GitHub API routes via page.route() and returns mock data.
 * Must be called before page.goto().
 */
export const mockGitHubApi = async (page: Page): Promise<void> => {
  // Mock GET /user
  await page.route('https://api.github.com/user', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  // Mock GET /user/repos
  await page.route('https://api.github.com/user/repos*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REPOS),
    });
  });

  // Mock GET /repos/:owner/:repo/actions/runs
  await page.route(
    '**/api.github.com/repos/testuser/api-server/actions/runs*',
    (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_API_SERVER_RUNS),
      });
    },
  );

  await page.route(
    '**/api.github.com/repos/testuser/web-app/actions/runs*',
    (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WEB_APP_RUNS),
      });
    },
  );

  // Mock GET /repos/:owner/:repo/actions/workflows/:id/runs (history query)
  await page.route(
    /api\.github\.com\/repos\/.*\/actions\/workflows\/\d+\/runs/,
    (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 3,
          workflow_runs: [
            { ...MOCK_PASSED_RUN, id: 201, run_started_at: '2026-04-18T09:00:00Z', updated_at: '2026-04-18T09:02:30Z' },
            { ...MOCK_PASSED_RUN, id: 202, run_started_at: '2026-04-17T14:00:00Z', updated_at: '2026-04-17T14:03:00Z' },
            { ...MOCK_PASSED_RUN, id: 203, run_started_at: '2026-04-16T10:00:00Z', updated_at: '2026-04-16T10:01:45Z' },
          ],
        }),
      });
    },
  );

  // Mock GET /repos/:owner/:repo/actions/runs/:runId/jobs
  await page.route(
    '**/api.github.com/repos/*/actions/runs/*/jobs*',
    (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 2,
          jobs: [
            { id: 1001, name: 'build', status: 'completed', conclusion: 'success', started_at: '2026-04-18T10:30:10Z', completed_at: '2026-04-18T10:31:20Z', html_url: 'https://github.com/testuser/api-server/actions/runs/100/job/1001', steps: [] },
            { id: 1002, name: 'test', status: 'in_progress', conclusion: null, started_at: '2026-04-18T10:31:25Z', completed_at: null, html_url: 'https://github.com/testuser/api-server/actions/runs/100/job/1002', steps: [] },
          ],
        }),
      });
    },
  );
};
