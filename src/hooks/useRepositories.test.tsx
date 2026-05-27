import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRepositories } from './useRepositories';
import { createTestQueryClient } from '../../test/test-utils';
import { mockRepos } from '../../test/fixtures';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
  return Wrapper;
}

describe('useRepositories', () => {
  it('does not fetch when token is null', async () => {
    const { result } = renderHook(() => useRepositories(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches repositories when token is provided', async () => {
    const { result } = renderHook(() => useRepositories('gho_test_token'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRepos);
  });
});
