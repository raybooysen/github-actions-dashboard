// src/lib/env.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv, validatePublicEnv } from './env';

describe('env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('throws if GITHUB_CLIENT_ID is missing', () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GITHUB_CLIENT_SECRET = 'secret';
      
      expect(() => validateEnv()).toThrow(/Missing required environment variables: GITHUB_CLIENT_ID/);
    });

    it('throws if GITHUB_CLIENT_SECRET is missing', () => {
      process.env.GITHUB_CLIENT_ID = 'id';
      delete process.env.GITHUB_CLIENT_SECRET;
      
      expect(() => validateEnv()).toThrow(/Missing required environment variables: GITHUB_CLIENT_SECRET/);
    });

    it('throws listing all missing variables when both are absent', () => {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      expect(() => validateEnv()).toThrow(/GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET/);
    });

    it('does not throw if all required variables are present', () => {
      process.env.GITHUB_CLIENT_ID = 'id';
      process.env.GITHUB_CLIENT_SECRET = 'secret';

      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe('validatePublicEnv', () => {
    it('throws if NEXT_PUBLIC_GITHUB_CLIENT_ID is missing', () => {
      delete process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

      expect(() => validatePublicEnv()).toThrow(/NEXT_PUBLIC_GITHUB_CLIENT_ID/);
    });

    it('does not throw if variable is present', () => {
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'id';

      expect(() => validatePublicEnv()).not.toThrow();
    });
  });
});
