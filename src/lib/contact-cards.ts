// People, their contact cards and their interactions: the shapes, and the one
// place they're written.
//
// Spec: context-v/specs/People-and-Contact-Cards-for-Session-Registrations.md
// Tables: db/migrations/001_people-and-contact-cards.sql
//
// A card's fields live in JSON so they can grow without a migration. The
// schemas below name the standard fields so they're always written the same
// way; anything else passes through untouched.
//
// Copies kept in step here, and only here:
//   - a card's `email` is the address we send to: the most recently used of
//     its email and email_aliases (from PersonInteractions), unless the card
//     sets email_pinned;
//   - People.email / .org / .title copy the person's primary card.
// recomputePerson() does both, and every write below ends with it. Pass a
// transaction (client.transaction('write')) when several writes belong
// together. `pnpm db:audit-people` checks nothing has written around this.
//
// Works with any @libsql/client Client or Transaction, so scripts and server
// routes share it.
import { z } from 'astro/zod';
import type { InStatement, ResultSet } from '@libsql/client';

export interface Executor {
  execute(stmt: InStatement): Promise<ResultSet>;
}

// ─── Dates ───────────────────────────────────────────────────────────────────
// ISO 8601 at whatever precision we know: YYYY, YYYY-MM or YYYY-MM-DD. The
// compact YYYYMM and YYYYMMDD are accepted and expanded, since YYYYMM alone
// isn't valid ISO 8601. Expanded dates of mixed precision still sort as text.
export function normalizePartialDate(input: string): string {
  const s = input.trim();
  const m = s.match(/^(\d{4})(?:-?(\d{2})(?:-?(\d{2}))?)?$/);
  if (!m) throw new Error(`Not a YYYY, YYYY-MM or YYYY-MM-DD date: "${input}"`);
  const [, y, mo, d] = m;
  if (mo && (+mo < 1 || +mo > 12)) throw new Error(`Month out of range: "${input}"`);
  if (d && (+d < 1 || +d > 31)) throw new Error(`Day out of range: "${input}"`);
  return [y, mo, d].filter(Boolean).join('-');
}

const PartialDate = z.string().transform((s, ctx) => {
  try {
    return normalizePartialDate(s);
  } catch (err) {
    ctx.addIssue({ code: 'custom', message: (err as Error).message });
    return z.NEVER;
  }
});

export const Timeframe = z.object({
  start: PartialDate.optional(),
  /** Omit while the role is current. */
  end: PartialDate.optional(),
  /** True when inferred (from LinkedIn, say) rather than known. */
  estimated: z.boolean().optional(),
});
export type Timeframe = z.infer<typeof Timeframe>;

// ─── Card fields ─────────────────────────────────────────────────────────────
const Email = z.string().trim().toLowerCase().pipe(z.email());
const Link = z.url({ protocol: /^https$/ });

const EmailFields = {
  /** The address we send to. Kept as the most recently used, unless pinned. */
  email: Email.optional(),
  /** Other addresses that reach this person in this context (another domain
   *  of the same firm, an old address). Recognized on the way in, never sent to. */
  email_aliases: z.array(Email).optional(),
  /** Keeps `email` as set by hand, whatever is used later. */
  email_pinned: z.boolean().optional(),
};

/** One role at one organization. */
export const RoleCard = z.looseObject({
  org: z.string().optional(),
  /** The organization's domain, e.g. proseventures.com. */
  org_domain: z.string().trim().toLowerCase().optional(),
  title: z.string().optional(),
  ...EmailFields,
  /** The person's page on the organization's site. */
  site_link: Link.optional(),
  bio: z.string().optional(),
  /** Makes this the person's primary card, overriding the default. */
  primary: z.boolean().optional(),
});

/** Not tied to a role: Gmail and other personal addresses. */
export const PersonalCard = z.looseObject({
  ...EmailFields,
  phone: z.string().optional(),
  location: z.string().optional(),
  primary: z.boolean().optional(),
});

/** The usual social links. One active socials card per person. */
export const SocialsCard = z.looseObject({
  linkedin: Link.optional(),
  github: Link.optional(),
  x: Link.optional(),
  bluesky: z.string().optional(),
  site: Link.optional(),
});

export const CARD_SCHEMAS = { role: RoleCard, personal: PersonalCard, socials: SocialsCard } as const;
export type CardType = keyof typeof CARD_SCHEMAS;

/** Every address on a card: the sending one first, then the aliases. */
export function cardEmails(card: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof card.email === 'string') out.push(card.email);
  for (const a of (card.email_aliases as string[] | undefined) ?? []) if (!out.includes(a)) out.push(a);
  return out;
}

// ─── Ids ─────────────────────────────────────────────────────────────────────
export function newId(prefix: 'prs' | 'pcc'): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

// ─── Primary card ────────────────────────────────────────────────────────────
interface StoredCard {
  card_type: CardType;
  active: boolean;
  timeframe: Timeframe | null;
  card: Record<string, unknown>;
  created_at: string;
}

