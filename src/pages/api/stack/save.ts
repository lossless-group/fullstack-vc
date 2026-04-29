// ============================================================================
// /api/stack/save — write endpoint for the stack builder.
//
// Flow:
//   1. Verify session cookie (JWT).
//   2. Validate payload (Zod): handle === session.subject; tools exist in registry.
//   3. Merge with existing participant file if present (preserve fields the
//      UI doesn't edit: kauffman_class, joined_dojo, github_avatar, etc.).
//   4. Serialize to YAML frontmatter + markdown body.
//   5. Commit via github-commit.ts.
//   6. Return { ok, profileUrl, commitSha }.
//
// On error, returns 4xx with a JSON body { error: string }.
// ============================================================================

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { getCollection } from 'astro:content';
import { verifySession, SESSION_COOKIE_NAME } from '../../../lib/session';
import { matchesRoster } from '../../../lib/oauth-roster';
import { commitFile, fetchExisting } from '../../../lib/github-commit';

export const prerender = false;

// ---------- Validation ----------

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const StackItem = z.object({
  tool: z.string().regex(SLUG_RE, 'tool slug must be lowercase-dasherized'),
  added: z.string().optional(),  // ISO date string from the form
  notes: z.string().max(500).optional(),
});

const AspirationalItem = z.object({
  tool: z.string().regex(SLUG_RE),
  intent: z.string().max(500).optional(),
});

const AbandonedItem = z.object({
  tool: z.string().regex(SLUG_RE),
  abandoned: z.string().optional(),
  reason: z.string().max(500).optional(),
});

const SavePayload = z.object({
  handle: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  firm: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  publish: z.boolean().default(false),
  current_stack: z.array(StackItem).max(50).default([]),
  aspirational_stack: z.array(AspirationalItem).max(50).default([]),
  abandoned_stack: z.array(AbandonedItem).max(50).default([]),
  /** Optional free-text body for the participant page. */
  body: z.string().max(10_000).default(''),
});

type Save = z.infer<typeof SavePayload>;

// ---------- YAML serialization ----------
// Hand-rolled — only handles the small subset of YAML our schema produces.
// Strings get quoted with double quotes (escaping inner quotes); dates are
// emitted unquoted; numbers and booleans likewise. Arrays of objects use the
// `- key: val` block form.

function yamlStr(v: string): string {
  // Heuristic: quote if contains anything potentially-meaningful in YAML.
  if (/^[\w./@:-]+$/.test(v) && !['true','false','null','yes','no','on','off'].includes(v.toLowerCase())) {
    return v;
  }
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emitFlatField(key: string, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  if (typeof value === 'string') return `${key}: ${yamlStr(value)}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${key}: ${value}`;
  return null;
}

function emitItemArray(key: string, arr: Record<string, unknown>[]): string {
  if (arr.length === 0) return `${key}: []`;
  const lines = [`${key}:`];
  for (const item of arr) {
    const fieldLines: string[] = [];
    for (const [k, v] of Object.entries(item)) {
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'string') fieldLines.push(`    ${k}: ${yamlStr(v)}`);
      else if (typeof v === 'number' || typeof v === 'boolean') fieldLines.push(`    ${k}: ${v}`);
    }
    if (fieldLines.length === 0) continue;
    fieldLines[0] = fieldLines[0].replace(/^ {4}/, '  - ');
    lines.push(...fieldLines);
  }
  return lines.join('\n');
}

interface PreservedFields {
  kauffman_class?: number;
  github?: string;
  github_avatar?: string;
  headshot?: string;
  linkedin?: string;
  joined_dojo?: string;
}

function serializeParticipant(save: Save, preserved: PreservedFields): string {
  const lines: string[] = ['---'];

  // Identity
  push(lines, emitFlatField('handle', save.handle));
  push(lines, emitFlatField('name', save.name));
  push(lines, emitFlatField('firm', save.firm));
  push(lines, emitFlatField('role', save.role));
  push(lines, emitFlatField('kauffman_class', preserved.kauffman_class));

  // Identity links (preserved on update; on first save the endpoint fills these from session)
  push(lines, emitFlatField('github', preserved.github));
  push(lines, emitFlatField('github_avatar', preserved.github_avatar));
  push(lines, emitFlatField('headshot', preserved.headshot));
  push(lines, emitFlatField('linkedin', preserved.linkedin));

  // Visibility
  push(lines, `publish: ${save.publish ? 'true' : 'false'}`);
  push(lines, emitFlatField('joined_dojo', preserved.joined_dojo));

  // Stacks
  lines.push(emitItemArray('current_stack', save.current_stack));
  lines.push(emitItemArray('aspirational_stack', save.aspirational_stack));
  lines.push(emitItemArray('abandoned_stack', save.abandoned_stack));

  lines.push('---');
  lines.push('');
  if (save.body && save.body.trim().length > 0) {
    lines.push(save.body.trim());
    lines.push('');
  }
  return lines.join('\n');
}

