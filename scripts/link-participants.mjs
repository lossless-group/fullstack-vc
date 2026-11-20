// scripts/link-participants.mjs
//
// Links each public profile in src/content/participants/ to its person in
// Turso (People.handle), and fills in what the database is missing from it:
// the curated name, the firm and role on their role card, their links on a
// socials card, and their login account (and its addresses) when the
// profile's GitHub handle has one. Participants who never registered become
// people too, so People holds everyone.
//
// Spec: context-v/specs/People-and-Contact-Cards-for-Session-Registrations.md
// Cards are written only through src/lib/contact-cards.ts.
//
// Matching, in order:
//   1. a person already holding this handle;
//   2. the login account with the profile's GitHub handle (its github: field,
//      else its handle): the person linked
//      to it, or the person who has one of its addresses on a card;
//   3. exactly one person with the same name (profiles are curated by hand,
//      so a unique exact name is taken as the same person; the report lists
//      every such link for a look);
//   4. a decision in context-v/extra/participant-review.json;
//   5. otherwise a similar name (same last name) goes on that review list,
//      and no similar name at all means a new person.
//
// Conflicts are resolved toward the profile, which a human curated: its name
// and firm replace what a registration implied (unless the profile's name is
// only its handle, a stub that doesn't know the real name). Anything the profile can't
// settle (an address or account already belonging to someone else) is
// reported and left alone.
//
// Review decisions: "link:prs_…" (same person) or "new".
//
// Run:
//   DRY_RUN=true pnpm db:link-participants
//   pnpm db:link-participants

import { createClient } from '@libsql/client';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { addCalled, allNames, cardEmails, createPerson, findPersonIdByEmail, loadCards, upsertContactCard } from '../src/lib/contact-cards.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const env = readFileSync(join(ROOT, '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};
const DRY_RUN = process.env.DRY_RUN === 'true';
const REVIEW_FILE = join(ROOT, 'context-v/extra/participant-review.json');
const PARTICIPANTS = join(ROOT, 'src/content/participants');

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
  'hey.com', 'fastmail.com', 'btinternet.com',
]);
// Not a role: a mail provider, a university or alumni address, or a vanity
// domain built from the person's own name (lylan.com, meshekah.com).
function isPersonalDomain(domain, p) {
  if (PERSONAL_DOMAINS.has(domain)) return true;
  if (/(^|\.)edu(\.|$)|(^|\.)alumni\./.test(domain)) return true;
  const label = domain.split('.')[0];
  return [p.handle, ...tokens(p.name)].some((t) => t && t.length >= 4 && label.includes(t.toLowerCase()));
}

// Does this email domain belong to this firm? By name (iolar.vc for Iolar
// Ventures, hi.vc for Hi.VC) or by initials (mgv.vc for Maschmeyer Group Ventures).
const GENERIC_FIRM_WORDS = new Set(['ventures', 'venture', 'capital', 'group', 'fund', 'partners', 'vc', 'the', 'and']);
function domainMatchesFirm(domain, firm) {
  if (!domain || !firm) return false;
  const compactDomain = domain.replace(/\./g, '');
  const words = firm.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const compactFirm = words.join('');
  const initials = words.map((w) => w[0]).join('');
  return compactDomain.startsWith(compactFirm)
    || words.some((w) => w.length >= 3 && !GENERIC_FIRM_WORDS.has(w) && domain.split('.')[0].includes(w))
    || (initials.length >= 2 && domain.split('.')[0] === initials);
}

// Firm values that mean "no firm".
const NO_FIRM = new Set(['', 'independent', 'none', 'n/a']);

// ─── Profiles ────────────────────────────────────────────────────────────────
// Only single-line scalar fields are needed, read leniently: a malformed line
// is skipped, never fatal.
function frontmatter(text) {
  const out = {};
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  for (const line of (m?.[1] ?? '').split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv || kv[2].startsWith('[') || kv[2] === '') continue;
    out[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return out;
}

const profiles = readdirSync(PARTICIPANTS)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ file: f, ...frontmatter(readFileSync(join(PARTICIPANTS, f), 'utf-8')) }))
  .filter((p) => p.handle && p.name);

