// GitHub OAuth callback. Exchanges the code for an access token, fetches the
// user's GitHub profile, checks them against the Kauffman roster, sets a
// signed session cookie, and redirects.

import type { APIRoute } from 'astro';
import { signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, type SessionPayload } from '../../../../lib/session';
import { matchesRoster } from '../../../../lib/oauth-roster';

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
    return new Response('OAuth state mismatch — please try logging in again.', { status: 400 });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? import.meta.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? import.meta.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('GitHub OAuth client credentials not configured.', { status: 500 });
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
    return new Response(`GitHub token exchange failed (${tokenRes.status}).`, { status: 502 });
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return new Response(`GitHub token exchange returned no access_token: ${tokenJson.error ?? 'unknown'}`, { status: 502 });
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
    return new Response(`GitHub /user fetch failed (${userRes.status}).`, { status: 502 });
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

  // 5. Roster check — if not on the allowlist, bounce to a friendly page
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return redirect(`/login/not-on-roster?provider=github&handle=${encodeURIComponent(ghUser.login)}`, 302);
  }

  // 6. Sign the session cookie and redirect to the app
  const token = await signSession(session);
  cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

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
