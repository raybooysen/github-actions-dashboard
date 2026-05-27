// src/hooks/useRepositories.ts
import { useQuery } from '@tanstack/react-query';
import { fetchRepos } from '@/lib/github-client';
import type { GitHubRepo } from '@/lib/github-types';

export const useRepositories = (token: string | null) => {
  return useQuery<GitHubRepo[]>({
    queryKey: ['repos'],
    queryFn: () => fetchRepos(token!),
    enabled: token !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