const githubHandle = (v) => v?.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/.*$/, '').toLowerCase() || null;
const asUrl = (v, base) => (!v ? null : /^https?:\/\//.test(v) ? v.replace(/^http:/, 'https:') : `${base}${v}`);

// ─── Database ────────────────────────────────────────────────────────────────
const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });

const people = new Map((await client.execute('SELECT id, name, called, user_id, handle FROM People')).rows
  .map((r) => [String(r.id), { name: r.name ? String(r.name) : null, names: allNames(r.name ? String(r.name) : null, r.called), user_id: r.user_id ? String(r.user_id) : null, handle: r.handle ? String(r.handle) : null }]));
const emailsOf = new Map();
for (const r of (await client.execute('SELECT person_id, card FROM PersonContactCards')).rows) {
  const list = emailsOf.get(String(r.person_id)) ?? [];
  list.push(...cardEmails(JSON.parse(String(r.card))));
  emailsOf.set(String(r.person_id), list);
}
const users = (await client.execute('SELECT id, email, emails, github_handle FROM User')).rows.map((u) => {
  let extra = [];
  try { extra = Array.isArray(u.emails) ? u.emails : JSON.parse(String(u.emails ?? '[]')); } catch {}
  const emails = [...new Set([u.id, u.email, ...extra].filter((e) => typeof e === 'string' && e.includes('@')).map((e) => e.trim().toLowerCase()))];
  return { id: String(u.id), github: u.github_handle ? String(u.github_handle).toLowerCase() : null, emails };
});

const review = existsSync(REVIEW_FILE) ? JSON.parse(readFileSync(REVIEW_FILE, 'utf-8')) : { items: [] };
const decisions = new Map(review.items.filter((it) => it.decision).map((it) => [it.handle, it.decision]));

// ─── Matching ────────────────────────────────────────────────────────────────
const tokens = (n) => (n ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[“”"].*?[“”"]/g, ' ').replace(/,.*$/, '').replace(/[^a-z\s-]/g, ' ')
  .split(/[\s-]+/).filter((t) => t && t !== 'jr');
const norm = (n) => tokens(n).join(' ');
const findPersonByEmail = (email) => [...emailsOf].find(([, list]) => list.includes(email))?.[0] ?? null;

const plan = [];          // { profile, personId|null (new), how, user }
const held = [];
for (const p of profiles) {
  // Profile handles are usually the person's GitHub handle, so a profile
  // without a github: field still finds its account through the handle.
  const gh = githubHandle(p.github);
  const user = (gh && users.find((u) => u.github === gh)) || users.find((u) => u.github === p.handle.toLowerCase()) || null;

  let personId = [...people].find(([, x]) => x.handle === p.handle)?.[0];
  let how = personId ? 'handle' : null;
  if (!personId && user) {
    personId = [...people].find(([, x]) => x.user_id === user.id)?.[0]
      ?? user.emails.map(findPersonByEmail).find(Boolean);
    if (personId) how = 'account';
  }
  if (!personId) {
    const same = [...people].filter(([, x]) => x.names.some((n) => norm(n) && norm(n) === norm(p.name)));
    if (same.length === 1) { personId = same[0][0]; how = 'same name'; }
  }
  if (!personId && decisions.has(p.handle)) {
    const d = decisions.get(p.handle);
    if (d === 'new') how = 'decided new';
    else if (d.startsWith('link:') && people.has(d.slice(5))) { personId = d.slice(5); how = 'decided link'; }
  }
  if (!personId && how !== 'decided new') {
    const last = tokens(p.name).at(-1);
    const similar = [...people].filter(([, x]) => last && last.length > 2 && x.names.some((n) => tokens(n).at(-1) === last));
    if (similar.length) {
      held.push({
        handle: p.handle,
        name: p.name,
        firm: p.firm ?? null,
        candidates: similar.map(([id, x]) => ({
          person_id: id, name: x.name,
          domains: [...new Set((emailsOf.get(id) ?? []).map((e) => e.split('@')[1]))],
        })),
        decision: decisions.get(p.handle) ?? null,
      });
      continue;
    }
  }
  plan.push({ profile: p, personId: personId ?? null, how: how ?? 'new', user });
}

