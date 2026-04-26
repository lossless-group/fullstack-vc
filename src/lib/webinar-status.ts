// Derive a webinar's status from its scheduled time, not from frontmatter.
// Authors only set `date_scheduled` (and optionally `durationMinutes`); the UI
// computes whether it's Upcoming / Live / Recorded at render time.

export type WebinarStatus = 'Upcoming' | 'Live' | 'Recorded';

export interface InferStatusInput {
  date_scheduled: Date;
  durationMinutes?: number;
  /** Override "now" — useful for snapshot tests. Defaults to current time. */
  now?: Date;
}

const DEFAULT_DURATION_MINUTES = 60;

export function inferWebinarStatus(input: InferStatusInput): WebinarStatus {
  const now = (input.now ?? new Date()).getTime();
  const start = input.date_scheduled.getTime();
  const duration = (input.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60_000;
  const end = start + duration;

  if (now < start) return 'Upcoming';
  if (now >= start && now < end) return 'Live';
  return 'Recorded';
}
