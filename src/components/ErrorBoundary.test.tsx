// src/components/ErrorBoundary.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

const GoodChild = () => {
  return <div data-testid="good-child">Everything is fine</div>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BadChild = (): any => {
  throw new Error('Boom!');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('good-child')).toBeVisible();
    expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
  });

  it('renders fallback UI with role="alert" when a child throws', () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-fallback')).toBeVisible();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('error-fallback-heading')).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.getByTestId('error-fallback-reload')).toBeVisible();
    expect(screen.getByTestId('error-fallback-reload').tagName).toBe('BUTTON');

    spy.mockRestore();
  });

  it('calls window.location.reload when reload button is clicked', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    await user.click(screen.getByTestId('error-fallback-reload'));
    expect(reloadMock).toHaveBeenCalled();

    spy.mockRestore();
  });
});