/**
 * The card the person is known by: the one marked primary; else the active
 * role card that started most recently; else the active personal card.
 * Recency of use picks the address within a card, never between cards, so
 * professional mail goes to the role unless a personal card is marked primary.
 */
export function pickPrimaryCard<T extends StoredCard>(cards: T[]): T | null {
  const marked = cards.find((c) => c.card.primary === true);
  if (marked) return marked;
  const roles = cards
    .filter((c) => c.active && c.card_type === 'role')
    .sort((a, b) =>
      (b.timeframe?.start ?? '').localeCompare(a.timeframe?.start ?? '') ||
      b.created_at.localeCompare(a.created_at));
  if (roles[0]) return roles[0];
  return cards.find((c) => c.active && c.card_type === 'personal') ?? null;
}

/** What People.email / .org / .title should hold, given a person's cards. */
export function derivedPersonFields(cards: StoredCard[]) {
  const primary = pickPrimaryCard(cards);
  const role = primary?.card_type === 'role' ? primary : pickPrimaryCard(cards.filter((c) => c.card_type === 'role'));
  return {
    email: (primary?.card.email as string | undefined) ?? null,
    // A card imported from a registration may only know the domain.
    org: (role?.card.org as string | undefined) ?? (role?.card.org_domain as string | undefined) ?? null,
    title: (role?.card.title as string | undefined) ?? null,
  };
}

/**
 * The card's fields with `email` set to its most recently used address (the
 * rest become aliases). Unchanged when pinned, or when nothing has been used.
 */
export function withMostRecentEmail(card: Record<string, unknown>, lastUsed: Map<string, string>): Record<string, unknown> {
  const emails = cardEmails(card);
  if (card.email_pinned === true || emails.length < 2) return card;
  const latest = [...emails].sort((a, b) => (lastUsed.get(b) ?? '').localeCompare(lastUsed.get(a) ?? ''))[0];
  if (!lastUsed.has(latest) || latest === card.email) return card;
  const { email_aliases: _, ...rest } = card;
  return { ...rest, email: latest, email_aliases: emails.filter((e) => e !== latest) };
}

// ─── Reads ───────────────────────────────────────────────────────────────────
export async function loadCards(db: Executor, personId: string): Promise<(StoredCard & { id: string })[]> {
  const res = await db.execute({
    sql: 'SELECT id, card_type, active, timeframe, card, created_at FROM PersonContactCards WHERE person_id = ?',
    args: [personId],
  });
  return res.rows.map((r) => ({
    id: String(r.id),
    card_type: r.card_type as CardType,
    active: Number(r.active) === 1,
    timeframe: r.timeframe ? JSON.parse(String(r.timeframe)) : null,
    card: JSON.parse(String(r.card)),
    created_at: String(r.created_at),
  }));
}

/** The person who has this address on any card, as `email` or an alias; or null. */
export async function findPersonIdByEmail(db: Executor, email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  const res = await db.execute({
    sql: `SELECT person_id FROM PersonContactCards
          WHERE json_extract(card, '$.email') = ?
             OR EXISTS (SELECT 1 FROM json_each(card, '$.email_aliases') WHERE value = ?)
          LIMIT 1`,
    args: [e, e],
  });
  return res.rows[0] ? String(res.rows[0].person_id) : null;
}

// ─── Writes ──────────────────────────────────────────────────────────────────
export async function createPerson(db: Executor, input: { name?: string | null; id?: string; user_id?: string | null }): Promise<string> {
  const id = input.id ?? newId('prs');
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO People (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, input.name ?? null, input.user_id ?? null, now, now],
  });
  return id;
}

/**
 * Brings a person's copies up to date: each card's sending address becomes
 * its most recently used one (unless pinned), then People.email / .org /
 * .title are rewritten from the primary card.
 */
export async function recomputePerson(db: Executor, personId: string): Promise<void> {
  const lastUsed = new Map<string, string>();
  for (const r of (await db.execute({
    sql: 'SELECT email, MAX(at) AS at FROM PersonInteractions WHERE person_id = ? AND email IS NOT NULL GROUP BY email',
    args: [personId],
  })).rows) lastUsed.set(String(r.email), String(r.at));

  const cards = await loadCards(db, personId);
  for (const c of cards) {
    const next = withMostRecentEmail(c.card, lastUsed);
    if (next === c.card) continue;
    c.card = next;
    await db.execute({
      sql: 'UPDATE PersonContactCards SET card = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(next), new Date().toISOString(), c.id],
    });
  }

  const fields = derivedPersonFields(cards);
  await db.execute({
    sql: 'UPDATE People SET email = ?, org = ?, title = ?, updated_at = ? WHERE id = ?',
    args: [fields.email, fields.org, fields.title, new Date().toISOString(), personId],
  });
}

export interface ContactCardInput {
  /** Set to update an existing card; omit to add one. */
  id?: string;
  person_id: string;
  card_type: CardType;
  active?: boolean;
  timeframe?: Partial<Record<keyof Timeframe, unknown>> | null;
  card: Record<string, unknown>;
  source: string;
}

