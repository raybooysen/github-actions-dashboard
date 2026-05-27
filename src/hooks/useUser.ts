// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/lib/github-client';
import type { GitHubUser } from '@/lib/github-types';

export const useUser = (token: string | null) => {
  return useQuery<GitHubUser>({
    queryKey: ['user'],
    queryFn: () => fetchUser(token!),
    enabled: token !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
