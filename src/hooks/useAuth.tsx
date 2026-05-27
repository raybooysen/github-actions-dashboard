// src/hooks/useAuth.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, setToken, clearToken } from '@/lib/token';
import { clearEtagCache } from '@/lib/etag-cache';
import { validatePublicEnv } from '@/lib/env';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  handleCallback: (code: string, state: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  // Initialize as null on both server and client to avoid hydration mismatch.
  // Hydrate from localStorage after mount via useEffect.
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      validatePublicEnv();
    } catch (err) {
      // Surface misconfig loudly in the console (dev visibility) but still
      // hydrate any existing token so a previously-authenticated session
      // continues working. login() guards against the missing env so a
      // fresh sign-in fails clearly rather than redirecting to GitHub with
      // client_id=undefined.
      console.error(
        'validatePublicEnv failed:',
        err instanceof Error ? err.message : err,
      );
    }
    // Reading from localStorage is an unavoidable mount-time effect; the
    // rule fires here because the new state derives from an external read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenState(getToken());
    // setIsLoading(false) is a constant transition, not derived from an
    // external read, so the rule does not flag it.
    setIsLoading(false);
  }, []);

  const login = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      // Fail loudly rather than redirecting to GitHub with client_id=undefined,
      // which produces an opaque GitHub error and confuses the user.
      throw new Error(
        'NEXT_PUBLIC_GITHUB_CLIENT_ID is not configured; cannot start OAuth flow.',
      );
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    localStorage.setItem('gh_auth_state', state);

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }, []);

  const logout = useCallback(() => {
    // Clear in-memory caches before React state so subscribers that re-render
    // when the token flips to null don't refetch with stale per-user data.
    queryClient.clear();
    clearEtagCache();
    clearToken();
    setTokenState(null);
  }, [queryClient]);

  const handleCallback = useCallback(async (code: string, state: string | null) => {
    const storedState = localStorage.getItem('gh_auth_state');
    localStorage.removeItem('gh_auth_state');

    if (!state || state !== storedState) {
      throw new Error('Invalid OAuth state. CSRF protection triggered.');
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Token exchange failed');
    }

    const data = await response.json();
    if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
      throw new Error('Token exchange returned no access_token');
    }
    setToken(data.access_token);
    setTokenState(data.access_token);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, isLoading, login, logout, handleCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
