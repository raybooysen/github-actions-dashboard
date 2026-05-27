// src/components/ErrorBoundary.tsx
import { Component, createRef, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
}

type ErrorBoundaryState = {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private fallbackRef = createRef<HTMLDivElement>();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    // Focus the fallback container for accessibility
    this.fallbackRef.current?.focus();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          ref={this.fallbackRef}
          role="alert"
          tabIndex={-1}
          data-testid="error-fallback"
          className="flex min-h-screen items-center justify-center"
        >
          <div className="text-center space-y-4 max-w-md px-4">
            <svg
              className="mx-auto h-12 w-12 text-status-failure"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <h2
              data-testid="error-fallback-heading"
              className="text-xl font-semibold text-ink"
            >
              Something went wrong
            </h2>
            <p className="text-sm text-ink-secondary">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              type="button"
              data-testid="error-fallback-reload"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-ink text-canvas px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-100 transition-transform duration-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-running"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
