import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../../test/msw-server';

// We dynamically import the route so we can control env vars before import
const importRoute = async () => {
  // Clear module cache to pick up new env vars
  vi.resetModules();
  return await import('./route');
}

describe('POST /api/auth/token', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test-client-id');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-client-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const validBody = {
    code: 'valid-code-123',
    redirect_uri: 'http://localhost:3000/auth/callback',
  };

  it('returns 200 with access_token for a valid code', async () => {
    server.use(
      http.post('https://github.com/login/oauth/access_token', () => {
        return HttpResponse.json({
          access_token: 'gho_test_token_123',
          token_type: 'bearer',
          scope: 'repo',
        });
      }),
    );

    const { POST } = await importRoute();
    const request = new Request('http://localhost:3000/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.access_token).toBe('gho_test_token_123');
  });

  it('returns 400 when code is missing from request body', async () => {
    const { POST } = await importRoute();
    const request = new Request('http://localhost:3000/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uri: validBody.redirect_uri }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns 400 when redirect_uri is missing from request body', async () => {
    const { POST } = await importRoute();
    const request = new Request('http://localhost:3000/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validBody.code }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toMatch(/redirect_uri/);
  });

  it('returns 401 when GitHub rejects the code', async () => {
    server.use(
      http.post('https://github.com/login/oauth/access_token', () => {
        return HttpResponse.json({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        });
      }),
    );

    const { POST } = await importRoute();
    const request = new Request('http://localhost:3000/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, code: 'bad-code' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('returns 500 when environment variables are missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    vi.stubEnv('GITHUB_CLIENT_SECRET', '');

    const { POST } = await importRoute();
    const request = new Request('http://localhost:3000/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, code: 'some-code' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
