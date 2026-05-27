// src/components/JobList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { JobList } from './JobList';
import { fetchJobs } from '@/lib/github-client';
import { renderWithProviders } from '../../test/test-utils';
import React from 'react';

// Mock github-client
vi.mock('@/lib/github-client', () => ({
  fetchJobs: vi.fn(),
  setRateLimitCallback: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token' }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('JobList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(fetchJobs).mockReturnValue(new Promise(() => {})); // Never resolves
    const { container } = renderWithProviders(<JobList owner="user" repo="repo" runId={1} />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message when fetch fails', async () => {
    vi.mocked(fetchJobs).mockRejectedValue(new Error('API error'));
    renderWithProviders(<JobList owner="user" repo="repo" runId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
    });
  });

  it('renders job list and summary on success', async () => {
    const mockJobs = {
      total_count: 2,
      jobs: [
        {
          id: 101,
          name: 'build',
          status: 'completed',
          conclusion: 'success',
          started_at: '2026-04-18T10:00:00Z',
          completed_at: '2026-04-18T10:05:00Z',
          html_url: 'https://github.com/job/101',
          steps: [],
        },
        {
          id: 102,
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          started_at: '2026-04-18T10:05:00Z',
          completed_at: null,
          html_url: 'https://github.com/job/102',
          steps: [],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchJobs).mockResolvedValue(mockJobs as any);
    renderWithProviders(<JobList owner="user" repo="repo" runId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/2 jobs:/)).toBeInTheDocument();
      expect(screen.getByText('build')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    const buildLink = screen.getByTitle(/View job "build"/);
    expect(buildLink).toHaveAttribute('href', 'https://github.com/job/101');
    
    // Check duration for completed job
    expect(screen.getByText('5m 0s')).toBeInTheDocument();
  });
});
