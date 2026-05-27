// scripts/audit-user-enrichments.ts
//
// Walks every User row, tries to pair it with a participant markdown file in
// src/content/participants/, and reports the enrichment gap (User fields that
// are NULL in the DB but populated in the markdown file).
//
// Pairing logic:
//   1. User.github_handle matches a participant filename (the strong link).
//   2. Else: lowercase name in any md frontmatter matches User.name.
//   3. Else: email username (the part before @) matches a participant filename.
//
// Output: per matched User, the suggested hookup-user.ts command.
//
// Run via:
//
//   pnpm astro db execute scripts/audit-user-enrichments.ts --remote

import { db, User } from 'astro:db';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// astro db execute runs from the site root (pnpm cwd), so resolve from there.
const PARTICIPANTS_DIR = resolve(process.cwd(), 'src/content/participants');

// ─── Load participant markdown files ────────────────────────────────────────
type ParticipantMd = {
  filename: string;
  handle: string | null;
  name: string | null;
  firm: string | null;
  kauffman_class: number | null;
  role: string | null;
};

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([a-z_]+):\s*"?([^"\n]*)"?\s*$/i);
    if (k) out[k[1]] = k[2].trim();
  }
  return out;
}

const mdByFilename = new Map<string, ParticipantMd>();
const files = readdirSync(PARTICIPANTS_DIR).filter((f) => f.endsWith('.md'));
for (const f of files) {
  const raw = readFileSync(resolve(PARTICIPANTS_DIR, f), 'utf8');
  const fm = parseFrontmatter(raw);
  const slug = f.replace(/\.md$/, '');
  mdByFilename.set(slug, {
    filename: slug,
    handle: fm.handle || slug,
    name: fm.name || null,
    firm: fm.firm || null,
    kauffman_class: fm.kauffman_class ? Number(fm.kauffman_class) : null,
    role: fm.role || null,
  });
}

// ─── Walk users ─────────────────────────────────────────────────────────────
const allUsers = await db.select().from(User).all();

type Report = {
  user: any;
  mdMatch: ParticipantMd | null;
  matchVia: 'github_handle' | 'name' | 'email-username' | null;
  gaps: Array<{ field: string; current: any; suggested: any }>;
  command: string | null;
};

const reports: Report[] = [];
const orphans: any[] = []; // logged-in users with no matching md file

function findMd(user: any): { md: ParticipantMd | null; via: Report['matchVia'] } {
  // 1. github_handle match
  if (user.github_handle && mdByFilename.has(user.github_handle)) {
    return { md: mdByFilename.get(user.github_handle)!, via: 'github_handle' };
  }
  // 2. name match
  if (user.name) {
    const lname = String(user.name).toLowerCase().trim();
    for (const md of mdByFilename.values()) {
      if (md.name && md.name.toLowerCase().trim() === lname) {
        return { md, via: 'name' };
      }
    }
  }
  // 3. email-username match (the bit before @)
  const email = user.email ?? user.id;
  if (email && email.includes('@')) {
    const username = email.split('@')[0].toLowerCase();
    if (mdByFilename.has(username)) {
      return { md: mdByFilename.get(username)!, via: 'email-username' };
    }
  }
  return { md: null, via: null };
}

function quote(v: string): string {
  return /\s/.test(v) ? `"${v}"` : v;
}

for (const user of allUsers) {
  const { md, via } = findMd(user);
  if (!md) {
    orphans.push(user);
    continue;
  }

  const gaps: Report['gaps'] = [];
  if (!(user as any).github_handle && md.handle) {
    gaps.push({ field: 'github_handle', current: null, suggested: md.handle });
  }
  if (!(user as any).firm && md.firm) {
    gaps.push({ field: 'firm', current: null, suggested: md.firm });
  }
  if (!(user as any).kauffman_class && md.kauffman_class) {
    gaps.push({ field: 'kauffman_class', current: null, suggested: md.kauffman_class });
  }
  if (!(user as any).name && md.name) {
    gaps.push({ field: 'name', current: null, suggested: md.name });
  }

  let command: string | null = null;
  if (gaps.length > 0) {
    // Construct the hookup command. Use a unique substring from email or id
    // (the lower-cased email username is usually unique enough).
    const match = ((user as any).email ?? (user as any).id ?? '')
      .toLowerCase()
      .split('@')[0];
    const envs: string[] = [`USER_MATCH=${match}`];
    for (const g of gaps) {
      if (g.field === 'github_handle') envs.push(`HANDLE=${g.suggested}`);
      if (g.field === 'firm') envs.push(`FIRM=${quote(String(g.suggested))}`);
      if (g.field === 'kauffman_class') envs.push(`KAUFFMAN_CLASS=${g.suggested}`);
      if (g.field === 'name') envs.push(`NAME=${quote(String(g.suggested))}`);
    }
    command = `${envs.join(' ')} pnpm astro db execute scripts/hookup-user.ts --remote`;
  }

  reports.push({ user, mdMatch: md, matchVia: via, gaps, command });
}

// ─── Output ─────────────────────────────────────────────────────────────────
console.log('');
console.log('User-enrichment audit');
console.log('=====================');
console.log(`${allUsers.length} users · ${mdByFilename.size} participant md files`);
console.log('');

const fullyHydrated = reports.filter((r) => r.gaps.length === 0);
const haveGaps = reports.filter((r) => r.gaps.length > 0);

console.log(`Already fully hydrated (md match + no gaps): ${fullyHydrated.length}`);
for (const r of fullyHydrated) {
  console.log(`  ✓  ${(r.user as any).name ?? r.user.id}  →  ${r.mdMatch!.filename}.md   (via ${r.matchVia})`);
}

console.log('');
console.log(`Have gaps (md match + missing fields): ${haveGaps.length}`);
for (const r of haveGaps) {
  const u = r.user as any;
  console.log('');
  console.log(`  ${u.name ?? u.id}  (${u.id})`);
  console.log(`    md:  ${r.mdMatch!.filename}.md   (matched via ${r.matchVia})`);
  for (const g of r.gaps) {
    console.log(`    + ${g.field}:  (null) → ${g.suggested}`);
  }
  console.log(`    cmd: ${r.command}`);
}

console.log('');
console.log(`Orphans (logged-in users with no md file): ${orphans.length}`);
for (const u of orphans) {
  console.log(`  -  ${(u as any).name ?? u.id}  (${u.id})  [${(u as any).last_provider}]`);
}
console.log('');
