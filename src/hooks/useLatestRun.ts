// src/hooks/useLatestRun.ts
import { useQuery, useQueries, type Query } from '@tanstack/react-query';
import { fetchLatestRun } from '@/lib/github-client';
import type { GitHubRepo, GitHubWorkflowRunsResponse } from '@/lib/github-types';

export const LATEST_RUN_QUERY_KEY = 'latestRun';

export const getLatestRunQueryKey = (owner: string, repo: string) => {
  return [LATEST_RUN_QUERY_KEY, owner, repo] as const;
}

export const useLatestRun = (
  token: string | null,
  owner: string,
  repo: string,
  options: {
    enabled?: boolean;
    refetchInterval?: number | false | ((query: Query<GitHubWorkflowRunsResponse, Error, GitHubWorkflowRunsResponse, readonly ["latestRun", string, string]>) => number | false);
    staleTime?: number;
  } = {}
) => {
  return useQuery({
    queryKey: getLatestRunQueryKey(owner, repo),
    queryFn: () => fetchLatestRun(token!, owner, repo),
    enabled: !!token && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: options.staleTime,
  });
};

export const useLatestRuns = (
  token: string | null,
  repos: GitHubRepo[] | undefined,
  options: {
    staleTime?: number;
  } = {}
) => {
  return useQueries({
    queries: (repos ?? []).map((repo) => ({
      queryKey: getLatestRunQueryKey(repo.owner.login, repo.name),
      queryFn: () => fetchLatestRun(token!, repo.owner.login, repo.name),
      enabled: !!token,
      staleTime: options.staleTime,
    })),
  });
};
