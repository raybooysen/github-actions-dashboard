// test/test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { RateLimitProvider } from '@/contexts/RateLimitContext';
import { AuthProvider } from '@/hooks/useAuth';

export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RateLimitProvider>
            {children}
          </RateLimitProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
};
