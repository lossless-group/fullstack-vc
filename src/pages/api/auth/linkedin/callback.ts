// LinkedIn OIDC callback. Exchanges the code for a token, fetches userinfo,
// matches against the roster, sets the session cookie, redirects.
//
// All failure branches now redirect to /login?error=<code> with a friendly
// notice instead of returning a raw 400/502, and write an AuthEvent row. See
// context-v/issue-resolutions/Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces.md.

import type { APIRoute } from 'astro';
import { signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, type SessionPayload } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';
import { recordUserLogin } from '../../../../lib/user-record';
import { logAuthEvent } from '../../../../lib/auth-events';

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
    await logAuthEvent({
      provider: 'linkedin',
      outcome: 'state_mismatch',
      note: `code=${code ? 'set' : 'missing'} state=${stateParam ? 'set' : 'missing'} cookie=${stateCookie ? 'set' : 'missing'}`,
    });
    return redirect('/login?error=stale_link', 302);
  }

  const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID ?? import.meta.env.LINKEDIN_OAUTH_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_OAUTH_CLIENT_SECRET ?? import.meta.env.LINKEDIN_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    await logAuthEvent({ provider: 'linkedin', outcome: 'missing_credentials' });
    return redirect('/login?error=server_misconfigured', 302);
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
    await logAuthEvent({
      provider: 'linkedin',
      outcome: 'token_exchange_fail',
      note: `status=${tokenRes.status}`,
    });
    return redirect('/login?error=token_exchange', 302);
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    await logAuthEvent({
      provider: 'linkedin',
      outcome: 'no_access_token',
      note: tokenJson.error ?? 'unknown',
    });
    return redirect('/login?error=token_exchange', 302);
  }

  // 2. Fetch userinfo (OIDC standard endpoint)
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    await logAuthEvent({
      provider: 'linkedin',
      outcome: 'user_fetch_fail',
      note: `status=${userRes.status}`,
    });
    return redirect('/login?error=user_fetch', 302);
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

  // 5. Stamp the User row (best-effort).
  const recorded = await recordUserLogin(session, rosterEntry);
  if (!recorded.ok) {
    await logAuthEvent({
      provider: 'linkedin',
      outcome: 'record_user_error',
      subject: liUser.sub,
      email: liUser.email,
      note: recorded.error,
    });
  }

  // 6. Sign + set cookie + redirect.
  const token = await signSession(session);
  cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await logAuthEvent({
    provider: 'linkedin',
    outcome: 'success',
    subject: liUser.sub,
    email: liUser.email,
    user_id: recorded.writtenId ?? recorded.canonicalId,
  });

  // /me is the new provider-aware landing — it inspects the User row and
  // routes dual-provider users to the right edit page rather than dumping
  // LinkedIn-only users on the public people index.
  return redirect('/me', 302);
};
