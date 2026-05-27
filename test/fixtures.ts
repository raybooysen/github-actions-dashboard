// test/fixtures.ts
import type {
  GitHubUser,
  GitHubRepo,
  GitHubWorkflowRun,
  GitHubWorkflowRunsResponse,
} from '@/lib/github-types';

export const mockUser: GitHubUser = {
  login: 'testuser',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  name: 'Test User',
};

export const mockRepos: GitHubRepo[] = [
  {
    id: 1,
    name: 'api-server',
    full_name: 'testuser/api-server',
    owner: { login: 'testuser' },
    private: false,
    archived: false,
    pushed_at: '2026-04-18T10:00:00Z',
    html_url: 'https://github.com/testuser/api-server',
  },
  {
    id: 2,
    name: 'web-app',
    full_name: 'testuser/web-app',
    owner: { login: 'testuser' },
    private: true,
    archived: false,
    pushed_at: '2026-04-18T09:00:00Z',
    html_url: 'https://github.com/testuser/web-app',
  },
];

export const mockArchivedRepo: GitHubRepo = {
  id: 9,
  name: 'legacy-tool',
  full_name: 'testuser/legacy-tool',
  owner: { login: 'testuser' },
  private: false,
  archived: true,
  pushed_at: '2024-01-10T08:00:00Z',
  html_url: 'https://github.com/testuser/legacy-tool',
};

export const mockRunning: GitHubWorkflowRun = {
  id: 100,
  workflow_id: 1000,
  name: 'CI Pipeline',
  display_title: 'Fix caching layer for Redis connections',
  status: 'in_progress',
  conclusion: null,
  head_branch: 'main',
  head_sha: 'abc123def456',
  event: 'push',
  created_at: '2026-04-18T10:30:00Z',
  updated_at: '2026-04-18T10:32:00Z',
  run_started_at: '2026-04-18T10:30:00Z',
  html_url: 'https://github.com/testuser/api-server/actions/runs/100',
  run_number: 42,
  head_commit: {
    message: 'Fix caching layer for Redis connections',
    author: { name: 'Test User' },
  },
  triggering_actor: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
  },
  pull_requests: [],
};

export const mockPassed: GitHubWorkflowRun = {
  id: 99,
  workflow_id: 1001,
  name: 'Deploy',
  display_title: 'Deploy v2.1.0 to production',
  status: 'completed',
  conclusion: 'success',
  head_branch: 'main',
  head_sha: 'def789ghi012',
  event: 'push',
  created_at: '2026-04-18T10:00:00Z',
  updated_at: '2026-04-18T10:05:00Z',
  run_started_at: '2026-04-18T10:00:00Z',
  html_url: 'https://github.com/testuser/api-server/actions/runs/99',
  run_number: 41,
  head_commit: {
    message: 'Deploy v2.1.0 to production',
    author: { name: 'Test User' },
  },
  triggering_actor: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
  },
  pull_requests: [],
};

export const mockFailed: GitHubWorkflowRun = {
  id: 98,
  workflow_id: 1002,
  name: 'Tests',
  display_title: 'Add OAuth login flow',
  status: 'completed',
  conclusion: 'failure',
  head_branch: 'feature/login',
  head_sha: 'xyz789abc012',
  event: 'pull_request',
  created_at: '2026-04-18T09:50:00Z',
  updated_at: '2026-04-18T09:55:00Z',
  run_started_at: '2026-04-18T09:50:00Z',
  html_url: 'https://github.com/testuser/web-app/actions/runs/98',
  run_number: 17,
  head_commit: {
    message: 'Add OAuth login flow',
    author: { name: 'Another Dev' },
  },
  triggering_actor: {
    login: 'anotherdev',
    avatar_url: 'https://avatars.githubusercontent.com/u/2',
  },
  pull_requests: [{ number: 42, url: 'https://api.github.com/repos/testuser/web-app/pulls/42' }],
};

export const mockWorkflowRunsResponse: GitHubWorkflowRunsResponse = {
  total_count: 2,
  workflow_runs: [mockRunning, mockPassed],
};
