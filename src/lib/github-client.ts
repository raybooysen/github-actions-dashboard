// src/lib/github-client.ts
import type {
  GitHubUser,
  GitHubRepo,
  GitHubWorkflowRunsResponse,
  GitHubJobsResponse,
} from './github-types';
import {
  getCachedEtag,
  getCachedData,
  setCacheEntry,
} from './etag-cache';

const GITHUB_API = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }

  isRateLimit(): boolean {
    return (
      this.status === 429 ||
      (this.status === 403 && (
        this.message.toLowerCase().includes('rate limit') ||
        this.message.toLowerCase().includes('exceeded')
      ))
    );
  }
}

// ---------------------------------------------------------------------------
// Rate-limit callback
// ---------------------------------------------------------------------------
// Settable from RateLimitContext so every API response updates the context.

export type RateLimitCallback = (info: {
  remaining: number;
  limit: number;
  reset: number;
}) => void;

let _rateLimitCallback: RateLimitCallback | null = null;

export const setRateLimitCallback = (cb: RateLimitCallback | null): void => {
  _rateLimitCallback = cb;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

// rawFetch performs the network request and centralizes rate-limit header
// capture. Every fetch in this module routes through here so POST flows like
// rerunWorkflow also feed the rate-limit callback.
const rawFetch = async (url: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(url, init);

  const rlRemaining = response.headers.get('x-ratelimit-remaining');
  const rlLimit = response.headers.get('x-ratelimit-limit');
  const rlReset = response.headers.get('x-ratelimit-reset');
  if (_rateLimitCallback && rlRemaining !== null && rlLimit !== null && rlReset !== null) {
    _rateLimitCallback({
      remaining: Number(rlRemaining),
      limit: Number(rlLimit),
      reset: Number(rlReset),
    });
  }

  return response;
};

const githubFetch = async <T>(path: string, token: string): Promise<T> => {
  const url = `${GITHUB_API}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };

  // Send If-None-Match when we have a cached ETag for this URL.
  const cachedEtag = getCachedEtag(url);
  if (cachedEtag) {
    headers['If-None-Match'] = cachedEtag;
  }

  const response = await rawFetch(url, { headers });

  // 304 Not Modified — return cached data.
  if (response.status === 304) {
    const cached = getCachedData<T>(url);
    if (cached !== undefined) {
      return cached;
    }
    // Defensive: if there is no cached data despite a 304, fall through to
    // a normal error since we cannot produce a response body.
  }

  if (!response.ok) {
    if (response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const resetUnix = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        throw new GitHubApiError(
          `Rate limit exceeded. Resets at ${new Date(resetUnix).toLocaleTimeString()}`,
          403,
        );
      }
    }
    throw new GitHubApiError(
      `GitHub API error: ${response.statusText}`,
      response.status,
    );
  }

  const data = (await response.json()) as T;

  // Cache the ETag for next time.
  const etag = response.headers.get('etag');
  if (etag) {
    setCacheEntry(url, etag, data);
  }

  return data;
}

export const fetchUser = (token: string): Promise<GitHubUser> => {
  return githubFetch('/user', token);
}

export const fetchRepos = async (
  token: string,
  perPage = 100,
): Promise<GitHubRepo[]> => {
  let allRepos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const repos = await githubFetch<GitHubRepo[]>(
      `/user/repos?sort=pushed&direction=desc&per_page=${perPage}&page=${page}`,
      token,
    );
    allRepos = [...allRepos, ...repos];
    if (repos.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allRepos;
};

export const fetchWorkflowRuns = (
  token: string,
  owner: string,
  repo: string,
  perPage = 5,
): Promise<GitHubWorkflowRunsResponse> => {
  return githubFetch(
    `/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`,
    token,
  );
};

// Per-repo "latest activity" probe. Returns the most recent N runs (not just
// the literal latest) so the caller can group runs by head_sha and surface
// the worst-status workflow for the current commit — see pickRepresentativeRun
// in status-utils.ts. 20 covers any realistic fan-out of workflows triggered
// by a single push/merge.
export const RECENT_RUNS_PER_PAGE = 20;

export const fetchLatestRun = (
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubWorkflowRunsResponse> => {
  return githubFetch(
    `/repos/${owner}/${repo}/actions/runs?per_page=${RECENT_RUNS_PER_PAGE}`,
    token,
  );
};

export const fetchRunHistory = (
  token: string,
  owner: string,
  repo: string,
  workflowId: number,
  perPage = 10,
): Promise<GitHubWorkflowRunsResponse> => {
  return githubFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${perPage}&status=completed`,
    token,
  );
};

export const fetchJobs = (
  token: string,
  owner: string,
  repo: string,
  runId: number,
): Promise<GitHubJobsResponse> => {
  return githubFetch(
    `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    token,
  );
};

export const rerunWorkflow = async (
  token: string,
  owner: string,
  repo: string,
  runId: number,
): Promise<boolean> => {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/rerun`;

  const response = await rawFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new GitHubApiError(
      `Failed to re-run workflow: ${response.statusText}`,
      response.status,
    );
  }

  return true;
};

export const exchangeCodeForToken = async (
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> => {
  // OAuth token endpoint does not emit x-ratelimit-* headers, so the
  // callback is a no-op here — but routing through rawFetch keeps the
  // invariant that every fetch in this module goes through one helper.
  const response = await rawFetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    },
  );

  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub OAuth token exchange failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const data = await response.json();

  if (data.error) {
    // GitHub's OAuth endpoint returns HTTP 200 even for logical errors like
    // bad_verification_code. Use 401 as a synthetic status since the code is
    // invalid/expired, which aligns with the global 401 handler in providers.tsx.
    throw new GitHubApiError(
      data.error_description ?? data.error,
      401,
    );
  }

  return data.access_token;
};
