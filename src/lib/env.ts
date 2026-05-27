// src/lib/env.ts

/**
 * Validates that all required environment variables are set.
 * Throws an error if any are missing.
 */
export const validateEnv = () => {
  const required = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }
};

/**
 * Public environment variables validation (client-side).
 * Uses direct access because Next.js only inlines NEXT_PUBLIC_* vars
 * when accessed with the full literal string — dynamic process.env[key]
 * won't be replaced at build time.
 */
export const validatePublicEnv = () => {
  if (!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID) {
    throw new Error(
      'Missing required public environment variable: NEXT_PUBLIC_GITHUB_CLIENT_ID. ' +
      'Please check your .env file.',
    );
  }
};
