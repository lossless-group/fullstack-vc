// scripts/generate-orphan-md-stubs.ts
//
// Walks every User row in Turso and generates a participant markdown stub
// for any user that has no matching file in src/content/participants/.
// Cross-references email domain with the combined firms JSON so the firm
// field gets pre-populated when we recognize the domain.
//
// Stubs are written with `publish: false` so they don't appear on the public
// /people/ index until the host reviews and flips it to true.
//
// Run via:
//
//   # Dry-run (default, no writes):
//   pnpm astro db execute scripts/generate-orphan-md-stubs.ts --remote
//
//   # Commit writes to disk:
//   WRITE=true pnpm astro db execute scripts/generate-orphan-md-stubs.ts --remote
//
// Handle derivation:
//   1. User.github_handle if set (preserves the OAuth-linked slug)
//   2. Firstname-lastname from User.name (lowercase, hyphenated, ASCII-only)
//   3. Fallback to the email username (the part before @)
//
// Existing md files are never overwritten — if a file already exists at the
// derived path, the user is reported as "skipped (already exists)".

import { db, User } from 'astro:db';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const PARTICIPANTS_DIR = resolve(ROOT, 'src/content/participants');
const COMBINED_FIRMS_PATH = resolve(ROOT, 'src/data/webinar-survey/2026-05-27_combined-firms.json');

const WRITE = process.env.WRITE === 'true';

