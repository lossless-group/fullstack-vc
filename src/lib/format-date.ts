// Common date formatter for human-readable output across the site.
//
// Accepts a Date object, an ISO date string ('2026-04-26'), or a full ISO
// timestamp ('2026-04-26T12:30:00Z'). Returns the date rendered in one of a
// small set of named styles. UTC is used so a date like '2026-04-26' (which
// JS parses as UTC midnight) does not shift to '2026-04-25' for readers in
// negative-offset timezones — that ambiguity has bitten the site before.
//
// To add a new style, extend the DateStyle union + add a case. Keep the set
// small; Markdown frontmatter dates only need a handful of presentations.

export type DateStyle =
  | 'long'              // April 26, 2026                — default for body prose, articles, chapters
  | 'medium'            // Apr 26, 2026                  — chip/meta rows where space matters
  | 'short'             // Apr. 26, 2026                 — same as medium but with a period after the abbrev
  | 'iso'               // 2026-04-26                    — passthrough; for technical contexts and <time datetime="…">
  | 'reverse-medium'    // 2026, Apr. 26                 — year-first variant the user prefers in some contexts
  | 'year-only';        // 2026                          — for mastheads / "Updated 2024" lines

export type DateInput = Date | string | null | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** Always returns YYYY-MM-DD in UTC. Use for <time datetime="…"> attributes. */
export function toIsoDate(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Format a date in one of the named styles. Returns '' for null/invalid input. */
export function formatDate(input: DateInput, style: DateStyle = 'long'): string {
  const d = toDate(input);
  if (!d) return '';

  const opts = (month: 'long' | 'short'): Intl.DateTimeFormatOptions => ({
    year: 'numeric',
    month,
    day: 'numeric',
    timeZone: 'UTC',
  });

  switch (style) {
    case 'long':
      // April 26, 2026
      return d.toLocaleDateString('en-US', opts('long'));

    case 'medium':
      // Apr 26, 2026
      return d.toLocaleDateString('en-US', opts('short'));

    case 'short': {
      // Apr. 26, 2026 — Intl doesn't add the trailing period, so format manually
      const monthShort = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      return `${monthShort}. ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    }

    case 'iso':
      return d.toISOString().slice(0, 10);

    case 'reverse-medium': {
      // 2026, Apr. 26
      const monthShort = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      return `${d.getUTCFullYear()}, ${monthShort}. ${d.getUTCDate()}`;
    }

    case 'year-only':
      return String(d.getUTCFullYear());
  }
}
