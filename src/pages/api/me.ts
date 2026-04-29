// /api/me — tiny "who am I?" endpoint for the header login indicator.
//
// Returns the public bits of the current session so the client-side header
// script can swap "Log in" for the avatar + green-dot indicator on prerendered
// pages (where the server can't know the cookie at build time).
//
// Returns 200 + { loggedIn: false } when there's no session — never 401, so
// the header script can use a single response shape.

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE_NAME } from '../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  const body = session
    ? {
        loggedIn: true,
        name: session.name ?? null,
        avatar: session.avatar ?? null,
        provider: session.provider,
      }
    : { loggedIn: false };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      // Don't cache — the response is per-user. Browser cache on a shared
      // edge would leak a user's session shape to other visitors.
      'cache-control': 'private, no-store',
    },
  });
};
