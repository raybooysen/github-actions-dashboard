// src/hooks/useAuth.test.tsx
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw-server';
import { renderWithProviders } from '../../test/test-utils';
import { useAuth } from './useAuth';
import { setCacheEntry, cacheSize } from '@/lib/etag-cache';

// Helper component that exposes the auth context for testing
const TestConsumer = () => {
  const { token, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button data-testid="login" onClick={login}>Login</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
    </div>
  );
}

// Helper component that exercises handleCallback
const CallbackConsumer = ({ code }: { code: string }) => {
  const { token, handleCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="callback-error">{error ?? 'none'}</span>
      <button
        data-testid="callback"
        onClick={() =>
          handleCallback(code, "test-state").catch((err) =>
            setError(err instanceof Error ? err.message : 'unknown'),
          )
        }
      >
        Exchange
      </button>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws when used outside AuthProvider', () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    spy.mockRestore();
  });

  it('returns null token when localStorage is empty', () => {
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId('token')).toHaveTextContent('null');
  });

  it('returns initial token from localStorage', () => {
    localStorage.setItem('gh_actions_token', 'gho_existing_token');
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId('token')).toHaveTextContent('gho_existing_token');
  });

  it('clears token on logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('gh_actions_token', 'gho_existing_token');
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId('token')).toHaveTextContent('gho_existing_token');

    await user.click(screen.getByTestId('logout'));

    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(localStorage.getItem('gh_actions_token')).toBeNull();
  });

  it('redirects to GitHub OAuth on login', async () => {
    const user = userEvent.setup();
    vi.stubEnv('NEXT_PUBLIC_GITHUB_CLIENT_ID', 'test-client-id');

    // Save original location and replace with a writable mock
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '', origin: originalLocation.origin },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<TestConsumer />);

    await user.click(screen.getByTestId('login'));

    expect(window.location.href).toContain('github.com/login/oauth/authorize');
    expect(window.location.href).toContain('client_id=test-client-id');
    expect(window.location.href).toContain('scope=repo');

    // Restore
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it('handleCallback exchanges code for token and updates state', async () => {
    localStorage.setItem('gh_auth_state', 'test-state');
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/token', () => {
        return HttpResponse.json({ access_token: 'gho_new_token_456' });
      }),
    );

    renderWithProviders(<CallbackConsumer code="valid-code" />);

    expect(screen.getByTestId('token')).toHaveTextContent('null');

    await user.click(screen.getByTestId('callback'));

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('gho_new_token_456');
    });
    expect(localStorage.getItem('gh_actions_token')).toBe('gho_new_token_456');
  });

  it('handleCallback throws when the token exchange endpoint returns a non-ok response', async () => {
    localStorage.setItem('gh_auth_state', 'test-state');
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/token', () => {
        return HttpResponse.json(
          { error: 'The code passed is incorrect or expired.' },
          { status: 401 },
        );
      }),
    );

    renderWithProviders(<CallbackConsumer code="bad-code" />);

    await user.click(screen.getByTestId('callback'));

    await waitFor(() => {
      expect(screen.getByTestId('callback-error')).toHaveTextContent(
        'The code passed is incorrect or expired.',
      );
    });
    // Token should remain null -- not updated on failure
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(localStorage.getItem('gh_actions_token')).toBeNull();
  });

  it('handleCallback throws when the /api/auth/token network request fails', async () => {
    localStorage.setItem('gh_auth_state', 'test-state');
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/token', () => HttpResponse.error()),
    );

    renderWithProviders(<CallbackConsumer code="valid-code" />);

    await user.click(screen.getByTestId('callback'));

    // Loose assertion: a fetch-level network failure surfaces as a TypeError
    // whose message is browser/runtime-specific, so we only verify that some
    // error reached the UI rather than asserting on the message text.
    await waitFor(() => {
      expect(screen.getByTestId('callback-error')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(localStorage.getItem('gh_actions_token')).toBeNull();
  });

  it('handleCallback throws when the response body has no access_token', async () => {
    localStorage.setItem('gh_auth_state', 'test-state');
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/token', () => {
        return HttpResponse.json({});
      }),
    );

    renderWithProviders(<CallbackConsumer code="valid-code" />);

    await user.click(screen.getByTestId('callback'));

    await waitFor(() => {
      expect(screen.getByTestId('callback-error')).toHaveTextContent(
        'Token exchange returned no access_token',
      );
    });
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(localStorage.getItem('gh_actions_token')).toBeNull();
  });

  it('logout clears the TanStack Query cache and the ETag cache', async () => {
    const user = userEvent.setup();
    localStorage.setItem('gh_actions_token', 'gho_existing_token');
    const { queryClient } = renderWithProviders(<TestConsumer />);

    queryClient.setQueryData(['user'], { login: 'previous-user' });
    queryClient.setQueryData(['repos'], [{ id: 1, name: 'old-repo' }]);
    setCacheEntry(
      'https://api.github.com/user',
      '"etag-abc"',
      { login: 'previous-user' },
    );

    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThanOrEqual(1);
    expect(cacheSize()).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByTestId('logout'));

    expect(queryClient.getQueryCache().getAll().length).toBe(0);
    expect(cacheSize()).toBe(0);
    expect(localStorage.getItem('gh_actions_token')).toBeNull();
  });
});
