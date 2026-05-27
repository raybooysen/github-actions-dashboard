'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const CallbackContent = () => {
  const { handleCallback } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  // useRef guard prevents double invocation during React strict mode
  const hasCalledRef = useRef(false);

  const oauthError = searchParams.get('error');
  const oauthDescription = searchParams.get('error_description');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const paramError = oauthError
    ? (oauthDescription ?? oauthError)
    : !code
      ? 'No authorization code received.'
      : null;

  useEffect(() => {
    if (paramError || !code) return;

    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    // OAuth codes are single-use. Once attempted (success or failure), the same
    // code cannot be exchanged again, so we intentionally do NOT reset
    // hasCalledRef on error. The user can retry by clicking "Back to login"
    // to start a fresh OAuth flow.
    handleCallback(code, state)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch((err) => {
        setExchangeError(
          err instanceof Error ? err.message : 'Authentication failed.',
        );
      });
  }, [handleCallback, router, code, state, paramError]);

  const error = paramError ?? exchangeError;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p
            data-testid="callback-error"
            className="text-status-failure font-medium"
          >
            {error}
          </p>
          <Link
            data-testid="callback-back-link"
            href="/"
            className="text-sm text-ink-secondary hover:text-ink underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p
        data-testid="callback-loading"
        role="status"
        aria-live="polite"
        className="text-ink-secondary animate-pulse"
      >
        Connecting to GitHub...
      </p>
    </div>
  );
}

const CallbackPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-ink-secondary animate-pulse">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

export default CallbackPage;
