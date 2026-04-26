// Initiates the GitHub OAuth flow. Redirects the user to github.com/login/oauth/authorize
// with the configured client ID, requested scopes, and a state parameter (CSRF guard).

import type { APIRoute } from 'astro';

const STATE_COOKIE = 'fsvc_oauth_state_github';
const SCOPES = 'read:user user:email';

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? import.meta.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('GITHUB_OAUTH_CLIENT_ID not configured.', { status: 500 });
  }

  const state = randomState();
  cookies.set(STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 600, // 10 minutes is plenty for an OAuth round-trip
  });

  const callbackUrl = new URL('/api/auth/github/callback', url.origin).toString();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', callbackUrl);
  authorize.searchParams.set('scope', SCOPES);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');

  return redirect(authorize.toString(), 302);
};
