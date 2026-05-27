// src/app/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const GitHubIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

/* Inline SVG icons for feature list */
const PaneIcon = () => {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-ink-muted shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="16" height="14" rx="2" />
      <line x1="10" y1="3" x2="10" y2="17" />
      <line x1="2" y1="10" x2="10" y2="10" />
    </svg>
  );
}

const PollIcon = () => {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-ink-muted shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 10a7 7 0 1 1 7 7" />
      <polyline points="10 6 10 10 13 12" />
      <polyline points="3 10 1 12" />
      <polyline points="3 10 5 12" />
    </svg>
  );
}

const ShieldIcon = ({ className }: { className?: string }) => {
  return (
    <svg aria-hidden="true" className={className ?? "h-4 w-4 text-ink-muted shrink-0"} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2 L3 5 L3 10 C3 14 6 17 10 18 C14 17 17 14 17 10 L17 5 Z" />
      <polyline points="7 10 9 12 13 8" />
    </svg>
  );
}

const BoltIcon = () => {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-ink-muted shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="11 1 4 11 10 11 9 19 16 9 10 9" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: PaneIcon,
    title: 'Unified dashboard',
    description:
      'All your repositories and workflow runs in a single view. No more tab switching.',
  },
  {
    icon: PollIcon,
    title: 'Smart polling',
    description:
      'Refresh intervals adapt to activity — active runs poll faster, idle repos poll less.',
  },
  {
    icon: ShieldIcon,
    title: 'Privacy first',
    description:
      'Your GitHub token never leaves your browser. No server-side storage, no data collection.',
  },
  {
    icon: BoltIcon,
    title: 'Live status updates',
    description:
      'Watch workflow runs go from queued to running to complete in real time.',
  },
];



const DashboardPreview = () => {
  return (
    <div
      className="rounded-xl border border-edge bg-ink/[0.02] shadow-[0_20px_50px_-12px_rgba(24,24,27,0.15)] overflow-hidden select-none"
      aria-hidden="true"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-auto block"
      >
        <source src="/dashboard-demo.webm" type="video/webm" />
        <source src="/dashboard-demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

const LandingPageContent = () => {
  const { token, isLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'session_expired';

  useEffect(() => {
    if (!isLoading && token) {
      router.replace('/dashboard');
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (token) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-canvas overflow-hidden">
    <main
      data-testid="landing-page"
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto max-w-7xl px-6 py-6 md:py-10 lg:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 items-center">
          {/* Left column -- text content */}
          <div>
            <h1
              data-testid="landing-title"
              className="text-4xl md:text-5xl tracking-tighter leading-[1.1] font-bold text-ink"
            >
              Monitor every GitHub Actions workflow in one place.
            </h1>

            <p className="mt-3 text-xl md:text-2xl tracking-tight font-medium text-ink-muted">
              Real-time CI/CD visibility across all your repos.
            </p>

            <p className="mt-5 text-base text-ink-secondary leading-relaxed max-w-[55ch]">
              GitHub Actions spreads workflow runs across dozens of
              repositories. Checking deployment status means juggling browser
              tabs and clicking through repo after repo. This dashboard gives
              you a single, real-time view of every workflow run — so you
              always know what&apos;s passing, failing, or still in progress.
            </p>

            {sessionExpired && (
              <div
                role="alert"
                data-testid="session-expired-message"
                className="mt-5 flex items-center gap-2 rounded-lg border border-status-queued/30 bg-status-queued/10 px-3 py-2 text-sm text-ink"
              >
                <svg aria-hidden="true" className="h-4 w-4 text-status-queued shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .553.894l2 1a1 1 0 1 0 .894-1.788L11 9.382V6Z" clipRule="evenodd" />
                </svg>
                Your session has expired. Please reconnect.
              </div>
            )}

            {/* Feature list — clean, no cards */}
            <div className="mt-10 space-y-3">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-center gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <f.icon />
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{f.title}</span>
                    <span className="text-ink-secondary"> &mdash; {f.description}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* CTA area */}
            <div className="mt-10">
              <button
                data-testid="landing-connect-button"
                onClick={login}
                className="inline-flex items-center gap-2.5 rounded-xl bg-ink text-white px-7 py-3.5 text-base font-semibold shadow-sm transition-all duration-150 cursor-pointer hover:shadow-md active:scale-[0.98] active:-translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <GitHubIcon className="h-5 w-5" />
                Connect with GitHub
              </button>

              <div className="mt-5 flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-ink-muted shrink-0" />
                <p className="text-sm text-ink-secondary">
                  Your GitHub token stays in your browser. We never store
                  data on our servers or access your source code.
                </p>
              </div>
            </div>

            <p
              data-testid="landing-scope-disclosure"
              className="mt-6 text-xs text-ink-muted"
            >
              Requires the{' '}
              <code className="font-mono text-xs">repo</code> scope to read
              workflow runs from private repositories.
            </p>
          </div>

          {/* Right column -- dashboard preview */}
          <div>
            <DashboardPreview />
          </div>
        </div>
      </div>
    </main>

      <footer className='border-t border-edge'>
        <div className='mx-auto max-w-7xl px-6 py-6 text-center text-sm text-ink-muted'>
          Questions or feedback?{' '}
          <a
            href='mailto:raybooysen@gmail.com'
            className='text-ink-secondary underline underline-offset-2 hover:text-ink'
          >
            Contact us
          </a>
        </div>
      </footer>
    </div>
  );
}

const LandingPage = () => {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}

export default LandingPage;
