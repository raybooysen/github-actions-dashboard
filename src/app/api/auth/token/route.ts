import { exchangeCodeForToken } from '@/lib/github-client';
import { validateEnv } from '@/lib/env';

export const POST = async (request: Request): Promise<Response> => {
  try {
    validateEnv();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Configuration error.' },
      { status: 500 },
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

  let body: { code?: string; redirect_uri?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const { code, redirect_uri: redirectUri } = body;
  if (!code || typeof code !== 'string') {
    return Response.json(
      { error: 'Missing required parameter: code.' },
      { status: 400 },
    );
  }
  if (!redirectUri || typeof redirectUri !== 'string') {
    return Response.json(
      { error: 'Missing required parameter: redirect_uri.' },
      { status: 400 },
    );
  }

  try {
    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
    return Response.json({ access_token: accessToken });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token exchange failed.';
    return Response.json({ error: message }, { status: 401 });
  }
};
