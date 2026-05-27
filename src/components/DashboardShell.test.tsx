// src/components/DashboardShell.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/msw-server';
import { http, HttpResponse } from 'msw';
import DashboardShell from './DashboardShell';
import type {
  GitHubRepo,
  GitHubWorkflowRunsResponse,
} from '@/lib/github-types';

// Mock useAuth to provide a stable token without needing localStorage
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    token: 'gho_test_token',
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    handleCallback: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock IntersectionObserver for jsdom — all elements report as visible
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(el: Element) {
    // Immediately report as visible
    this.callback(
      [{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// pushed_at order is intentionally INVERTED relative to the latest-run
// created_at order so the sort test fails if the comparator falls back to
// pushed_at (buggy behaviour) and only passes when it uses latestRunByRepo
// keyed by full_name correctly.
const testRepos: GitHubRepo[] = [
  {
    id: 1, name: 'api-server', full_name: 'testuser/api-server',
    owner: { login: 'testuser' }, private: false, archived: false,
    pushed_at: '2026-04-18T08:00:00Z', html_url: 'https://github.com/testuser/api-server',
  },
  {
    id: 2, name: 'web-app', full_name: 'testuser/web-app',
    owner: { login: 'testuser' }, private: true, archived: false,
    pushed_at: '2026-04-18T09:00:00Z', html_url: 'https://github.com/testuser/web-app',
  },
  {
    id: 3, name: 'docs-site', full_name: 'testuser/docs-site',
    owner: { login: 'testuser' }, private: false, archived: false,
    pushed_at: '2026-04-18T10:00:00Z', html_url: 'https://github.com/testuser/docs-site',
  },
];

const apiServerRuns: GitHubWorkflowRunsResponse = {
  total_count: 1,
  workflow_runs: [{
    id: 100, workflow_id: 1, name: 'CI Pipeline', display_title: 'Fix cache', status: 'completed', conclusion: 'failure',
    head_branch: 'main', head_sha: 'abc123', event: 'push',
    created_at: '2026-04-18T10:30:00Z', updated_at: '2026-04-18T10:32:00Z',
    run_started_at: '2026-04-18T10:30:00Z', html_url: 'https://github.com/testuser/api-server/actions/runs/100',
    run_number: 42, head_commit: { message: 'Fix cache', author: { name: 'Test' } },
    triggering_actor: { login: 'testuser', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
    pull_requests: [],
  }],
};

const webAppRuns: GitHubWorkflowRunsResponse = {
  total_count: 1,
  workflow_runs: [{
    id: 200, workflow_id: 2, name: 'Build', display_title: 'Add login', status: 'in_progress', conclusion: null,
    head_branch: 'develop', head_sha: 'def456', event: 'push',
    created_at: '2026-04-18T09:30:00Z', updated_at: '2026-04-18T09:32:00Z',
    run_started_at: '2026-04-18T09:30:00Z', html_url: 'https://github.com/testuser/web-app/actions/runs/200',
    run_number: 15, head_commit: { message: 'Add login', author: { name: 'Test' } },
    triggering_actor: { login: 'testuser', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
    pull_requests: [],
  }],
};

const docsSiteRuns: GitHubWorkflowRunsResponse = {
  total_count: 1,
  workflow_runs: [{
    id: 300, workflow_id: 3, name: 'Deploy Docs', display_title: 'Update readme', status: 'completed', conclusion: 'success',
    head_branch: 'main', head_sha: 'ghi789', event: 'push',
    created_at: '2026-04-18T08:30:00Z', updated_at: '2026-04-18T08:35:00Z',
    run_started_at: '2026-04-18T08:30:00Z', html_url: 'https://github.com/testuser/docs-site/actions/runs/300',
    run_number: 8, head_commit: { message: 'Update readme', author: { name: 'Test' } },
    triggering_actor: { login: 'testuser', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
    pull_requests: [],
  }],
};

const setupMswHandlers = () => {
  server.use(
    http.get('https://api.github.com/user', () => {
      return HttpResponse.json({
        login: 'testuser', avatar_url: 'https://avatars.githubusercontent.com/u/1', name: 'Test User',
      });
    }),
    http.get('https://api.github.com/user/repos', () => {
      return HttpResponse.json(testRepos);
    }),
    http.get('https://api.github.com/repos/testuser/api-server/actions/runs', () => {
      return HttpResponse.json(apiServerRuns);
    }),
    http.get('https://api.github.com/repos/testuser/web-app/actions/runs', () => {
      return HttpResponse.json(webAppRuns);
    }),
    http.get('https://api.github.com/repos/testuser/docs-site/actions/runs', () => {
      return HttpResponse.json(docsSiteRuns);
    }),
  );
}

describe('DashboardShell integration', () => {
  beforeEach(() => {
    setupMswHandlers();
  });

  it('filters reduce visible repos when searching by name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardShell />);

    // Wait for repo rows to load
    await waitFor(() => {
      expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('repo-row-web-app')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('repo-row-docs-site')).toBeInTheDocument();
    });

    // Type in search to filter to "api"
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'api');

    // Only api-server should remain visible
    expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
    expect(screen.queryByTestId('repo-row-web-app')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repo-row-docs-site')).not.toBeInTheDocument();
  });

  it('sorting order: most recent run first', async () => {
    renderWithProviders(<DashboardShell />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
      expect(screen.getByTestId('repo-row-web-app')).toBeInTheDocument();
      expect(screen.getByTestId('repo-row-docs-site')).toBeInTheDocument();
    });

    const repoGrid = screen.getByTestId('repo-grid');
    const rows = within(repoGrid).getAllByTestId(/^repo-row-(api-server|web-app|docs-site)$/);

    // Expected order by created_at descending:
    // api-server (10:30) → web-app (09:30) → docs-site (08:30)
    expect(rows[0]).toHaveAttribute('data-testid', 'repo-row-api-server');
    expect(rows[1]).toHaveAttribute('data-testid', 'repo-row-web-app');
    expect(rows[2]).toHaveAttribute('data-testid', 'repo-row-docs-site');
  });

  it('embeds total repo count in the search placeholder and per-status counts in the filter pills', async () => {
    renderWithProviders(<DashboardShell />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
    });

    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search 3 repositories...');
    expect(screen.getByTestId('filter-pill-all-count')).toHaveTextContent('3');
    expect(screen.getByTestId('filter-pill-failed-count')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-pill-running-count')).toHaveTextContent('1');
  });

  it('hides archived repos from the list and shows them as a count footer', async () => {
    const archivedLegacy: GitHubRepo = {
      id: 99, name: 'legacy-tool', full_name: 'testuser/legacy-tool',
      owner: { login: 'testuser' }, private: false, archived: true,
      pushed_at: '2024-01-01T00:00:00Z', html_url: 'https://github.com/testuser/legacy-tool',
    };
    const archivedRetired: GitHubRepo = {
      id: 100, name: 'retired-service', full_name: 'testuser/retired-service',
      owner: { login: 'testuser' }, private: true, archived: true,
      pushed_at: '2024-02-01T00:00:00Z', html_url: 'https://github.com/testuser/retired-service',
    };
    server.use(
      http.get('https://api.github.com/user/repos', () => {
        return HttpResponse.json([...testRepos, archivedLegacy, archivedRetired]);
      }),
    );

    renderWithProviders(<DashboardShell />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('repo-row-legacy-tool')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repo-row-retired-service')).not.toBeInTheDocument();

    const archivedFooter = screen.getByTestId('archived-hidden-count');
    expect(archivedFooter).toHaveTextContent('2 archived repositories hidden');
  });

  it('uses the singular form when exactly one archived repo is hidden', async () => {
    const archived: GitHubRepo = {
      id: 99, name: 'legacy-tool', full_name: 'testuser/legacy-tool',
      owner: { login: 'testuser' }, private: false, archived: true,
      pushed_at: '2024-01-01T00:00:00Z', html_url: 'https://github.com/testuser/legacy-tool',
    };
    server.use(
      http.get('https://api.github.com/user/repos', () => {
        return HttpResponse.json([...testRepos, archived]);
      }),
    );

    renderWithProviders(<DashboardShell />);

    await waitFor(() => {
      expect(screen.getByTestId('repo-row-api-server')).toBeInTheDocument();
    });

    expect(screen.getByTestId('archived-hidden-count')).toHaveTextContent('1 archived repository hidden');
  });
});
