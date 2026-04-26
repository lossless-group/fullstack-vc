// Initiates the LinkedIn OAuth flow (OpenID Connect).

import type { APIRoute } from 'astro';

const STATE_COOKIE = 'fsvc_oauth_state_linkedin';
const SCOPES = 'openid profile email';

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID ?? import.meta.env.LINKEDIN_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('LINKEDIN_OAUTH_CLIENT_ID not configured.', { status: 500 });
  }

  const state = randomState();
  cookies.set(STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 600,
  });

  const callbackUrl = new URL('/api/auth/linkedin/callback', url.origin).toString();
  const authorize = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', callbackUrl);
  authorize.searchParams.set('scope', SCOPES);
  authorize.searchParams.set('state', state);

  return redirect(authorize.toString(), 302);
};
