import { test, expect } from '@playwright/test';
import { seedAuth, mockGitHubApi } from './helpers';

const VIEWPORTS = [
  { width: 320, height: 568, label: '320px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1024, height: 768, label: '1024px' },
  { width: 1440, height: 900, label: '1440px' },
];

test.describe('Responsive Layout', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`at ${viewport.label}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test(`landing page has no horizontal overflow`, async ({ page }) => {
        await page.goto('/');

        // Wait for the landing page to render
        await expect(page.getByTestId('landing-title')).toBeVisible();

        // Check for horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth > window.innerWidth
          );
        });

        expect(hasOverflow).toBe(false);
      });

      test(`dashboard has no horizontal overflow`, async ({ page }) => {
        await seedAuth(page);
        await mockGitHubApi(page);
        await page.goto('/dashboard');

        // Wait for dashboard to render
        await expect(
          page.getByTestId('dashboard-shell'),
        ).toBeVisible();

        // Wait for data to load
        const repoGrid = page.getByTestId('repo-grid');
        await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

        // Check for horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth > window.innerWidth
          );
        });

        expect(hasOverflow).toBe(false);
      });
    });
  }
});

test.describe('Mobile Layout (360px)', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGitHubApi(page);
  });

  test('color bar visible on mobile repo rows', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // web-app has a failed run (border-status-failure), api-server is running (border-status-running)
    const webAppRow = page.getByTestId('repo-row-web-app');
    await expect(webAppRow).toBeVisible();

    const apiServerRow = page.getByTestId('repo-row-api-server');
    await expect(apiServerRow).toBeVisible();

    // Verify the left border (color bar) is present via computed styles
    // At 360px (mobile), repo rows have border-l-4 with a status color
    const webAppBorder = await webAppRow.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        borderLeftWidth: styles.borderLeftWidth,
        borderLeftStyle: styles.borderLeftStyle,
      };
    });

    // border-l-4 = 4px, should be solid and non-zero
    expect(parseFloat(webAppBorder.borderLeftWidth)).toBeGreaterThanOrEqual(2);
    expect(webAppBorder.borderLeftStyle).toBe('solid');

    const apiServerBorder = await apiServerRow.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        borderLeftWidth: styles.borderLeftWidth,
        borderLeftStyle: styles.borderLeftStyle,
      };
    });

    expect(parseFloat(apiServerBorder.borderLeftWidth)).toBeGreaterThanOrEqual(2);
    expect(apiServerBorder.borderLeftStyle).toBe('solid');
  });

  test('status label visible on mobile repo rows', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // web-app latest run is failed -> label should be "Failed"
    const webAppRow = page.getByTestId('repo-row-web-app');
    const webAppStatusLabel = webAppRow.getByTestId('repo-row-status-label');
    await expect(webAppStatusLabel).toBeVisible();
    await expect(webAppStatusLabel).toContainText('Failed');

    // api-server latest run is in_progress -> label should be "Running"
    const apiServerRow = page.getByTestId('repo-row-api-server');
    const apiServerStatusLabel = apiServerRow.getByTestId('repo-row-status-label');
    await expect(apiServerStatusLabel).toBeVisible();
    await expect(apiServerStatusLabel).toContainText('Running');
  });

  test('expand and collapse repo row via tap', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // api-server starts collapsed (running, not failed)
    const apiServerRow = page.getByTestId('repo-row-api-server');
    await expect(apiServerRow).toBeVisible();

    // Workflow run should not be visible yet
    await expect(page.getByTestId('workflow-run-100')).not.toBeVisible();

    // Tap (click) the expand button to expand
    await apiServerRow.getByTestId('repo-row-expand').click();

    // Workflow run details should now be visible
    await expect(page.getByTestId('workflow-run-100')).toBeVisible();

    // Tap again to collapse
    await apiServerRow.getByTestId('repo-row-expand').click();

    // Workflow run details should be hidden again
    await expect(page.getByTestId('workflow-run-100')).not.toBeVisible();
  });

  test('filter pills horizontally scrollable', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    const pillsContainer = page.getByTestId('filter-pills');
    await expect(pillsContainer).toBeVisible();

    // Verify overflow-x is set to 'auto' or 'scroll' on the pills container
    const overflowX = await pillsContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflowX;
    });
    expect(['auto', 'scroll']).toContain(overflowX);

    // All 5 pills should be present in the DOM
    await expect(page.getByTestId('filter-pill-all')).toBeVisible();
    await expect(page.getByTestId('filter-pill-running')).toBeVisible();
    await expect(page.getByTestId('filter-pill-failed')).toBeVisible();
    await expect(page.getByTestId('filter-pill-passed')).toBeVisible();
    await expect(page.getByTestId('filter-pill-queued')).toBeVisible();
  });

  test('re-run button accessible on failed run', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // web-app is auto-expanded because it has a failed run
    const workflowRun = page.getByTestId('workflow-run-98');
    await expect(workflowRun).toBeVisible();

    // Find the re-run button within the workflow run row.
    // The dual-render layout means there are two re-run buttons (mobile + desktop).
    // At 360px, only the mobile one is visible. Use .first() to grab the mobile
    // button and verify it.
    const rerunButtons = workflowRun.locator('button', { hasText: 'Re-run' });
    const visibleRerunButton = rerunButtons.first();
    await expect(visibleRerunButton).toBeVisible();

    // Verify the re-run button has minimum 44px tap target height
    const buttonHeight = await visibleRerunButton.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
  });

  test('no horizontal overflow at 360px', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-shell')).toBeVisible();

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Verify no horizontal scrollbar
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });
});

test.describe('Desktop Layout (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGitHubApi(page);
  });

  test('full desktop layout renders correctly', async ({ page }) => {
    await page.goto('/dashboard');

    const repoGrid = page.getByTestId('repo-grid');
    await expect(repoGrid).toHaveAttribute('aria-busy', 'false');

    // Verify status dots are visible (hidden on mobile, shown via sm:inline-flex)
    // The StatusIndicator is wrapped in a span with hidden sm:inline-flex
    // At 1280px (desktop), the status dot wrapper should be visible
    const apiServerRow = page.getByTestId('repo-row-api-server');
    await expect(apiServerRow).toBeVisible();

    // Verify branch badges are visible on desktop (hidden sm:inline on mobile)
    const branchBadge = apiServerRow.getByTestId('repo-row-branch');
    await expect(branchBadge).toBeVisible();
    await expect(branchBadge).toContainText('main');

    // Verify actor avatar is visible on desktop
    const actorAvatar = apiServerRow.getByTestId('repo-row-actor-avatar');
    await expect(actorAvatar).toBeVisible();

    // Verify the expand/collapse still works on desktop
    await apiServerRow.getByTestId('repo-row-expand').click();
    await expect(page.getByTestId('workflow-run-100')).toBeVisible();

    // Verify desktop layout of workflow run row (desktop section visible, mobile hidden)
    const workflowRun = page.getByTestId('workflow-run-100');
    const desktopTop = workflowRun.getByTestId('workflow-run-desktop-top');
    await expect(desktopTop).toBeVisible();

    // Verify branch badge visible in workflow run row on desktop
    const runBranch = workflowRun.getByTestId('workflow-run-branch');
    await expect(runBranch).toBeVisible();
  });
});
