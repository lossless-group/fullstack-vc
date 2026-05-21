// Google OIDC callback. Exchanges the code for tokens, fetches userinfo,
// matches against the roster, sets the session cookie, redirects.
//
// All failure branches redirect to /login?error=<code> with a friendly
// notice instead of returning a raw 400/502, and write an AuthEvent row. See
// context-v/issue-resolutions/Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces.md.
//
// Email verification: Google sets `email_verified: true` on virtually every
// real-account response. If it's ever false we refuse to mint a session — an
// unverified email defeats the integrity contract that drives cross-provider
// linking (see lib/user-record.ts: emails as the canonical merge key).

import type { APIRoute } from 'astro';
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, type SessionPayload } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';
import { recordUserLogin, linkProviderToExistingUser } from '../../../../lib/user-record';
import { logAuthEvent } from '../../../../lib/auth-events';

const STATE_COOKIE = 'fsvc_oauth_state_google';

interface GoogleUserInfo {
  // Standard OIDC claims.
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  // Google-specific: hosted-domain claim for Workspace users (e.g. "lossless.group").
  // Missing for personal @gmail.com accounts. Captured as firm-affiliation signal
  // but never used as a gate.
  hd?: string;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const stateCookie = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'state_mismatch',
      note: `code=${code ? 'set' : 'missing'} state=${stateParam ? 'set' : 'missing'} cookie=${stateCookie ? 'set' : 'missing'}`,
    });
    return redirect('/login?error=stale_link', 302);
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? import.meta.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? import.meta.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    await logAuthEvent({ provider: 'google', outcome: 'missing_credentials' });
    return redirect('/login?error=server_misconfigured', 302);
  }

  // 1. Exchange code for access token.
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: new URL('/api/auth/google/callback', url.origin).toString(),
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });
  if (!tokenRes.ok) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'token_exchange_fail',
      note: `status=${tokenRes.status}`,
    });
    return redirect('/login?error=token_exchange', 302);
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string; error_description?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'no_access_token',
      note: tokenJson.error ?? 'unknown',
    });
    return redirect('/login?error=token_exchange', 302);
  }

  // 2. Fetch userinfo. Could decode the id_token instead, but the userinfo
  // endpoint is simpler and gives us the same claims without a JWT verify step.
  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'user_fetch_fail',
      note: `status=${userRes.status}`,
    });
    return redirect('/login?error=user_fetch', 302);
  }
  const gUser = await userRes.json() as GoogleUserInfo;

  // 3. Email-verification guard. Google sets this true for nearly every real
  // account; an explicit false means we should not trust the email as an
  // identity key, which breaks the canonical-id resolver's merge guarantees.
  if (gUser.email_verified === false) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'email_unverified',
      subject: gUser.sub,
      email: gUser.email,
    });
    return redirect('/login?error=user_fetch', 302);
  }

  // 4. Build the session payload.
  const session: SessionPayload = {
    provider: 'google',
    subject: gUser.sub,
    email: gUser.email,
    name: gUser.name ?? [gUser.given_name, gUser.family_name].filter(Boolean).join(' '),
    avatar: gUser.picture,
  };

  // 5. Roster check (passthrough — synthesizes an entry if no match, per
  // matchesRoster's no-longer-a-gate posture).
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return redirect(`/login/not-on-roster?provider=google&email=${encodeURIComponent(session.email ?? '')}`, 302);
  }

  // 6. "Link while logged in" — if another provider already has a valid
  // session, attach Google to that existing User row instead of creating a
  // separate identity. Falls through to recordUserLogin's normal lookup chain
  // (which has its own merge fallbacks) when there's no existing session or
  // the link attempt couldn't find the row.
  const existingSession = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  let recorded;
  if (existingSession && existingSession.provider !== 'google') {
    recorded = await linkProviderToExistingUser(existingSession, session);
    if (recorded.ok) {
      await logAuthEvent({
        provider: 'google',
        outcome: 'provider_linked',
        subject: gUser.sub,
        email: gUser.email,
        user_id: recorded.writtenId ?? undefined,
        note: `linked onto existing ${existingSession.provider} session`,
      });
    } else {
      // Link attempt failed (no row, DB hiccup) — fall through to standard upsert.
      recorded = await recordUserLogin(session, rosterEntry);
    }
  } else {
    recorded = await recordUserLogin(session, rosterEntry);
  }

  if (!recorded.ok) {
    await logAuthEvent({
      provider: 'google',
      outcome: 'record_user_error',
      subject: gUser.sub,
      email: gUser.email,
      note: recorded.error,
    });
  }

  // 7. Sign + set cookie + redirect.
  const token = await signSession(session);
  cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await logAuthEvent({
    provider: 'google',
    outcome: 'success',
    subject: gUser.sub,
    email: gUser.email,
    user_id: recorded.writtenId ?? recorded.canonicalId,
  });

  // /me is the provider-aware landing — routes the user based on which
  // providers the row has linked, not just the active cookie.
  return redirect('/me', 302);
};
