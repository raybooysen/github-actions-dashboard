// src/lib/token.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, clearToken } from './token';

describe('token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setToken('ghp_test123');
    expect(getToken()).toBe('ghp_test123');
  });

  it('clears the stored token', () => {
    setToken('ghp_test123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('overwrites a previous token', () => {
    setToken('ghp_first');
    setToken('ghp_second');
    expect(getToken()).toBe('ghp_second');
  });
});
