// Clears the session cookie. Accepts both POST (preferred, used by forms) and GET
// (so a header link can log the user out without a form ceremony).

import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, CLEAR_COOKIE_OPTIONS } from '../../../lib/session';

const handler: APIRoute = ({ cookies, redirect }) => {
  cookies.set(SESSION_COOKIE_NAME, '', CLEAR_COOKIE_OPTIONS);
  return redirect('/', 302);
};

export const GET = handler;
export const POST = handler;
