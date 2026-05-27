import { test, expect } from '@playwright/test';
import { seedAuth, mockGitHubApi, MOCK_REPOS } from './helpers';

test.describe('Dashboard with Data', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGitHubApi(page);
  });

  test('renders filter pills with correct per-status counts', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // With per_page=1 (latest run per repo):
    // api-server latest = MOCK_RUNNING_RUN (in_progress)
    // web-app latest = MOCK_FAILED_RUN (failure)
    await expect(page.getByTestId('filter-pill-all-count')).toHaveText('2');
    await expect(page.getByTestId('filter-pill-running-count')).toHaveText('1');
    await expect(page.getByTestId('filter-pill-queued-count')).toHaveText('0');
    await expect(page.getByTestId('filter-pill-failed-count')).toHaveText('1');

    await expect(page.getByTestId('filter-search')).toHaveAttribute(
      'placeholder',
      'Search 2 repositories...',
    );
  });

  test('renders collapsed repo rows', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    // Wait for repo grid to finish loading
    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Both repos should appear as collapsed rows
    const webAppRow = page.getByTestId('repo-row-web-app');
    await expect(webAppRow).toBeVisible();

    const apiServerRow = page.getByTestId('repo-row-api-server');
    await expect(apiServerRow).toBeVisible();

    // Repo names should be visible in collapsed rows
    await expect(webAppRow.getByTestId('repo-row-name')).toContainText('testuser/web-app');
    await expect(apiServerRow.getByTestId('repo-row-name')).toContainText('testuser/api-server');

    // Latest workflow names visible in collapsed state
    await expect(webAppRow.getByTestId('repo-row-workflow')).toContainText('Tests');
    await expect(apiServerRow.getByTestId('repo-row-workflow')).toContainText('CI Pipeline');
  });

  test('renders dashboard header with user avatar and logout', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible();

    const nav = page.getByTestId('dashboard-nav');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute('aria-label', 'Dashboard navigation');

    const title = page.getByTestId('dashboard-title');
    await expect(title).toContainText('Actions Dashboard');

    const avatar = page.getByTestId('dashboard-user-avatar');
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute('alt', 'testuser');

    const logoutBtn = page.getByTestId('dashboard-logout');
    await expect(logoutBtn).toBeVisible();
    await expect(logoutBtn).toContainText('Logout');
  });

  test('failed repo is auto-expanded with run details', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // web-app has a failed run — should be auto-expanded
    // The expand arrow should show ▾ (expanded)
    const webAppRow = page.getByTestId('repo-row-web-app');
    await expect(webAppRow).toBeVisible();

    // The expanded section should show workflow run details
    // (WorkflowRunRow is rendered below the collapsed RepoRow)
    await expect(page.getByTestId('workflow-run-98')).toBeVisible();
  });

  test('clicking a collapsed row expands it', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // api-server starts collapsed (it's running, not failed)
    const apiServerRow = page.getByTestId('repo-row-api-server');
    await expect(apiServerRow).toBeVisible();

    // Click the row (not the pin button) to expand
    await apiServerRow.getByTestId('repo-row-expand').click();

    // Should now show the workflow run details
    await expect(page.getByTestId('workflow-run-100')).toBeVisible();
  });
});

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Only seed once for the initial load
    await page.addInitScript((tkn: string) => {
      if (!window.sessionStorage.getItem('auth_seeded')) {
        window.localStorage.setItem('gh_actions_token', tkn);
        window.sessionStorage.setItem('auth_seeded', 'true');
      }
    }, 'gho_logout_test_token');
    await mockGitHubApi(page);
  });

  test('successfully logs out and redirects to landing page', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    // Click logout button
    await page.getByTestId('dashboard-logout').click();

    // Verify redirect to landing page
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('landing-title')).toBeVisible();

    // Verify token is cleared by trying to go back to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });
});

test.describe('Dashboard Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGitHubApi(page);
  });

  test('search input filters repos by name', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Both repos should be visible initially
    await expect(page.getByTestId('repo-row-web-app')).toBeVisible();
    await expect(page.getByTestId('repo-row-api-server')).toBeVisible();

    // Type in search to filter to just "api"
    const searchInput = page.getByTestId('filter-search');
    await searchInput.fill('api');

    await expect(page.getByTestId('repo-row-api-server')).toBeVisible();
    await expect(page.getByTestId('repo-row-web-app')).not.toBeVisible();
  });

  test('status pills filter repos by run status', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Click "Failed" filter pill
    const failedPill = page.getByTestId('filter-pill-failed');
    await failedPill.click();

    await expect(failedPill).toHaveAttribute('aria-pressed', 'true');

    // web-app has a failed latest run, should be visible
    await expect(page.getByTestId('repo-row-web-app')).toBeVisible();

    // api-server latest run is running (not failed), should not be visible
    await expect(page.getByTestId('repo-row-api-server')).not.toBeVisible();
  });

  test('empty state appears when no repos match filters', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    const searchInput = page.getByTestId('filter-search');
    await searchInput.fill('nonexistent-repo-xyz');

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(
      'No repositories match your filters.',
    );
  });

  test('clearing filters restores all repos', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Filter to show only failed
    const failedPill = page.getByTestId('filter-pill-failed');
    await failedPill.click();

    await expect(page.getByTestId('repo-row-web-app')).toBeVisible();
    await expect(page.getByTestId('repo-row-api-server')).not.toBeVisible();

    // Click "All" to restore
    const allPill = page.getByTestId('filter-pill-all');
    await allPill.click();

    await expect(page.getByTestId('repo-row-web-app')).toBeVisible();
    await expect(page.getByTestId('repo-row-api-server')).toBeVisible();
  });

  test('search and status filter apply simultaneously', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Search for "web" and filter for "running"
    const searchInput = page.getByTestId('filter-search');
    await searchInput.fill('web');

    const runningPill = page.getByTestId('filter-pill-running');
    await runningPill.click();

    // web-app latest run is failed (not running), so nothing matches
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
  });
});

test.describe('Archived repositories', () => {
  test('hides archived repos from the list and surfaces them as a hidden count', async ({ page }) => {
    await seedAuth(page);
    await mockGitHubApi(page);

    // Override /user/repos AFTER mockGitHubApi so this handler wins, returning
    // the standard active repos plus an extra archived repo that should never render.
    await page.route('https://api.github.com/user/repos*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          ...MOCK_REPOS,
          {
            id: 99,
            name: 'legacy-tool',
            full_name: 'testuser/legacy-tool',
            owner: { login: 'testuser' },
            private: false,
            archived: true,
            pushed_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/testuser/legacy-tool',
          },
        ]),
      });
    });

    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    await expect(page.getByTestId('repo-row-api-server')).toBeVisible();
    await expect(page.getByTestId('repo-row-legacy-tool')).toHaveCount(0);

    await expect(page.getByTestId('archived-hidden-count')).toHaveText('1 archived repository hidden');
  });
});
