// ============================================================================
// github-commit.ts — write to the GitHub repo from a Vercel server function.
//
// Auth: GitHub App installation token. App ID + private key → JWT → exchange
// for a 1-hour installation token → REST API.
//
// Why App-auth: clean bot identity in `git log` ("fullstack-vc-stacks[bot]"),
// scoped permissions revocable by uninstalling the App, and the Client ID/
// Secret on the App are unused (we never run user-OAuth through this App;
// user identity comes from the separate OAuth App).
//
// Env vars (all read from process.env or import.meta.env):
//   GITHUB_STACKS_APP_ID            — numeric App ID
//   GITHUB_STACKS_INSTALLATION_ID   — numeric, from the install URL
//   GITHUB_STACKS_PRIVATE_KEY       — PEM string (BEGIN/END lines included)
//   GITHUB_REPO_OWNER               — defaults to GITHUB_CONTENT_OWNER, then 'lossless-group'
//   GITHUB_REPO_NAME                — defaults to GITHUB_THIS_SITE_REPO, then 'fullstack-vc'
//   GITHUB_TARGET_BRANCH            — defaults to GITHUB_CONTENT_BRANCH, then 'main'.
//                                     Override to e.g. 'stack-update-test' during
//                                     dev to keep commits off main while testing.
//
// Fallback: if a `GITHUB_BOT_TOKEN` (or `GITHUB_CONTENT_PAT`) is set and the
// App credentials are not, we fall back to PAT auth. Either path works.
// ============================================================================

import { SignJWT } from 'jose';
import { createPrivateKey } from 'node:crypto';

// Astro's loadEnv (in astro.config.mjs) copies .env values into process.env at
// startup, so we read everything from process.env. We read them LAZILY (every
// call) rather than at module load, so that hot-reload during dev picks up
// .env changes without needing a hard restart.
function repoOwner() {
  return (
    process.env.GITHUB_REPO_OWNER ??
    process.env.GITHUB_CONTENT_OWNER ??
    'lossless-group'
  );
}
function repoName() {
  return (
    process.env.GITHUB_REPO_NAME ??
    process.env.GITHUB_THIS_SITE_REPO ??
    'fullstack-vc'
  );
}
function targetBranch() {
  return (
    process.env.GITHUB_TARGET_BRANCH ??
    process.env.GITHUB_CONTENT_BRANCH ??
    'main'
  );
}

function envVar(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

interface InstallationToken { token: string; expiresAt: number; }
let cachedInstallToken: InstallationToken | null = null;

/**
 * Mint a 9-minute App JWT (used to call the GitHub API as the App itself).
 * Per GitHub's spec: alg=RS256, iss=app id, iat=now-60s, exp=now+10min.
 */
async function mintAppJwt(appId: string, pemRaw: string): Promise<string> {
  // Vercel envs sometimes round-trip the PEM with literal \n; normalize.
  const pem = pemRaw.replace(/\\n/g, '\n').trim();
  // Node's crypto.createPrivateKey handles both PEM formats GitHub might
  // give us — PKCS#1 ("BEGIN RSA PRIVATE KEY", the default for GitHub Apps)
  // and PKCS#8 ("BEGIN PRIVATE KEY"). jose's SignJWT accepts a Node
  // KeyObject directly when running on Node.
  const key = createPrivateKey(pem);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key);
}