/**
 * The only way to write a card. Validates the fields against the card type,
 * refuses an address that already belongs to someone else (the unique index
 * covers `email`; aliases are checked here), writes the card, then
 * recomputes the person. Returns the card's id.
 */
export async function upsertContactCard(db: Executor, input: ContactCardInput): Promise<string> {
  const card = CARD_SCHEMAS[input.card_type].parse(input.card) as Record<string, unknown>;
  const timeframe = input.timeframe ? Timeframe.parse(input.timeframe) : null;
  for (const e of cardEmails(card)) {
    const owner = await findPersonIdByEmail(db, e);
    if (owner && owner !== input.person_id) throw new Error(`${e} already belongs to ${owner}`);
  }
  const now = new Date().toISOString();
  const id = input.id ?? newId('pcc');
  await db.execute({
    sql: `INSERT INTO PersonContactCards
            (id, person_id, card_type, active, timeframe, card, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO UPDATE SET
            card_type = excluded.card_type, active = excluded.active, timeframe = excluded.timeframe,
            card = excluded.card, source = excluded.source, updated_at = excluded.updated_at`,
    args: [id, input.person_id, input.card_type, input.active === false ? 0 : 1,
      timeframe ? JSON.stringify(timeframe) : null, JSON.stringify(card), input.source, now, now],
  });
  await recomputePerson(db, input.person_id);
  return id;
}

/** Adds an address to an existing card as an alias (another domain of the same firm, say). */
export async function addEmailAlias(db: Executor, cardId: string, email: string): Promise<void> {
  const row = (await db.execute({
    sql: 'SELECT person_id, card_type, active, timeframe, card, source FROM PersonContactCards WHERE id = ?',
    args: [cardId],
  })).rows[0];
  if (!row) throw new Error(`No card ${cardId}`);
  const card = JSON.parse(String(row.card));
  const e = email.trim().toLowerCase();
  if (cardEmails(card).includes(e)) return;
  await upsertContactCard(db, {
    id: cardId,
    person_id: String(row.person_id),
    card_type: row.card_type as CardType,
    active: Number(row.active) === 1,
    timeframe: row.timeframe ? JSON.parse(String(row.timeframe)) : null,
    card: { ...card, email_aliases: [...(card.email_aliases ?? []), e] },
    source: String(row.source),
  });
}

export interface InteractionInput {
  person_id: string;
  /** The address they used, when there was one. */
  email?: string | null;
  /** registration, attendance, login, … */
  kind: string;
  /** When it happened, ISO 8601. */
  at: string;
  /** The source row, e.g. 'Session:<slug>' or 'AuthEvent:<id>'. Re-recording updates it. */
  ref: string;
}

/**
 * Records interactions, then recomputes each person touched once, so their
 * cards' sending addresses follow what they used last.
 */
export async function recordInteractions(db: Executor, items: InteractionInput[]): Promise<void> {
  const now = new Date().toISOString();
  for (const it of items) {
    await db.execute({
      sql: `INSERT INTO PersonInteractions (person_id, email, kind, at, ref, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (kind, ref, email) DO UPDATE SET person_id = excluded.person_id, at = excluded.at`,
      args: [it.person_id, it.email?.trim().toLowerCase() ?? null, it.kind, it.at, it.ref, now],
    });
  }
  for (const personId of new Set(items.map((it) => it.person_id))) await recomputePerson(db, personId);
}

/**
 * Folds `mergeId` into `keepId`: moves its cards, interactions and session
 * registrations, links its account and profile if `keepId` has none,
 * recomputes, deletes the emptied person. A registration both people hold
 * for the same session keeps `keepId`'s row. Run inside a transaction.
 */
export async function mergePeople(db: Executor, keepId: string, mergeId: string) {
  const merged = (await db.execute({ sql: 'SELECT user_id, handle FROM People WHERE id = ?', args: [mergeId] })).rows[0];
  if (!merged) throw new Error(`No person ${mergeId}`);
  const cards = await db.execute({ sql: 'UPDATE PersonContactCards SET person_id = ? WHERE person_id = ?', args: [keepId, mergeId] });
  await db.execute({ sql: 'UPDATE PersonInteractions SET person_id = ? WHERE person_id = ?', args: [keepId, mergeId] });
  await db.execute({
    sql: `DELETE FROM SessionRegistrations WHERE person_id = ?
            AND session_slug IN (SELECT session_slug FROM SessionRegistrations WHERE person_id = ?)`,
    args: [mergeId, keepId],
  });
  const regs = await db.execute({ sql: 'UPDATE SessionRegistrations SET person_id = ? WHERE person_id = ?', args: [keepId, mergeId] });
  await db.execute({ sql: 'DELETE FROM People WHERE id = ?', args: [mergeId] });
  await db.execute({
    sql: 'UPDATE People SET user_id = COALESCE(user_id, ?), handle = COALESCE(handle, ?) WHERE id = ?',
    args: [merged.user_id ?? null, merged.handle ?? null, keepId],
  });
  await recomputePerson(db, keepId);
  return { cardsMoved: cards.rowsAffected, registrationsMoved: regs.rowsAffected };
}
