// GitHub OAuth callback. Exchanges the code for an access token, fetches the
// user's GitHub profile, checks them against the Kauffman roster, sets a
// signed session cookie, and redirects.
//
// All failure branches now redirect to /login?error=<code> with a friendly
// notice instead of returning a raw 400/502, and write an AuthEvent row so
// future investigations don't depend on luck. See
// context-v/issue-resolutions/Auth-Identity-System-Worked-but-UX-Failed-Silent-Bounces.md.

import type { APIRoute } from 'astro';
import { signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, type SessionPayload } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';
import { recordUserLogin } from '../../../../lib/user-record';
import { logAuthEvent } from '../../../../lib/auth-events';

const STATE_COOKIE = 'fsvc_oauth_state_github';

interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const stateCookie = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    // Most common cause: the user pressed the back button after a successful
    // login, replaying the one-shot callback URL after the state cookie was
    // already cleared. Surface a friendly notice instead of a raw 400.
    await logAuthEvent({
      provider: 'github',
      outcome: 'state_mismatch',
      note: `code=${code ? 'set' : 'missing'} state=${stateParam ? 'set' : 'missing'} cookie=${stateCookie ? 'set' : 'missing'}`,
    });
    return redirect('/login?error=stale_link', 302);
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? import.meta.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? import.meta.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    await logAuthEvent({ provider: 'github', outcome: 'missing_credentials' });
    return redirect('/login?error=server_misconfigured', 302);
  }

  // 1. Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: new URL('/api/auth/github/callback', url.origin).toString(),
    }),
  });
  if (!tokenRes.ok) {
    await logAuthEvent({
      provider: 'github',
      outcome: 'token_exchange_fail',
      note: `status=${tokenRes.status}`,
    });
    return redirect('/login?error=token_exchange', 302);
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    await logAuthEvent({
      provider: 'github',
      outcome: 'no_access_token',
      note: tokenJson.error ?? 'unknown',
    });
    return redirect('/login?error=token_exchange', 302);
  }

  // 2. Fetch the user's profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'fullstack-vc-auth',
    },
  });
  if (!userRes.ok) {
    await logAuthEvent({
      provider: 'github',
      outcome: 'user_fetch_fail',
      note: `status=${userRes.status}`,
    });
    return redirect('/login?error=user_fetch', 302);
  }
  const ghUser = await userRes.json() as GitHubUser;

  // 3. If the user doesn't expose a public email, ask the email endpoint for the primary verified one.
  let email: string | undefined = ghUser.email ?? undefined;
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'fullstack-vc-auth',
      },
    });
    if (emailRes.ok) {
      const emails = await emailRes.json() as GitHubEmail[];
      email = emails.find(e => e.primary && e.verified)?.email;
    }
  }

  // 4. Build the session payload
  const session: SessionPayload = {
    provider: 'github',
    subject: ghUser.login,
    email,
    name: ghUser.name ?? ghUser.login,
    avatar: ghUser.avatar_url,
  };

  // 5. Roster check — synthetic entry returned for non-roster users since the
  //    2026-04-29 launch (see oauth-roster.ts for the gate-removal note).
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return redirect(`/login/not-on-roster?provider=github&handle=${encodeURIComponent(ghUser.login)}`, 302);
  }

  // 6. Stamp the User row (best-effort).
  const recorded = await recordUserLogin(session, rosterEntry);
  if (!recorded.ok) {
    await logAuthEvent({
      provider: 'github',
      outcome: 'record_user_error',
      subject: ghUser.login,
      email,
      note: recorded.error,
    });
  }

  // 7. Sign the session cookie and redirect to the app
  const token = await signSession(session);
  cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await logAuthEvent({
    provider: 'github',
    outcome: 'success',
    subject: ghUser.login,
    email,
    user_id: recorded.writtenId ?? recorded.canonicalId,
  });

  // Honor a `next=` param from the original login link if present (e.g., the
  // edit page redirects unauthed users to /login?next=/people/foo/edit, and
  // we round-trip them back here on success). Otherwise default to the user's
  // own edit page.
  const next = url.searchParams.get('state-next'); // forwarded by /login if needed
  const dest = next && next.startsWith('/') && !next.startsWith('//')
    ? next
    : `/people/${ghUser.login}/stack/edit`;
  return redirect(dest, 302);
};
