// /api/me — tiny "who am I?" endpoint for the header login indicator.
//
// Returns the public bits of the current session so the client-side header
// script can swap "Log in" for the avatar + status-dot indicator on
// prerendered pages (where the server can't know the cookie at build time).
//
// Also reports which OAuth providers the User row has linked, so the
// indicator can show a *partial* state (yellow) when only one provider is
// connected and nudge the user to add the other.
//
// Returns 200 + { loggedIn: false } when there's no session — never 401, so
// the header script can use a single response shape.

import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { verifySession, SESSION_COOKIE_NAME } from '../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return new Response(JSON.stringify({ loggedIn: false }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    });
  }

  // Look up the User row to discover which providers are linked. Best-effort:
  // if the row doesn't exist (first login on freshly-deployed Turso) or the
  // table isn't pushed, fall back to "only the active provider is linked."
  let providers = { github: false, linkedin: false };
  try {
    const row = session.provider === 'github'
      ? await db.select().from(User).where(eq(User.github_handle, session.subject)).get()
      : await db.select().from(User).where(eq(User.linkedin_sub, session.subject)).get();
    if (row) {
      providers = {
        github: !!row.github_handle,
        linkedin: !!row.linkedin_sub,
      };
    } else {
      providers[session.provider] = true;
    }
  } catch {
    providers[session.provider] = true;
  }

  const linkedCount = Number(providers.github) + Number(providers.linkedin);
  const allLinked = linkedCount === 2;

  return new Response(JSON.stringify({
    loggedIn: true,
    name: session.name ?? null,
    avatar: session.avatar ?? null,
    provider: session.provider,
    providers,
    allLinked,
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      // Don't cache — the response is per-user. Browser cache on a shared
      // edge would leak a user's session shape to other visitors.
      'cache-control': 'private, no-store',
    },
  });
};
