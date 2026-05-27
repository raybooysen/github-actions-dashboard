import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderWithProviders } from '../../test/test-utils';
import { useAuth } from './useAuth';

const CallbackConsumer = ({ code, state }: { code: string, state: string | null }) => {
  const { handleCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div data-testid="error">{error}</div>
      <button
        data-testid="callback"
        onClick={() =>
          handleCallback(code, state).catch((err) =>
            setError(err instanceof Error ? err.message : 'unknown'),
          )
        }
      >
        Exchange
      </button>
    </div>
  );
};

describe('useAuth state validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handleCallback throws when state does not match stored state', async () => {
    const user = userEvent.setup();
    localStorage.setItem('gh_auth_state', 'correct-state');

    renderWithProviders(<CallbackConsumer code="test-code" state="wrong-state" />);

    await user.click(screen.getByTestId('callback'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid OAuth state');
    });
  });

  it('handleCallback throws when no state is provided', async () => {
    const user = userEvent.setup();
    localStorage.setItem('gh_auth_state', 'some-state');

    renderWithProviders(<CallbackConsumer code="test-code" state={null} />);

    await user.click(screen.getByTestId('callback'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid OAuth state');
    });
  });
});
