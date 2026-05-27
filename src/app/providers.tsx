// src/app/providers.tsx
'use client';

import { useState, type ReactNode } from 'react';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { RateLimitProvider } from '@/contexts/RateLimitContext';
import { GitHubApiError } from '@/lib/github-client';
import { clearToken } from '@/lib/token';

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => {
          if (error instanceof GitHubApiError && error.status === 401) {
            console.warn(
              '[auth] Token expired or revoked, redirecting to login.',
            );
            client.cancelQueries();
            client.clear();
            clearToken();
            // Full page reload resets all React state (including AuthContext),
            // preventing a split-brain where localStorage is cleared but
            // in-memory token state still holds the old value.
            window.location.href = '/?reason=session_expired';
          }
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: (failureCount, error) => {
            // Never retry on 401 -- token is invalid
            if (error instanceof GitHubApiError && error.status === 401) {
              return false;
            }
            return failureCount < 2;
          },
          refetchOnWindowFocus: true,
        },
        mutations: { retry: false },
      },
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RateLimitProvider>
        <AuthProvider>{children}</AuthProvider>
      </RateLimitProvider>
    </QueryClientProvider>
  );
}
