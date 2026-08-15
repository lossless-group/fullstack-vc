// Resolve the display / sort date for a changelog or release entry.
//
// WHY THIS EXISTS
// ---------------
// The tree-wide frontmatter standard renames the legacy `date:` key to the
// editorial pair `date_authored_initial_draft:` / `date_authored_current_draft:`.
// This site could not take that rename directly: `date` was a *required*
// z.coerce.date() on the changelog collection and every renderer read
// `entry.data.date` bare, so dropping the key failed the build outright rather
// than degrading. See:
//   ai-labs/context-vigilance-kit/context-v/handoffs/Frontmatter-Normalization-Remaining-Repos.md
//
// Rather than keep the exception forever, the schema now accepts every spelling
// (all optional) and every renderer resolves through this one function. An entry
// validates and renders whether it carries the legacy key, the editorial keys,
// both, or — via the id fallback — neither.
//
// PRECEDENCE, AND WHY LEGACY WINS
// -------------------------------
// `date` is checked FIRST, ahead of the newer editorial keys. That is deliberate
// and is not a preference for the old standard:
//
//   - It makes this change provably zero-diff for existing content. All 27
//     entries currently carry both keys with identical values, so no rendered
//     date can move.
//   - Curated `date` values were authored by hand. Editorial keys added by a
//     bulk sweep may be `stat`-derived, and filesystem birthtimes in this tree
//     are known to lie — whole directories report the date of a bulk copy
//     rather than of authorship (trap 2 in the handoff). When the two disagree,
//     the hand-authored value is the more trustworthy one.
//
// Once `date` is dropped from a file, the editorial keys take over with no
// further code change. That is the migration path: this ordering is what makes
// dropping the key a safe, file-at-a-time operation instead of a flag day.

import type { DateInput } from './format-date';

/** Frontmatter is `.passthrough()`d, so callers hold a loose bag of keys. */
export type EntryData = Record<string, any>;

/**
 * Date keys accepted for a changelog entry, in precedence order.
 * First key present with a parseable value wins.
 */
const DATE_KEYS = [
  'date',                          // legacy; canonical here until dropped per-file
  'date_authored_initial_draft',   // editorial standard — the ship date
  'date_created',
  'date_posted',
  'date_authored_current_draft',   // a revision date, so below the initial draft
  'date_modified',
  'date_scheduled',
] as const;

function toDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Last-resort date: entry ids in this collection are `YYYY-MM-DD_NN`, so the
 * filename itself carries the ship date. Per the frontmatter spec, a date in
 * the filename outranks `stat` — this keeps a file with no date frontmatter at
 * all sorting correctly instead of falling to the epoch.
 */
export function dateFromId(id: string | undefined): Date | null {
  if (!id) return null;
  const match = id.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return toDate(`${match[1]}-${match[2]}-${match[3]}`);
}

/**
 * The entry's date, resolved through the full fallback chain.
 * Returns null only when no key parses and the id carries no date — callers
 * should render the date line conditionally rather than printing a bogus one.
 */
export function resolveEntryDate(data: EntryData, id?: string): Date | null {
  for (const key of DATE_KEYS) {
    const d = toDate(data?.[key]);
    if (d) return d;
  }
  return dateFromId(id);
}

/**
 * Sort key. Undated entries return 0 so they sink to the bottom of a
 * newest-first sort rather than throwing on `.getTime()` of undefined —
 * which is precisely how the un-guarded `b.data.date.getTime()` used to fail.
 */
export function entryDateMs(data: EntryData, id?: string): number {
  return resolveEntryDate(data, id)?.getTime() ?? 0;
}

/** Convenience: the resolved date as a `formatDate`-compatible input. */
export function entryDateInput(data: EntryData, id?: string): DateInput {
  return resolveEntryDate(data, id);
}
