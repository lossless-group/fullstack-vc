// scripts/ingest-zoom-registrations.mjs
//
// Loads Zoom registration exports from context-v/extra/ into Turso: each
// registrant becomes (or is matched to) a person in People with a contact
// card per email, and each registration a row in SessionRegistrations. Then
// attendance can be counted per person across sessions, whichever email they
// registered with.
//
// Spec: context-v/specs/People-and-Contact-Cards-for-Session-Registrations.md
// Tables: db/migrations/001_people-and-contact-cards.sql (run `pnpm db:migrate` first)
// Cards are written only through src/lib/contact-cards.ts.
//
// Registrants are taken in session order, so an April registrant is already
// "there" when their July registration arrives. Each one is either:
//   - a DEFINITE match: their email is on a card, or belongs to a login
//     account (User.id / .email / .emails) already linked to a person. Only
//     the registration is added (plus a card for the email, when it came via
//     the account, so it matches directly next time);
//   - NO match: a new person, card and registration are created;
//   - a FUZZY match: a similar name, or the same email username at another
//     domain. Nothing is written for them. They're listed in
//     context-v/extra/registration-review.json for a human to decide.
//
// Working through the review: set each item's "decision" to one of
//   "alias:pcc_…"  the same person in the same role: the address joins that
//                  card's email_aliases (another domain of the same firm);
//   "card:prs_…"   the same person in another context: a new card for them
//                  (a Gmail address next to their firm one, say);
//   "new"          a different person;
// then run again. Decided items are applied and drop off the list; undecided
// ones stay. Two people already in the database can be combined with
// `pnpm db:merge-people <keep> <merge>`.
//
// Every registration (and attendance) is also recorded in PersonInteractions,
// which keeps each card's sending address on the one used most recently.
//
// Emails stay in Turso. This repo is public and context-v/extra/ is
// gitignored; the dry run prints names and email domains, never addresses.
// Never pre-create User rows from these lists: sign-in would duplicate them.
//
// Two export formats are read:
//   - Zoom Events "Registration report": a "Report generated:" line, a blank
//     line, then Name / Registrant email / Registration date /
//     Event attendance (Live or lobby) …
//   - Zoom Events "People tab, person summary": First name / Last name /
//     Email / Participation / Total time spent(Minutes) / First join time …
//
// Several exports of one session are merged: earliest registration wins,
// "Attended" in any export wins, the most minutes wins. Re-running replaces
// each session's rows with the merged result, so it's idempotent.
//
// A registration export downloaded BEFORE the session lists everyone as
// Absent. report_generated_at is kept on each row so a query can tell a real
// Absent from an export that predates the event.
//
// Run:
//   DRY_RUN=true pnpm ingest:registrations     # report, write nothing
//   pnpm ingest:registrations
//   SESSION=2026-11-19_monthly-all-hands pnpm ingest:registrations

import { createClient } from '@libsql/client';
import { addEmailAlias, cardEmails, createPerson, newId, recordInteractions, upsertContactCard } from '../src/lib/contact-cards.ts';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const env = readFileSync(join(ROOT, '.env'), 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
};

const DRY_RUN = process.env.DRY_RUN === 'true';

// Addresses that belong to a person, not a role: they get a `personal` card.
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
  'hey.com', 'fastmail.com',
]);
const ONLY_SESSION = process.env.SESSION || null;
const REVIEW_FILE = join(ROOT, 'context-v/extra/registration-review.json');

// Which export belongs to which session (src/content/sessions/<slug>.md).
// Add a line per new export. Derived roll-ups (the 2026-08-17 "All Registered
// Participants" sheet) and survey or poll CSVs are not registration exports.
const SOURCES = [
  { session: '2026-04-29_agentic-vc-dojo-launch', file: '2026-04-29/2026-04-26_AI-SIG_AI-Skill-Dojo-Reg_report.csv' },
  { session: '2026-04-29_agentic-vc-dojo-launch', file: '2026-04-29/2026-04-29_AI-SIG_AI-Skill-Dojo-Reg_report-v2.csv' },
  { session: '2026-05-27_monthly-all-hands',      file: '2026-05-27_ ATTENDEES.csv' },
  { session: '2026-07-29_monthly-all-hands',      file: '2026-07-29/2026-07-14_AI-SIG_AI-Agentic-Dojo-Reg_report.csv' },
  { session: '2026-07-29_monthly-all-hands',      file: '2026-07-29/2026-07-28_AI-SIG_AI-Agentic-Dojo-Reg_report-v2.csv' },
  { session: '2026-11-19_monthly-all-hands',      file: '2026-11-19/2026-11-19_AI-SIG_AI-Agentic-Dojo_People-Summary.csv' },
];

