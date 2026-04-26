// ============================================================================
// session.ts — JWT signing/verification for the OAuth session cookie.
// Uses `jose` (audited, MIT, ~30KB, zero deps).
//
// Sessions live in an HttpOnly, Secure, SameSite=Lax cookie. No server-side
// session store. Sessions expire after 30 days of inactivity.
// ============================================================================

import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'fsvc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ISSUER = 'fullstack-vc';
const AUDIENCE = 'fullstack-vc-stack';

export interface SessionPayload {
  /** Which OAuth provider issued this identity. */
  provider: 'github' | 'linkedin';
  /** Provider-specific stable subject — GitHub username, or LinkedIn `sub` claim. */
  subject: string;
  /** Email if the provider returned one. */
  email?: string;
  /** Display name if the provider returned one. */
  name?: string;
  /** Avatar URL if the provider returned one. */
  avatar?: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SIGNING_SECRET ?? import.meta.env.JWT_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SIGNING_SECRET is not set or is too short (need 32+ chars). ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session payload into a compact JWS suitable for a cookie value. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verify and decode a session token. Returns null on any failure. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.provider !== 'string' || typeof payload.subject !== 'string') {
      return null;
    }
    return {
      provider: payload.provider as SessionPayload['provider'],
      subject: payload.subject,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      avatar: typeof payload.avatar === 'string' ? payload.avatar : undefined,
    };
  } catch {
    return null;
  }
}

/** Cookie attributes for a fresh session. */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: import.meta.env.PROD,
  maxAge: SESSION_TTL_SECONDS,
};

/** Cookie attributes for clearing the session. */
export const CLEAR_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: import.meta.env.PROD,
  maxAge: 0,
};
