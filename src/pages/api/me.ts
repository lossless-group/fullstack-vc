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
import { db, User, Stack, eq, and } from 'astro:db';
import { getCollection } from 'astro:content';
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
  let providers = { github: false, linkedin: false, google: false };
  let row: typeof User.$inferSelect | undefined;
  try {
    if (session.provider === 'github') {
      row = await db.select().from(User).where(eq(User.github_handle, session.subject)).get();
    } else if (session.provider === 'linkedin') {
      row = await db.select().from(User).where(eq(User.linkedin_sub, session.subject)).get();
    } else if (session.provider === 'google') {
      row = await db.select().from(User).where(eq(User.google_sub, session.subject)).get();
    }
    if (row) {
      providers = {
        github: !!row.github_handle,
        linkedin: !!row.linkedin_sub,
        google: !!row.google_sub,
      };
    } else {
      providers[session.provider] = true;
    }
  } catch {
    providers[session.provider] = true;
  }

  // With three providers, the tri-state header indicator now means:
  //   in      = 3/3 connected (fully triangulated, green dot)
  //   partial = 1/3 or 2/3 connected (yellow dot, count surfaced in tooltip)
  //   out     = 0/3 (red dot, "Log in")
  // See context-v/tasks/Wire-Google-Workspace-OAuth-Provider.md §7.
  const linkedCount = Number(providers.github) + Number(providers.linkedin) + Number(providers.google);
  const allLinked = linkedCount === 3;

  // Stack counts — pulled from Turso (authoritative) so the header tooltip
  // reflects unsynced edits immediately. Falls back to markdown if Turso
  // is unreachable (DB hiccup, table not pushed) so the count is never
  // stale-vs-broken.
  let handle: string | null = null;
  let stackCounts: { current: number; aspirational: number; abandoned: number } | null = null;
  const githubHandle = row?.github_handle ?? (session.provider === 'github' ? session.subject : null);
  if (githubHandle) {
    try {
      const stackRows = await db.select().from(Stack).where(eq(Stack.handle, githubHandle)).all();
      // Even if there are 0 rows we still set handle so the editor link
      // surfaces — "Your stack: 0 active · 0 aspiring · 0 moved on · Edit →"
      // is a useful first-time-user nudge, not a broken state.
      handle = githubHandle;
      stackCounts = {
        current:      stackRows.filter(r => r.bucket === 'current').length,
        aspirational: stackRows.filter(r => r.bucket === 'aspirational').length,
        abandoned:    stackRows.filter(r => r.bucket === 'abandoned').length,
      };
    } catch {
      // Turso unavailable — fall back to markdown.
      try {
        const participants = await getCollection('participants');
        const participant = participants.find(p => p.data.handle === githubHandle);
        if (participant) {
          handle = githubHandle;
          stackCounts = {
            current: participant.data.current_stack?.length ?? 0,
            aspirational: participant.data.aspirational_stack?.length ?? 0,
            abandoned: participant.data.abandoned_stack?.length ?? 0,
          };
        }
      } catch {
        // Both sources unavailable — leave handle/stackCounts null. The
        // header CTA will stay hidden.
      }
    }
  }

  return new Response(JSON.stringify({
    loggedIn: true,
    name: session.name ?? null,
    avatar: session.avatar ?? null,
    provider: session.provider,
    providers,
    linkedCount,
    allLinked,
    handle,
    stackCounts,
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