/** Exchange the App JWT for a 1-hour installation token. */
async function getInstallationToken(): Promise<string> {
  if (cachedInstallToken && cachedInstallToken.expiresAt > Date.now() + 60_000) {
    return cachedInstallToken.token;
  }
  const appId = envVar('GITHUB_STACKS_APP_ID', 'GITHUB_APP_ID');
  const installId = envVar('GITHUB_STACKS_INSTALLATION_ID', 'GITHUB_APP_INSTALLATION_ID');
  const pem = envVar('GITHUB_STACKS_PRIVATE_KEY', 'GITHUB_APP_PRIVATE_KEY');
  if (!appId || !installId || !pem) {
    throw new Error(
      'GitHub App auth not configured. Need GITHUB_STACKS_APP_ID, ' +
      'GITHUB_STACKS_INSTALLATION_ID, GITHUB_STACKS_PRIVATE_KEY in env.'
    );
  }
  const appJwt = await mintAppJwt(appId, pem);
  const res = await fetch(
    `https://api.github.com/app/installations/${installId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'fullstack-vc-stacks-bot',
      },
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub installation token exchange failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token: string; expires_at: string };
  cachedInstallToken = {
    token: body.token,
    expiresAt: new Date(body.expires_at).getTime(),
  };
  return cachedInstallToken.token;
}

/**
 * Resolve the bearer token to send on REST API calls. Prefers the GitHub App
 * installation token when configured; falls back to a PAT when only a PAT is
 * set (in case the App machinery isn't ready yet but a PAT is).
 */
async function getAuthToken(): Promise<string> {
  const hasApp =
    !!envVar('GITHUB_STACKS_APP_ID', 'GITHUB_APP_ID') &&
    !!envVar('GITHUB_STACKS_INSTALLATION_ID', 'GITHUB_APP_INSTALLATION_ID') &&
    !!envVar('GITHUB_STACKS_PRIVATE_KEY', 'GITHUB_APP_PRIVATE_KEY');
  if (hasApp) return await getInstallationToken();
  const pat = envVar('GITHUB_BOT_TOKEN', 'GITHUB_CONTENT_PAT');
  if (pat) return pat;
  throw new Error(
    'No GitHub credential found. Set the GitHub App env vars ' +
    '(GITHUB_STACKS_APP_ID + GITHUB_STACKS_INSTALLATION_ID + GITHUB_STACKS_PRIVATE_KEY) ' +
    'or a fallback PAT (GITHUB_BOT_TOKEN).'
  );
}

interface ContentsGetResponse {
  sha: string;
  content: string;
  encoding: string;
}

const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'fullstack-vc-stacks-bot',
};

/** GET /repos/.../contents/PATH — returns existing SHA + base64 content, or null if 404. */
async function getFile(path: string, token: string): Promise<ContentsGetResponse | null> {
  const url = `https://api.github.com/repos/${repoOwner()}/${repoName()}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(targetBranch())}`;
  const res = await fetch(url, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET contents failed: ${res.status} on ${url} — ${await res.text()}`);
  return (await res.json()) as ContentsGetResponse;
}

/**
 * PUT /repos/.../contents/PATH — create or update a file. Returns the new commit
 * SHA on success.
 */
async function putFile(opts: {
  path: string;
  content: string;
  commitMessage: string;
  parentSha?: string;
  token: string;
}): Promise<string> {
  const { path, content, commitMessage, parentSha, token } = opts;
  const url = `https://api.github.com/repos/${repoOwner()}/${repoName()}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: targetBranch(),
  };
  if (parentSha) body.sha = parentSha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...API_HEADERS,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`GitHub PUT contents failed: ${res.status} on ${url} branch=${targetBranch()} — ${errText}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = (await res.json()) as { commit: { sha: string } };
  return json.commit.sha;
}

/**
 * Read a file's current text content from the configured repo+branch. Returns
 * null on 404. Used by the save endpoint to preserve fields the form doesn't
 * edit (kauffman_class, github_avatar, joined_dojo) across writes.
 */
export async function fetchExisting(path: string): Promise<string | null> {
  const token = await getAuthToken();
  const existing = await getFile(path, token);
  if (!existing) return null;
  return Buffer.from(existing.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

/**
 * Create or update a file in the configured repo+branch. On 409 (parent SHA
 * mismatch), refetch and retry once. Returns the new commit SHA + branch.
 */
export async function commitFile(opts: {
  path: string;          // e.g. "src/content/participants/mpstaton.md"
  content: string;       // raw file content (we base64-encode internally)
  commitMessage: string; // e.g. "data(stack): mpstaton updated their stack"
}): Promise<{ commitSha: string; branch: string; }> {
  const token = await getAuthToken();

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await getFile(opts.path, token);
    try {
      const commitSha = await putFile({
        path: opts.path,
        content: opts.content,
        commitMessage: opts.commitMessage,
        parentSha: existing?.sha,
        token,
      });
      return { commitSha, branch: targetBranch() };
    } catch (e: any) {
      if ((e?.status === 409 || e?.status === 422) && attempt === 0) continue;
      throw e;
    }
  }
  throw new Error('commitFile: exhausted retries (should not reach)');
}

// Re-exports kept for any consumer that wants to introspect (e.g. the
// smoke-test). Lazy: invoke them, don't import as constants.
export { repoOwner, repoName, targetBranch };