// ─── Load existing participant filenames ────────────────────────────────────
const existingMd = new Set(
  readdirSync(PARTICIPANTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
);

// ─── Load combined firms for domain → firm lookup ───────────────────────────
type Firm = { name: string; domains: string[]; count: number };
let firmsByDomain = new Map<string, Firm>();
try {
  const j = JSON.parse(readFileSync(COMBINED_FIRMS_PATH, 'utf8'));
  for (const firm of j.firms ?? []) {
    for (const d of firm.domains ?? []) {
      firmsByDomain.set(String(d).toLowerCase(), firm);
    }
  }
} catch (e) {
  console.warn(`Could not load ${COMBINED_FIRMS_PATH} — firm lookup disabled.`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function deriveHandle(user: any): string {
  if (user.github_handle) return String(user.github_handle).toLowerCase();
  // Try firstname-lastname from name
  const name = String(user.name ?? '').trim();
  if (name && !name.includes('@')) {
    const slug = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumerics except space/hyphen
      .trim()
      .replace(/\s+/g, '-');
    if (slug.length > 0) return slug;
  }
  // Fallback: email username
  const email = String(user.email ?? user.id ?? '');
  if (email.includes('@')) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  return String(user.id).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function firmFromEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1].toLowerCase();
  if (firmsByDomain.has(domain)) return firmsByDomain.get(domain)!.name;
  return null;
}

function escapeYamlString(s: string): string {
  return s.replace(/"/g, '\\"');
}

function quote(s: string): string {
  return `"${escapeYamlString(s)}"`;
}

function isoDate(d: any): string {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function buildStubMd(user: any, handle: string, firm: string | null): string {
  const u = user;
  const lines: string[] = [];
  lines.push('---');
  lines.push(`handle: ${handle}`);
  if (u.name) lines.push(`name: ${quote(String(u.name))}`);
  lines.push(`firm: ${firm ? quote(firm) : '""'}`);
  lines.push(`role: ""`);
  lines.push(`kauffman_class: null`);
  lines.push(`directory_profile_kauffman: ""`);
  lines.push(`linkedin: ""`);
  if (u.avatar) lines.push(`headshot: ${quote(String(u.avatar))}`);
  else lines.push(`headshot: ""`);
  lines.push(`publish: false`);
  lines.push(`joined_dojo: ${isoDate(u.created_at)}`);
  // Provenance comments so future-Michael knows where this came from
  lines.push(`# Auto-generated stub from generate-orphan-md-stubs.ts`);
  lines.push(`# User.id: ${u.id}`);
  lines.push(`# Last provider: ${u.last_provider ?? '?'}`);
  if (u.github_handle) lines.push(`# github_handle: ${u.github_handle}`);
  lines.push(`current_stack: []`);
  lines.push(`aspirational_stack: []`);
  lines.push(`abandoned_stack: []`);
  lines.push('---');
  lines.push('');
  // Body — minimal placeholder
  const blurb = firm
    ? `${u.name ?? handle} · ${firm}. _Stub auto-generated; flip \`publish: true\` after review._`
    : `${u.name ?? handle}. _Stub auto-generated; flip \`publish: true\` after review._`;
  lines.push(blurb);
  lines.push('');
  return lines.join('\n');
}

// ─── Walk users ─────────────────────────────────────────────────────────────
const allUsers = await db.select().from(User).all();

type Report = {
  user: any;
  handle: string;
  firm: string | null;
  status: 'would-create' | 'created' | 'skipped-existing' | 'skipped-handle-collision';
  path: string;
};

const reports: Report[] = [];

for (const user of allUsers) {
  const u = user as any;
  let handle = deriveHandle(u);

  // Determine status. If the derived handle collides with an existing md
  // file that *isn't this user's*, flag it — we don't want to overwrite.
  if (existingMd.has(handle)) {
    // Could be the user's own md already (if github_handle is set + matches).
    // We trust the audit to flag "already-hydrated" users; here we just skip.
    reports.push({
      user: u,
      handle,
      firm: null,
      status: 'skipped-existing',
      path: `src/content/participants/${handle}.md`,
    });
    continue;
  }

  const firm = firmFromEmail(u.email) ?? firmFromEmail(u.id);
  const path = resolve(PARTICIPANTS_DIR, `${handle}.md`);

  if (existsSync(path)) {
    // Belt-and-suspenders — should be caught by existingMd, but stat the file too.
    reports.push({ user: u, handle, firm, status: 'skipped-handle-collision', path });
    continue;
  }

  if (WRITE) {
    const md = buildStubMd(u, handle, firm);
    writeFileSync(path, md, 'utf8');
    reports.push({ user: u, handle, firm, status: 'created', path });
  } else {
    reports.push({ user: u, handle, firm, status: 'would-create', path });
  }
}

// ─── Output ─────────────────────────────────────────────────────────────────
const wouldCreate = reports.filter((r) => r.status === 'would-create' || r.status === 'created');
const skipped = reports.filter((r) => r.status === 'skipped-existing' || r.status === 'skipped-handle-collision');

console.log('');
console.log(`Orphan md stub generation  ·  ${WRITE ? 'WRITE MODE' : 'DRY RUN (default)'}`);
console.log('============================================');
console.log(`Total users: ${allUsers.length} · Stubs ${WRITE ? 'created' : 'pending'}: ${wouldCreate.length} · Already have md: ${skipped.length}`);
console.log('');

if (wouldCreate.length > 0) {
  console.log(`${WRITE ? 'Created' : 'Would create'}:`);
  for (const r of wouldCreate) {
    const u = r.user;
    const firmPart = r.firm ? ` · ${r.firm}` : '';
    const namePart = u.name ?? '(no name)';
    console.log(`  ✓ ${r.path.replace(ROOT + '/', '')}`);
    console.log(`      ${namePart}${firmPart}   [${u.last_provider} · ${u.id}]`);
  }
}

if (!WRITE && wouldCreate.length > 0) {
  console.log('');
  console.log('To commit these writes, re-run with:');
  console.log('  WRITE=true pnpm astro db execute scripts/generate-orphan-md-stubs.ts --remote');
  console.log('');
  console.log('Each stub is written with publish: false — flip to true after review.');
}

if (skipped.length > 0) {
  console.log('');
  console.log(`Skipped (md already exists at the derived handle):`);
  for (const r of skipped) {
    console.log(`  - ${(r.user as any).name ?? r.user.id}  →  ${r.handle}.md`);
  }
}
console.log('');
