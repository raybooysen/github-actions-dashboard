// src/lib/github-client.test.ts
//
// NOTE: The exchangeCodeForToken tests in this file are "contract tests" only.
// They verify request construction, response parsing, and error handling of the
// function's logic. They run in jsdom with MSW.
//
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw-server';
import {
  fetchUser,
  fetchRepos,
  fetchWorkflowRuns,
  fetchRunHistory,
  fetchJobs,
  rerunWorkflow,
  exchangeCodeForToken,
  setRateLimitCallback,
  GitHubApiError,
} from './github-client';

describe('fetchUser', () => {
  it('returns the authenticated user', async () => {
    const user = await fetchUser('valid-token');
    expect(user.login).toBe('testuser');
  });

  it('throws GitHubApiError on 401', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        new HttpResponse(null, { status: 401, statusText: 'Unauthorized' }),
      ),
    );
    await expect(fetchUser('bad-token')).rejects.toThrow(GitHubApiError);
  });
});

describe('fetchRepos', () => {
  it('returns repos sorted by push date', async () => {
    server.use(
      http.get('https://api.github.com/user/repos', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('sort')).toBe('pushed');
        expect(url.searchParams.get('direction')).toBe('desc');
        return HttpResponse.json([
          {
            id: 1, name: 'repo-a', full_name: 'user/repo-a',
            owner: { login: 'user' }, private: false,
            pushed_at: '2026-04-18T10:00:00Z',
            html_url: 'https://github.com/user/repo-a',
          },
        ]);
      }),
    );

    const repos = await fetchRepos('token');
    expect(repos).toHaveLength(1);
    expect(repos[0]?.name).toBe('repo-a');
  });

  it('fetches all pages of repositories', async () => {
    server.use(
      http.get('https://api.github.com/user/repos', ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page');
        const perPage = url.searchParams.get('per_page');

        if (perPage === '2') {
          if (page === '1') {
            return HttpResponse.json([
              { id: 1, name: 'repo1', full_name: 'user/repo1', owner: { login: 'user' }, pushed_at: '', html_url: '', private: false },
              { id: 2, name: 'repo2', full_name: 'user/repo2', owner: { login: 'user' }, pushed_at: '', html_url: '', private: false },
            ]);
          }
          if (page === '2') {
            return HttpResponse.json([
              { id: 3, name: 'repo3', full_name: 'user/repo3', owner: { login: 'user' }, pushed_at: '', html_url: '', private: false },
            ]);
          }
        }
        return HttpResponse.json([]);
      }),
    );

    const result = await fetchRepos('token', 2);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.name)).toEqual(['repo1', 'repo2', 'repo3']);
  });
});

describe('fetchWorkflowRuns', () => {
  it('returns workflow runs for a repository', async () => {
    const result = await fetchWorkflowRuns('token', 'testuser', 'api-server');
    expect(result.workflow_runs).toHaveLength(2);
    expect(result.workflow_runs[0]?.name).toBe('CI Pipeline');
  });
});

describe('fetchRunHistory', () => {
  it('returns completed workflow runs with status=completed', async () => {
    const result = await fetchRunHistory('token', 'testuser', 'api-server', 12345);
    expect(result.workflow_runs).toHaveLength(3);
    expect(result.workflow_runs.every(run => run.status === 'completed')).toBe(true);
  });
});

describe('fetchJobs', () => {
  it('returns jobs for a specific workflow run', async () => {
    const result = await fetchJobs('token', 'testuser', 'api-server', 100);
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0]?.name).toBe('build');
    expect(result.jobs[1]?.name).toBe('test');
  });
});

