// LinkedIn OIDC callback. Exchanges the code for a token, fetches userinfo,
// matches against the roster, sets the session cookie, redirects.

import type { APIRoute } from 'astro';
import { signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, type SessionPayload } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';

const STATE_COOKIE = 'fsvc_oauth_state_linkedin';

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: string;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const stateCookie = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    return new Response('OAuth state mismatch — please try logging in again.', { status: 400 });
  }

  const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID ?? import.meta.env.LINKEDIN_OAUTH_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_OAUTH_CLIENT_SECRET ?? import.meta.env.LINKEDIN_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('LinkedIn OAuth client credentials not configured.', { status: 500 });
  }

  // 1. Exchange code for access token (LinkedIn requires application/x-www-form-urlencoded)
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: new URL('/api/auth/linkedin/callback', url.origin).toString(),
  });

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });
  if (!tokenRes.ok) {
    return new Response(`LinkedIn token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`, { status: 502 });
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return new Response(`LinkedIn token exchange returned no access_token: ${tokenJson.error ?? 'unknown'}`, { status: 502 });
  }

  // 2. Fetch userinfo (OIDC standard endpoint)
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    return new Response(`LinkedIn userinfo fetch failed (${userRes.status}).`, { status: 502 });
  }
  const liUser = await userRes.json() as LinkedInUserInfo;

  // 3. Build the session payload
  const session: SessionPayload = {
    provider: 'linkedin',
    subject: liUser.sub,
    email: liUser.email,
    name: liUser.name ?? [liUser.given_name, liUser.family_name].filter(Boolean).join(' '),
    avatar: liUser.picture,
  };

  // 4. Roster check
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return redirect(`/login/not-on-roster?provider=linkedin&email=${encodeURIComponent(session.email ?? '')}`, 302);
  }

  // 5. Sign + set cookie + redirect
  const token = await signSession(session);
  cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  return redirect('/stack/me', 302);
};