// ─── Report ──────────────────────────────────────────────────────────────────
const by = (h) => plan.filter((x) => x.how === h);
console.log(DRY_RUN ? 'DRY RUN: nothing will be written\n' : '');
console.log(`${profiles.length} profiles`);
for (const h of ['handle', 'account', 'same name', 'decided link', 'new', 'decided new']) {
  if (by(h).length) console.log(`  ${h.padEnd(13)} ${by(h).length}`);
}
console.log(`  held          ${held.length}`);
console.log('\nLinked by the same name (check these):');
for (const x of by('same name')) {
  const domains = [...new Set((emailsOf.get(x.personId) ?? []).map((e) => '@' + e.split('@')[1]))].join(', ');
  console.log(`  ${x.profile.handle.padEnd(22)} ${x.profile.name.padEnd(26)} firm: ${(x.profile.firm || '—').padEnd(22)} registered as ${domains || '—'}`);
}
if (held.length) {
  console.log('\nSimilar names to decide:');
  for (const it of held) {
    console.log(`  ${it.handle} (${it.name}${it.firm ? ', ' + it.firm : ''})`);
    for (const c of it.candidates) console.log(`    maybe ${c.person_id}: ${c.name} @${c.domains.join(', @')}`);
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────
const conflicts = [];
const changes = [];

async function apply(db, { profile: p, personId, user }) {
  const id = personId ?? await createPerson(db, { name: p.name });
  const before = people.get(id) ?? { name: null, user_id: null, handle: null };
  if (!personId) changes.push(`${p.handle}: new person`);

  // Name and handle: the profile wins.
  if (before.handle && before.handle !== p.handle) {
    conflicts.push(`${p.handle}: person ${id} already has handle ${before.handle}`);
  } else if (before.handle !== p.handle) {
    await db.execute({ sql: 'UPDATE People SET handle = ? WHERE id = ?', args: [p.handle, id] });
  }
  // A stub profile whose name is just its handle doesn't know the real name.
  const realName = p.name !== p.handle;
  if (personId && realName && before.name !== p.name) {
    await db.execute({ sql: 'UPDATE People SET name = ? WHERE id = ?', args: [p.name, id] });
    changes.push(`${p.handle}: name "${before.name}" → "${p.name}"`);
    // The name they registered under is still a name they go by.
    if (before.name && before.name !== p.handle) await addCalled(db, id, [before.name]);
  }
  // A nickname in the profile's name ('Aravind “Avi” Bharadwaj') is a name
  // they go by: "Avi Bharadwaj".
  const nick = p.name.match(/[“"']([^”"']+)[”"']/)?.[1];
  const last = p.name.replace(/[“"'][^”"']+[”"']/, '').replace(/,.*$/, '').trim().split(/\s+/).at(-1);
  if (nick && last) {
    const added = await addCalled(db, id, [`${nick} ${last}`]);
    if (added.length) changes.push(`${p.handle}: goes by ${added.join(', ')}`);
  }

  // Login account and its addresses.
  if (user && before.user_id !== user.id) {
    const holder = (await db.execute({ sql: 'SELECT id FROM People WHERE user_id = ?', args: [user.id] })).rows[0];
    if (before.user_id) conflicts.push(`${p.handle}: person ${id} is linked to another account`);
    else if (holder) conflicts.push(`${p.handle}: their account is linked to person ${holder.id}`);
    else {
      await db.execute({ sql: 'UPDATE People SET user_id = ? WHERE id = ?', args: [user.id, id] });
      changes.push(`${p.handle}: linked to their login account`);
    }
  }

  let cards = await loadCards(db, id);
  const save = (c, card, source) => upsertContactCard(db, {
    id: c?.id, person_id: id, card_type: c?.card_type ?? card.__type, active: c?.active ?? true,
    timeframe: c?.timeframe ?? null, card: Object.fromEntries(Object.entries(card).filter(([k]) => k !== '__type')),
    source: c?.source ?? source,
  });

  for (const email of user?.emails ?? []) {
    const owner = await findPersonIdByEmail(db, email);
    if (owner === id) continue;
    if (owner) { conflicts.push(`${p.handle}: their login address @${email.split('@')[1]} belongs to person ${owner}`); continue; }
    const domain = email.split('@')[1];
    const type = isPersonalDomain(domain, p) ? 'personal' : 'role';
    const sameDomain = cards.find((c) => c.card_type === type && cardEmails(c.card).some((e) => e.endsWith('@' + domain)));
    const blankRole = type === 'role' ? cards.find((c) => c.card_type === 'role' && !c.card.email) : undefined;
    const target = sameDomain ?? blankRole ?? (type === 'personal' ? cards.find((c) => c.card_type === 'personal') : undefined);
    if (target && target.card.email) await save(target, { ...target.card, email_aliases: [...(target.card.email_aliases ?? []), email] });
    else if (target) await save(target, { ...target.card, email, ...(type === 'role' && { org_domain: domain }) });
    else await save(null, { __type: type, email, ...(type === 'role' && { org_domain: domain }) }, 'login');
    changes.push(`${p.handle}: added login address @${domain}`);
    cards = await loadCards(db, id);
  }

  // Firm and role: onto the role card for that firm, the profile winning. That
  // card is the one already naming the firm, else the one whose address is at
  // the firm's domain, else a role card with neither address nor firm; else a
  // new card. Never just any card: an old employer's address isn't this firm.
  const firm = p.firm && !NO_FIRM.has(p.firm.toLowerCase()) ? p.firm : null;
  if (firm || p.role) {
    const roles = cards.filter((c) => c.card_type === 'role' && c.active);
    const domainOf = (c) => (c.card.email ?? '').split('@')[1] ?? c.card.org_domain;
    const roleCard = firm
      ? roles.find((c) => c.card.org === firm)
        ?? roles.find((c) => domainMatchesFirm(domainOf(c), firm))
        ?? roles.find((c) => !c.card.email && !c.card.org)
      : roles.find((c) => c.card.org) ?? roles[0];
    const next = { ...(roleCard?.card ?? { __type: 'role' }), ...(firm && { org: firm }), ...(p.role && { title: p.role }) };
    if (!roleCard || roleCard.card.org !== next.org || roleCard.card.title !== next.title) {
      if (roleCard?.card.org && firm && roleCard.card.org !== firm) changes.push(`${p.handle}: firm "${roleCard.card.org}" → "${firm}"`);
      await save(roleCard, next, 'participant-profile');
      changes.push(`${p.handle}: role card ${[firm && 'firm', p.role && 'title'].filter(Boolean).join(' + ')}`);
      cards = await loadCards(db, id);
    }
  }

  // Links: onto the socials card, the profile winning.
  const links = {
    ...(githubHandle(p.github) && { github: `https://github.com/${githubHandle(p.github)}` }),
    ...(p.linkedin && { linkedin: asUrl(p.linkedin, 'https://www.linkedin.com/in/') }),
    ...(p.website && { site: asUrl(p.website, 'https://') }),
  };
  if (Object.keys(links).length) {
    const socials = cards.find((c) => c.card_type === 'socials');
    const next = { ...(socials?.card ?? { __type: 'socials' }), ...links };
    if (!socials || JSON.stringify(socials.card) !== JSON.stringify(next)) {
      await save(socials, next, 'participant-profile');
      changes.push(`${p.handle}: socials ${Object.keys(links).join(', ')}`);
    }
  }
}

if (!DRY_RUN) {
  const tx = await client.transaction('write');
  try {
    for (const x of plan) await apply(tx, x);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
  writeFileSync(REVIEW_FILE, JSON.stringify({
    generated_at: new Date().toISOString(),
    how_to_use: 'Set each decision to "link:<person_id>" (same person) or "new", then run `pnpm db:link-participants` again.',
    items: held,
  }, null, 2) + '\n');
  console.log(`\n${changes.length} changes:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`\n${held.length} similar names listed in context-v/extra/participant-review.json`);
}
if (conflicts.length || DRY_RUN) {
  console.log(DRY_RUN ? '\n(Conflicts are found while applying; the real run lists them.)' : `\n${conflicts.length} conflicts left alone:`);
  for (const c of conflicts) console.log(`  ${c}`);
}