describe('rerunWorkflow', () => {
  it('sends POST to rerun endpoint and returns true on 201', async () => {
    server.use(
      http.post('https://api.github.com/repos/testuser/api-server/actions/runs/100/rerun', () => {
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const result = await rerunWorkflow('token', 'testuser', 'api-server', 100);
    expect(result).toBe(true);
  });

  it('throws GitHubApiError on 403', async () => {
    server.use(
      http.post('https://api.github.com/repos/testuser/api-server/actions/runs/100/rerun', () => {
        return new HttpResponse(null, { status: 403, statusText: 'Forbidden' });
      }),
    );

    await expect(rerunWorkflow('token', 'testuser', 'api-server', 100))
      .rejects.toThrow(GitHubApiError);
  });

  it('invokes rate-limit callback with x-ratelimit-* headers from POST response', async () => {
    server.use(
      http.post('https://api.github.com/repos/testuser/api-server/actions/runs/100/rerun', () => {
        return new HttpResponse(null, {
          status: 201,
          headers: {
            'x-ratelimit-remaining': '4321',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-reset': '1700000000',
          },
        });
      }),
    );

    const callback = vi.fn();
    setRateLimitCallback(callback);

    try {
      await rerunWorkflow('token', 'testuser', 'api-server', 100);
      expect(callback).toHaveBeenCalledWith({
        remaining: 4321,
        limit: 5000,
        reset: 1700000000,
      });
    } finally {
      setRateLimitCallback(null);
    }
  });
});

// Contract tests -- see file header comment for rationale
describe('exchangeCodeForToken', () => {
  const redirectUri = 'http://localhost:3000/auth/callback';

  it('exchanges an authorization code for an access token', async () => {
    const token = await exchangeCodeForToken('code-123', 'client-id', 'client-secret', redirectUri);
    expect(token).toBe('gho_mock_token_abc123');
  });

  it('forwards redirect_uri in the form body', async () => {
    let receivedBody: { redirect_uri?: string } | null = null;
    server.use(
      http.post('https://github.com/login/oauth/access_token', async ({ request }) => {
        receivedBody = (await request.json()) as { redirect_uri?: string };
        return HttpResponse.json({ access_token: 'gho_mock_token_abc123' });
      }),
    );

    await exchangeCodeForToken('code-123', 'client-id', 'client-secret', redirectUri);
    expect(receivedBody).not.toBeNull();
    expect(receivedBody!.redirect_uri).toBe(redirectUri);
  });

  it('throws GitHubApiError when GitHub returns an error in JSON body', async () => {
    server.use(
      http.post('https://github.com/login/oauth/access_token', () =>
        HttpResponse.json({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired',
        }),
      ),
    );

    await expect(
      exchangeCodeForToken('bad-code', 'client-id', 'client-secret', redirectUri),
    ).rejects.toThrow('The code passed is incorrect or expired');

    await expect(
      exchangeCodeForToken('bad-code', 'client-id', 'client-secret', redirectUri),
    ).rejects.toBeInstanceOf(GitHubApiError);
  });

  it('throws GitHubApiError when the HTTP response is not ok (e.g., 502 outage)', async () => {
    server.use(
      http.post('https://github.com/login/oauth/access_token', () =>
        new HttpResponse('<html>Bad Gateway</html>', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(
      exchangeCodeForToken('code-123', 'client-id', 'client-secret', redirectUri),
    ).rejects.toBeInstanceOf(GitHubApiError);

    try {
      await exchangeCodeForToken('code-123', 'client-id', 'client-secret', redirectUri);
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError);
      expect((error as GitHubApiError).status).toBe(502);
      expect((error as GitHubApiError).message).toContain('502');
    }
  });
});

describe('GitHubApiError.isRateLimit', () => {
  it('detects primary rate limit (403 with "rate limit" message)', () => {
    const error = new GitHubApiError('API rate limit exceeded for user', 403);
    expect(error.isRateLimit()).toBe(true);
  });

  it('detects secondary rate limit (429)', () => {
    const error = new GitHubApiError('Too many requests', 429);
    expect(error.isRateLimit()).toBe(true);
  });

  it('returns false for non-rate-limit 403', () => {
    const error = new GitHubApiError('Forbidden', 403);
    expect(error.isRateLimit()).toBe(false);
  });

  it('includes status and name', () => {
    const error = new GitHubApiError('Failed', 500);
    expect(error.status).toBe(500);
    expect(error.name).toBe('GitHubApiError');
  });
});

describe('rate limit handling', () => {
  it('throws a descriptive error when rate limited', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        new HttpResponse(null, {
          status: 403,
          statusText: 'Forbidden',
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          },
        }),
      ),
    );

    await expect(fetchUser('token')).rejects.toThrow('Rate limit exceeded');
  });

  it('throws a generic GitHubApiError on 403 without rate limit headers', async () => {
    server.use(
      http.get('https://api.github.com/user', () =>
        new HttpResponse(null, {
          status: 403,
          statusText: 'Forbidden',
        }),
      ),
    );

    await expect(fetchUser('token')).rejects.toBeInstanceOf(GitHubApiError);
    await expect(fetchUser('token')).rejects.toThrow('GitHub API error: Forbidden');

    try {
      await fetchUser('token');
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError);
      expect((error as GitHubApiError).status).toBe(403);
      expect((error as GitHubApiError).message).not.toContain('Rate limit');
    }
  });
});
