// e2e/auth.spec.ts
// E2E Scenarios 3 & 4: Unauthenticated guard and OAuth callback error.

import { test, expect } from '@playwright/test';
import { mockGitHubApi, MOCK_TOKEN } from './helpers';

test.describe('Authentication Guard', () => {
  // Scenario 3: Unauthenticated guard
  test('redirects from /dashboard to / when not authenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Verify the page redirects to the landing page
    await expect(page).toHaveURL('/');

    // Verify landing page content is visible
    const heading = page.getByTestId('landing-title');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('GitHub Actions');
  });
});

test.describe('OAuth Callback Error', () => {
  // Scenario 4: OAuth callback error
  test('displays error message and back link when error param is present', async ({
    page,
  }) => {
    await page.goto('/auth/callback?error=access_denied');

    // Verify error message is displayed
    const errorMessage = page.getByTestId('callback-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('access_denied');

    // Verify "Back to login" link is visible
    const backLink = page.getByTestId('callback-back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Back to login');

    // Verify the back link points to the landing page
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('displays error description when provided by GitHub', async ({
    page,
  }) => {
    await page.goto(
      '/auth/callback?error=access_denied&error_description=The+user+has+denied+your+application+access.',
    );

    const errorMessage = page.getByTestId('callback-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(
      'The user has denied your application access.',
    );
  });
});

test.describe('OAuth Callback Success', () => {
  test('redirects to /dashboard after successful token exchange', async ({
    page,
  }) => {
    // Mock the local token exchange API
    await page.route('**/api/auth/token', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: MOCK_TOKEN }),
      });
    });

    // Mock GitHub API because /dashboard will call it immediately after redirect
    await mockGitHubApi(page);

    // Set the expected state in localStorage to pass CSRF protection
    await page.addInitScript((state) => {
      window.localStorage.setItem('gh_auth_state', state);
    }, 'test-success-state');

    // Navigate to the callback URL with a test code and the matching state
    await page.goto('/auth/callback?code=test-success-code&state=test-success-state');

    // Verify it redirects to /dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify dashboard content is visible (proves the token was saved and used)
    await expect(page.getByTestId('dashboard-shell')).toBeVisible();
    await expect(page.getByTestId('repo-row-web-app')).toBeVisible();
  });
});
