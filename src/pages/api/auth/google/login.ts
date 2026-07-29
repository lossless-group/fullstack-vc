// Initiates the Google OAuth flow (OpenID Connect via Google).
//
// Workspace-domain-agnostic: accepts any verified Google email (personal
// Gmail OR Workspace org). The userinfo response includes an `hd` claim for
// Workspace users which we capture as firm-affiliation signal but do not
// enforce as a gate. See context-v/tasks/Wire-Google-Workspace-OAuth-Provider.md §3.

import type { APIRoute } from 'astro';

const STATE_COOKIE = 'fsvc_oauth_state_google';
// Standard OIDC scopes — sub, email, email_verified, name, picture, hd.
const SCOPES = 'openid email profile';

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? import.meta.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('GOOGLE_OAUTH_CLIENT_ID not configured.', { status: 500 });
  }

  const state = randomState();
  cookies.set(STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 600,
  });

  // Round-trip destination: /login?next=/some/page → cookie → callback redirect.
  // Relative paths only (no '//' or absolute URLs) to prevent open redirects.
  const next = url.searchParams.get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    cookies.set('fsvc_oauth_return_to', next, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 600,
    });
  }


  const callbackUrl = new URL('/api/auth/google/callback', url.origin).toString();
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', callbackUrl);
  authorize.searchParams.set('scope', SCOPES);
  authorize.searchParams.set('state', state);
  // Force the account chooser so users on shared machines don't get auto-
  // signed-in to the wrong identity. Cheap UX win.
  authorize.searchParams.set('prompt', 'select_account');
  // Standard OIDC. No need for offline access / refresh tokens at this layer
  // — we only need the one-shot identity exchange.
  authorize.searchParams.set('access_type', 'online');

  return redirect(authorize.toString(), 302);
};