// Every session named above must be a real session page, since
// SessionRegistrations.session_slug is how a registration points at it.
for (const { session } of SOURCES) {
  if (!existsSync(join(ROOT, 'src/content/sessions', `${session}.md`))) {
    console.error(`SOURCES names "${session}", but src/content/sessions/${session}.md doesn't exist.`);
    process.exit(1);
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
// Zoom quotes every field and puts newlines inside question headers, so a
// line split won't do.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const clean = (v) => {
  const s = (v ?? '').trim();
  return s && s !== 'N/A' && s !== 'null' ? s : null;
};

// "Thu, Nov 19, 2026 4:42 AM PST" → ISO; "2026-04-29 23:38:15" stays as Zoom wrote it.
function toIso(v) {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const d = new Date(s.replace(/^[A-Za-z]{3}, /, '').replace(/ (PST|PDT)$/, (m) => (m.includes('D') ? ' GMT-0700' : ' GMT-0800')));
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

function readExport(relPath) {
  const path = join(ROOT, 'context-v/extra', relPath);
  const rows = parseCsv(readFileSync(path, 'utf-8').replace(/^﻿/, ''));
  const generated = rows[0]?.[0] === 'Report generated:' ? rows[0][1] : null;
  const headerIdx = rows.findIndex((r) => r.some((c) => /^(Registrant email|Email)$/.test(c.trim())));
  const header = rows[headerIdx].map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  const people = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const get = (name) => (col(name) >= 0 ? r[col(name)] : undefined);
    const email = clean(get('Registrant email') ?? get('Email'))?.toLowerCase();
    if (!email || !email.includes('@')) continue;
    const name = clean(get('Name')) ?? ([clean(get('First name')), clean(get('Last name'))].filter(Boolean).join(' ') || null);
    const attendance = clean(get('Event attendance (Live or lobby)') ?? get('Participation'));
    const minutes = Number(clean(get('Total time spent(Minutes)')));
    people.push({
      email,
      name,
      email_domain: email.split('@')[1],
      registered_at: toIso(get('Registration date') ?? get('Last registration time')),
      attendance,
      minutes_attended: Number.isFinite(minutes) && clean(get('Total time spent(Minutes)')) ? minutes : null,
      first_join_at: toIso(get('First join time')),
      org: clean(get('Organization')),
      title: clean(get('Job title')),
    });
  }
  return {
    people,
    report_generated_at: generated ?? statSync(path).mtime.toISOString(),
    generated_known: Boolean(generated),
  };
}

// ─── Merge exports per session ───────────────────────────────────────────────
const bySession = new Map();
for (const src of SOURCES) {
  if (ONLY_SESSION && src.session !== ONLY_SESSION) continue;
  const { people, report_generated_at } = readExport(src.file);
  const merged = bySession.get(src.session) ?? new Map();
  for (const p of people) {
    const prev = merged.get(p.email);
    const row = { ...p, source_file: src.file, report_generated_at };
    if (!prev) { merged.set(p.email, row); continue; }
    const newer = row.report_generated_at > prev.report_generated_at;
    merged.set(p.email, {
      ...(newer ? row : prev),
      name: (newer ? row.name : prev.name) ?? prev.name ?? row.name,
      org: (newer ? row.org : prev.org) ?? prev.org ?? row.org,
      title: (newer ? row.title : prev.title) ?? prev.title ?? row.title,
      registered_at: [prev.registered_at, row.registered_at].filter(Boolean).sort()[0] ?? null,
      attendance: prev.attendance === 'Attended' || row.attendance === 'Attended'
        ? 'Attended'
        : (newer ? row.attendance : prev.attendance),
      minutes_attended: Math.max(prev.minutes_attended ?? -1, row.minutes_attended ?? -1) >= 0
        ? Math.max(prev.minutes_attended ?? 0, row.minutes_attended ?? 0)
        : null,
      first_join_at: [prev.first_join_at, row.first_join_at].filter(Boolean).sort()[0] ?? null,
    });
  }
  bySession.set(src.session, merged);
}

// ─── What's already there ────────────────────────────────────────────────────
const client = createClient({ url: getEnv('TURSO_DATABASE_URL'), authToken: getEnv('TURSO_AUTH_TOKEN') });
const hasTables = (await client.execute(
  "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'PersonInteractions'",
)).rows.length > 0;
if (!hasTables && !DRY_RUN) {
  console.error('The people tables do not exist yet. Run `pnpm db:migrate` first.');
  process.exit(1);
}

// Everyone the run can match against: people in the database, then people
// this run creates. id → { name, emails: Set, sessions: Set, cards: [], user_id, isNew }
const people = new Map();
const personByEmail = new Map();   // every address on any card, aliases too
const personByUser = new Map();
if (hasTables) {
  for (const r of (await client.execute('SELECT id, name, user_id FROM People')).rows) {
    people.set(String(r.id), { name: r.name ? String(r.name) : null, emails: new Set(), sessions: new Set(), cards: [], user_id: r.user_id ?? null, isNew: false });
    if (r.user_id) personByUser.set(String(r.user_id), String(r.id));
  }
  for (const r of (await client.execute('SELECT id, person_id, card_type, card FROM PersonContactCards')).rows) {
    const p = people.get(String(r.person_id));
    const emails = cardEmails(JSON.parse(String(r.card)));
    p?.cards.push({ card_id: String(r.id), card_type: String(r.card_type), emails });
    for (const e of emails) { personByEmail.set(e, String(r.person_id)); p?.emails.add(e); }
  }
  for (const r of (await client.execute('SELECT person_id, session_slug FROM SessionRegistrations')).rows) {
    people.get(String(r.person_id))?.sessions.add(String(r.session_slug));
  }
}

const sessionStart = new Map(
  (await client.execute('SELECT slug, starts_at FROM Session')).rows.map((r) => [String(r.slug), r.starts_at ? String(r.starts_at) : null]),
);

const userByEmail = new Map();
for (const u of (await client.execute('SELECT id, email, emails FROM User')).rows) {
  let emails = [];
  try { emails = Array.isArray(u.emails) ? u.emails : JSON.parse(String(u.emails ?? '[]')); } catch {}
  for (const e of [u.id, u.email, ...emails]) {
    if (typeof e === 'string' && e.includes('@')) userByEmail.set(e.trim().toLowerCase(), String(u.id));
  }
}

// Decisions made on the review list: email → 'alias:pcc_…' | 'card:prs_…' | 'new'.
const review = existsSync(REVIEW_FILE) ? JSON.parse(readFileSync(REVIEW_FILE, 'utf-8')) : { items: [] };
const decisions = new Map(review.items.filter((it) => it.decision).map((it) => [it.email, it.decision]));

// ─── Fuzzy matching ──────────────────────────────────────────────────────────
const nameTokens = (n) => (n ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
const GENERIC_USERNAMES = new Set(['info', 'hello', 'contact', 'admin', 'team', 'office', 'mail', 'invest', 'investments']);

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/** Why this registrant might be this person, or [] if they don't look alike. */
function fuzzyReasons(r, person) {
  const reasons = [];
  const a = nameTokens(r.name), b = nameTokens(person.name);
  if (a.length && b.length) {
    const [af, al, bf, bl] = [a[0], a.at(-1), b[0], b.at(-1)];
    const firstsAgree = af === bf || (af.length >= 3 && bf.startsWith(af)) || (bf.length >= 3 && af.startsWith(bf))
      || (af.length === 1 && bf.startsWith(af)) || (bf.length === 1 && af.startsWith(bf));
    if (a.join(' ') === b.join(' ')) reasons.push('same name');
    else if (al === bl && al.length > 1 && firstsAgree) reasons.push('same last name, matching first name');
    else if (a.join(' ').length >= 8 && editDistance(a.join(' '), b.join(' ')) <= 2) reasons.push('nearly the same name');
  }
  // A username that's just a first name (jenny@, patrick@) is shared by too
  // many people to mean anything on its own.
  const user = r.email.split('@')[0];
  if (user.length >= 4 && !GENERIC_USERNAMES.has(user) && user !== a[0] && user !== b[0]) {
    for (const e of person.emails) {
      if (e.split('@')[0] === user && e !== r.email) { reasons.push('same email username, other domain'); break; }
    }
  }
  return reasons;
}

// ─── Sort every registrant into definite, new or fuzzy ───────────────────────
const cardFor = (r) => PERSONAL_DOMAINS.has(r.email_domain)
  ? { card_type: 'personal', card: { email: r.email } }
  : { card_type: 'role', card: { email: r.email, org_domain: r.email_domain, ...(r.org && { org: r.org }), ...(r.title && { title: r.title }) } };

const newCards = [];        // { id, person_id, card_type, card, source }
const newAliases = [];      // { card_id, email }
const registrations = [];   // { session, person_id, row }
const held = new Map();     // email → review item
const counts = { definite: 0, viaAccount: 0, created: 0, decided: 0 };

function link(personId, email) {
  personByEmail.set(email, personId);
  people.get(personId).emails.add(email);
}

function addCard(personId, r, source) {
  const c = { id: newId('pcc'), person_id: personId, ...cardFor(r), source };
  newCards.push(c);
  people.get(personId).cards.push({ card_id: c.id, card_type: c.card_type, emails: [r.email] });
  link(personId, r.email);
}

function register(personId, r, session) {
  people.get(personId).sessions.add(session);
  registrations.push({ session, person_id: personId, row: r });
}

function createNew(r, session, userId) {
  const id = newId('prs');
  people.set(id, { name: r.name, emails: new Set(), sessions: new Set(), cards: [], user_id: userId, isNew: true });
  if (userId) personByUser.set(userId, id);
  addCard(id, r, 'zoom-registration');
  register(id, r, session);
}

function applyDecision(decision, r, session, userId) {
  if (decision === 'new') { createNew(r, session, userId); return true; }
  const [how, target] = decision.split(':');
  if (how === 'alias') {
    const owner = [...people].find(([, p]) => p.cards.some((c) => c.card_id === target))?.[0];
    if (!owner) return false;
    newAliases.push({ card_id: target, email: r.email });
    people.get(owner).cards.find((c) => c.card_id === target).emails.push(r.email);
    link(owner, r.email);
    register(owner, r, session);
    return true;
  }
  if (how === 'card' && people.has(target)) {
    addCard(target, r, 'zoom-registration (reviewed)');
    register(target, r, session);
    return true;
  }
  return false;
}

for (const [session, rows] of bySession) {
  for (const r of rows.values()) {
    // A registrant already waiting for review: note the session and move on.
    if (held.has(r.email)) { held.get(r.email).sessions.push(session); continue; }

    const known = personByEmail.get(r.email);
    if (known) { register(known, r, session); counts.definite++; continue; }

    const userId = userByEmail.get(r.email) ?? null;
    const viaUser = userId ? personByUser.get(userId) : undefined;
    if (viaUser) { addCard(viaUser, r, 'zoom-registration'); register(viaUser, r, session); counts.viaAccount++; continue; }

    const decision = decisions.get(r.email);
    if (decision) {
      if (applyDecision(decision, r, session, userId)) { counts.decided++; continue; }
      console.error(`registration-review.json: "${decision}" (for ${r.name ?? 'a registrant'}) doesn't name a known card or person; leaving it listed.`);
    }

    const candidates = [...people]
      .map(([id, p]) => ({ id, p, reasons: fuzzyReasons(r, p) }))
      .filter((c) => c.reasons.length);
    if (candidates.length) {
      held.set(r.email, {
        email: r.email,
        name: r.name,
        sessions: [session],
        candidates: candidates.map(({ id, p, reasons }) => ({
          person_id: id,
          name: p.name,
          sessions: [...p.sessions],
          reasons,
          cards: p.cards,
          ...(p.isNew && { created_by_this_run: true }),
        })),
        decision: decision ?? null,
      });
      continue;
    }

    createNew(r, session, userId);
    counts.created++;
  }
}

// Interactions: when each address was used. Registration time, and the join
// time (else the session's start) for anyone marked Attended.
const asIso = (t) => (t && /^\d{4}-\d{2}-\d{2} \d/.test(t) ? t.replace(' ', 'T') : t);
const interactions = registrations.flatMap(({ session, person_id, row: r }) => [
  ...(r.registered_at ? [{ person_id, email: r.email, kind: 'registration', at: asIso(r.registered_at), ref: `Session:${session}` }] : []),
  ...(r.attendance === 'Attended' && (r.first_join_at || sessionStart.get(session))
    ? [{ person_id, email: r.email, kind: 'attendance', at: asIso(r.first_join_at) ?? sessionStart.get(session), ref: `Session:${session}` }]
    : []),
]);

// ─── Report ──────────────────────────────────────────────────────────────────
console.log(DRY_RUN ? 'DRY RUN: nothing will be written\n' : '');
for (const [session, rows] of bySession) {
  const list = [...rows.values()];
  const attended = list.filter((r) => r.attendance === 'Attended').length;
  const latest = list.map((r) => r.report_generated_at).sort().at(-1);
  console.log(`${session}: ${list.length} registrants, ${attended} marked Attended (latest export ${latest})`);
}
const newPeople = [...people.values()].filter((p) => p.isNew);
console.log(`
definite matches:      ${counts.definite} registrations for people already there
matched via account:   ${counts.viaAccount} (address added as a card)
new people:            ${counts.created} (${newPeople.filter((p) => p.user_id).length} linked to a login account)
applied from review:   ${counts.decided}
held for review:       ${held.size} (nothing written for them)
interactions:          ${interactions.length}`);

const domains = (emails) => [...new Set(emails.map((e) => e.split('@')[1]))].map((d) => `@${d}`).join(', ');
if (held.size) {
  console.log('\nFuzzy matches to work through:');
  for (const it of held.values()) {
    console.log(`\n  ${it.name ?? '(no name)'} @${it.email.split('@')[1]}, registered for ${it.sessions.join(', ')}`);
    for (const c of it.candidates) {
      console.log(`    maybe ${c.person_id}${c.created_by_this_run ? ' (created by this run)' : ''}: ${c.name ?? '(no name)'}, ${c.sessions.length} session(s); ${c.reasons.join(', ')}`);
      for (const card of c.cards) console.log(`      ${card.card_id} ${card.card_type} ${domains(card.emails)}`);
    }
  }
  if (DRY_RUN) console.log('\n(Ids above are made up for the dry run. The real run writes them, and the list, to context-v/extra/registration-review.json.)');
}

if (DRY_RUN) process.exit(0);

// ─── Write ───────────────────────────────────────────────────────────────────
// People and cards in one transaction, so a failure leaves nothing half-made.
const tx = await client.transaction('write');
try {
  for (const [id, p] of people) {
    if (p.isNew) await createPerson(tx, { id, name: p.name, user_id: p.user_id });
  }
  for (const c of newCards) await upsertContactCard(tx, c);
  for (const a of newAliases) await addEmailAlias(tx, a.card_id, a.email);
  await tx.commit();
} catch (err) {
  await tx.rollback();
  throw err;
} finally {
  tx.close();
}
console.log(`\nwrote ${newPeople.length} people, ${newCards.length} cards, ${newAliases.length} aliases`);

// Registrations: upserted, so re-runs and partial runs never duplicate. Two
// addresses of one person registering for the same session keep one row,
// preferring the one marked Attended.
const now = new Date().toISOString();
const perKey = new Map();
for (const reg of registrations) {
  const key = `${reg.session}\u0000${reg.person_id}`;
  const prev = perKey.get(key);
  if (!prev || (reg.row.attendance === 'Attended' && prev.row.attendance !== 'Attended')) perKey.set(key, reg);
}
await client.batch([...perKey.values()].map(({ session, person_id, row: r }) => ({
  sql: `INSERT INTO SessionRegistrations
    (session_slug, person_id, registered_email, registered_at, attendance, minutes_attended,
     first_join_at, source_file, report_generated_at, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (session_slug, person_id) DO UPDATE SET
      registered_email = excluded.registered_email, registered_at = excluded.registered_at,
      attendance = excluded.attendance, minutes_attended = excluded.minutes_attended,
      first_join_at = excluded.first_join_at, source_file = excluded.source_file,
      report_generated_at = excluded.report_generated_at, imported_at = excluded.imported_at`,
  args: [session, person_id, r.email, r.registered_at, r.attendance, r.minutes_attended,
    r.first_join_at, r.source_file, r.report_generated_at, now],
})), 'write');
console.log(`wrote ${perKey.size} registrations`);

// Interactions in one transaction, then each person's sending addresses follow.
const itx = await client.transaction('write');
try {
  await recordInteractions(itx, interactions);
  await itx.commit();
} catch (err) {
  await itx.rollback();
  throw err;
} finally {
  itx.close();
}
console.log(`recorded ${interactions.length} interactions`);

// The review list: what's still undecided, with real ids.
writeFileSync(REVIEW_FILE, JSON.stringify({
  generated_at: now,
  how_to_use: 'Set each decision to "alias:<card_id>" (same role, another address), "card:<person_id>" (same person, another context) or "new", then run `pnpm ingest:registrations` again.',
  items: [...held.values()],
}, null, 2) + '\n');
console.log(`${held.size} fuzzy matches listed in context-v/extra/registration-review.json`);