function push(arr: string[], v: string | null) {
  if (v) arr.push(v);
}

// ---------- Frontmatter parser (minimal — for round-tripping our own files) ----------
// We only need to extract a few preserved fields from the existing file, so a
// regex pass is plenty. We don't try to be a general YAML parser.

function parsePreservedFields(content: string): PreservedFields {
  const out: PreservedFields = {};
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!fmMatch) return out;
  const fm = fmMatch[1];

  const flat = (key: keyof PreservedFields, isNumber = false) => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const m = re.exec(fm);
    if (!m) return;
    let v = m[1].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (isNumber) {
      const n = Number(v);
      if (!isNaN(n)) (out as any)[key] = n;
    } else {
      (out as any)[key] = v;
    }
  };
  flat('github');
  flat('github_avatar');
  flat('headshot');
  flat('linkedin');
  flat('joined_dojo');
  flat('kauffman_class', true);
  return out;
}

function parseExistingBody(content: string): string {
  const m = /^---\n[\s\S]*?\n---\s*\n([\s\S]*)$/.exec(content);
  return m ? m[1].trim() : '';
}

// ---------- Endpoint ----------

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return json({ error: 'not authenticated' }, 401);
  }
  const rosterEntry = matchesRoster(session);
  if (!rosterEntry) {
    return json({ error: 'not on roster' }, 403);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const parsed = SavePayload.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'validation failed', details: parsed.error.flatten() }, 400);
  }
  const save = parsed.data;

  // Handle must match session subject. Subject is the GitHub handle for github
  // provider, or the LinkedIn `sub` for linkedin provider — for linkedin we use
  // a derived handle (the email local-part with no dots), but for v0.5 we only
  // accept matching subjects for github logins.
  if (session.provider !== 'github' || save.handle.toLowerCase() !== session.subject.toLowerCase()) {
    return json({ error: 'handle does not match session subject' }, 403);
  }

  // Validate every tool slug exists in the registry.
  const tools = await getCollection('tools');
  const knownSlugs = new Set(tools.map(t => t.id));
  const allSlugs = [
    ...save.current_stack.map(s => s.tool),
    ...save.aspirational_stack.map(s => s.tool),
    ...save.abandoned_stack.map(s => s.tool),
  ];
  const unknown = allSlugs.filter(s => !knownSlugs.has(s));
  if (unknown.length > 0) {
    return json({ error: 'unknown tool slug(s)', unknown }, 400);
  }

  // The fullstack-vc site is its own GitHub repo (lossless-group/fullstack-vc),
  // so paths inside the API are relative to that repo's root — no monorepo prefix.
  const path = `src/content/participants/${save.handle}.md`;

  // Read the existing file from the repo so we preserve fields the UI doesn't
  // edit (kauffman_class, joined_dojo, github_avatar, etc.).
  let existingContent: string | null = null;
  try {
    existingContent = await fetchExisting(path);
  } catch {
    /* fall through with empty preserved fields */
  }

  const preserved: PreservedFields = existingContent
    ? parsePreservedFields(existingContent)
    : {};

  // Backfill from session/roster on first save
  if (!preserved.github && session.provider === 'github') {
    preserved.github = `https://github.com/${session.subject}`;
  }
  if (!preserved.github_avatar && session.avatar) {
    preserved.github_avatar = session.avatar;
  }
  if (!preserved.kauffman_class && rosterEntry.kauffman_class) {
    preserved.kauffman_class = rosterEntry.kauffman_class;
  }
  if (!preserved.joined_dojo) {
    preserved.joined_dojo = new Date().toISOString().slice(0, 10);
  }

  // Preserve any prior body text the user had on their file.
  if (existingContent) {
    const priorBody = parseExistingBody(existingContent);
    if (priorBody && !save.body) {
      save.body = priorBody;
    }
  }

  const fileContent = serializeParticipant(save, preserved);

  let commitSha: string;
  try {
    const result = await commitFile({
      path,
      content: fileContent,
      commitMessage: `data(stack): ${save.handle} updated their stack`,
    });
    commitSha = result.commitSha;
  } catch (e: any) {
    return json({ error: 'commit failed', detail: String(e?.message ?? e) }, 502);
  }

  return json({
    ok: true,
    profileUrl: `/people/${save.handle}`,
    commitSha,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
