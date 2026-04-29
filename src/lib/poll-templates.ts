// src/lib/poll-templates.ts — pure helpers for poll vote validation + aggregation.
//
// No DB access. No I/O. Safe to import from API routes, sync scripts, and tests.
// Each shipping template (boolean, single-select, multi-select, sliding-scale)
// has a vote-payload validator and an aggregator. Adding a new template means
// adding cases here + a new <PollQuestionTemplate__*> Svelte component.
//
// See: context-v/blueprints/Maintain-an-Interactive-Polling-System--v2.md
//      §5.3 Vote, §7 Templates, §13.1 Integrity contract

export type PollTemplate = 'boolean' | 'single-select' | 'multi-select' | 'sliding-scale' | 'multi-string-input';

export interface PollOption {
  id: string;
  label: string;
  description?: string;
  image?: string;
}

export interface SlidingScaleConfig {
  min: number;
  max: number;
  step?: number;
  default_value?: number;
  labels?: { min?: string; mid?: string; max?: string };
  show_distribution?: boolean;
  /**
   * Values disallowed within [min..max]. Use to force a polarized choice
   * (e.g., exclude: [0] for a -3..+3 scale where neutral isn't allowed).
   * Voters can drag the slider through these values, but submit is gated
   * client-side and rejected server-side. Histogram skips these buckets.
   */
  exclude?: number[];
}

/**
 * Authoring config for `multi-string-input` polls (blueprint v2 §16.2).
 * Stored on `Poll.options` as a JSON object (NOT an array — the column carries
 * either an option list or a config object depending on template).
 */
export interface MultiStringInputConfig {
  placeholder?: string;
  /** Per-entry char cap. Default 200. */
  max_string_length?: number;
  /** Soft cap on entries per voter. UI hint; server enforces if set. */
  max_strings_per_voter?: number;
  moderate?: 'auto' | 'host' | 'off';
}

// ─── Vote payload shapes (per template) ────────────────────────────────────
export interface BooleanVotePayload          { value: boolean; }
export interface SingleSelectVotePayload     { option_ids: [string]; }
export interface MultiSelectVotePayload      { option_ids: string[]; }
export interface SlidingScaleVotePayload     { value: number; }
export interface MultiStringInputVotePayload { values: string[]; }

export type ValidatedVote =
  | { template: 'boolean';            payload: BooleanVotePayload }
  | { template: 'single-select';      payload: SingleSelectVotePayload }
  | { template: 'multi-select';       payload: MultiSelectVotePayload }
  | { template: 'sliding-scale';      payload: SlidingScaleVotePayload }
  | { template: 'multi-string-input'; payload: MultiStringInputVotePayload };

export type ValidationResult<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string };

// ─── Snapshot (UI contract) ────────────────────────────────────────────────
// Shape passed from the Astro page → <PollEmbed /> → template components.
// Astro page server-renders the initial snapshot from `astro:db`; the
// orchestrator merges live updates from /api/polls/[id]/results.json.
export interface PollSnapshot {
  // — Static metadata (set once at SSR; never refreshed) —
  poll_id: string;
  title: string;
  prompt: string;
  template: PollTemplate;
  options: PollOption[] | SlidingScaleConfig | MultiStringInputConfig | null;
  allow_revote: boolean;
  results_visibility: 'live' | 'on-close' | 'host-only';
  anonymous_display: boolean;

  // — Live-updating fields (refreshed via interval polling) —
  status: 'draft' | 'scheduled' | 'open' | 'closed';
  total_votes: number;
  total_votes_visible: boolean;
  tallies: unknown | null;
  last_aggregated_at: string | null;
}

// Wire-format payload that the templates emit and the orchestrator POSTs
// to /api/polls/[id]/votes. The server re-validates with validateVotePayload().
export type VoteSubmissionPayload =
  | { value: boolean }                     // boolean
  | { option_ids: [string] | string[] }    // single-select / multi-select
  | { value: number }                      // sliding-scale
  | { values: string[] };                  // multi-string-input

// ─── Validator ──────────────────────────────────────────────────────────────
// Validates a raw POST body against the poll's template + options.
// Returns the canonicalized payload (e.g. trims, coerces) or an error message.
export function validateVotePayload(
  template: string,
  options: unknown,
  raw: unknown,
): ValidationResult<ValidatedVote> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'payload must be a JSON object' };
  }
  const r = raw as Record<string, unknown>;

  switch (template) {
    case 'boolean': {
      if (typeof r.value !== 'boolean') {
        return { ok: false, error: 'boolean: value must be true or false' };
      }
      return { ok: true, value: { template: 'boolean', payload: { value: r.value } } };
    }

    case 'single-select': {
      if (!Array.isArray(r.option_ids) || r.option_ids.length !== 1 || typeof r.option_ids[0] !== 'string') {
        return { ok: false, error: 'single-select: option_ids must be a length-1 string array' };
      }
      const optionId = r.option_ids[0] as string;
      const opts = options as PollOption[] | null | undefined;
      if (!Array.isArray(opts) || !opts.some(o => o.id === optionId)) {
        return { ok: false, error: 'single-select: option_ids[0] does not match any known option' };
      }
      return { ok: true, value: { template: 'single-select', payload: { option_ids: [optionId] as [string] } } };
    }

    case 'multi-select': {
      if (!Array.isArray(r.option_ids) || r.option_ids.length < 1) {
        return { ok: false, error: 'multi-select: option_ids must be a non-empty string array' };
      }
      if (!r.option_ids.every(id => typeof id === 'string')) {
        return { ok: false, error: 'multi-select: option_ids entries must all be strings' };
      }
      const opts = options as PollOption[] | null | undefined;
      if (!Array.isArray(opts)) {
        return { ok: false, error: 'multi-select: poll has no options configured' };
      }
      const known = new Set(opts.map(o => o.id));
      for (const id of r.option_ids as string[]) {
        if (!known.has(id)) {
          return { ok: false, error: `multi-select: unknown option_id "${id}"` };
        }
      }
      // Dedupe to be safe.
      const unique = Array.from(new Set(r.option_ids as string[]));
      return { ok: true, value: { template: 'multi-select', payload: { option_ids: unique } } };
    }

    case 'sliding-scale': {
      if (typeof r.value !== 'number' || !Number.isFinite(r.value)) {
        return { ok: false, error: 'sliding-scale: value must be a finite number' };
      }
      const cfg = options as SlidingScaleConfig | null | undefined;
      if (!cfg || typeof cfg.min !== 'number' || typeof cfg.max !== 'number') {
        return { ok: false, error: 'sliding-scale: poll missing min/max in options' };
      }
      if (r.value < cfg.min || r.value > cfg.max) {
        return { ok: false, error: `sliding-scale: value out of range [${cfg.min}, ${cfg.max}]` };
      }
      if (Array.isArray(cfg.exclude) && cfg.exclude.includes(r.value)) {
        return { ok: false, error: `sliding-scale: value ${r.value} is not allowed; pick a side` };
      }
      return { ok: true, value: { template: 'sliding-scale', payload: { value: r.value } } };
    }

    case 'multi-string-input': {
      // Empty array is valid — "I have nothing to share" is real data (§16.2).
      if (!Array.isArray(r.values)) {
        return { ok: false, error: 'multi-string-input: values must be a string array' };
      }
      if (!r.values.every(s => typeof s === 'string')) {
        return { ok: false, error: 'multi-string-input: values entries must all be strings' };
      }
      const cfg = (options as MultiStringInputConfig | null) ?? {};
      const maxLen = cfg.max_string_length ?? 200;
      const maxStrings = cfg.max_strings_per_voter;

      // Trim whitespace, drop empty entries, cap each to max_string_length,
      // dedupe within this voter's submission by lower(trim).
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const raw of r.values as string[]) {
        const trimmed = raw.trim().slice(0, maxLen);
        if (trimmed.length === 0) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleaned.push(trimmed);
      }
      if (typeof maxStrings === 'number' && cleaned.length > maxStrings) {
        return {
          ok: false,
          error: `multi-string-input: too many entries (max ${maxStrings})`,
        };
      }
      return {
        ok: true,
        value: { template: 'multi-string-input', payload: { values: cleaned } },
      };
    }

    default:
      return { ok: false, error: `unknown template: ${template}` };
  }
}

// ─── Aggregator ────────────────────────────────────────────────────────────
// Reduces an array of Vote rows into the PollResult.tallies + total_votes
// shape per template. Pure function — used by the votes endpoint after every
// write and by the sync script for final aggregation before archival.

export interface AggregateInput {
  template: string;
  options: unknown;
  votes: Array<{
    option_ids?: unknown;
    value?: unknown;
    /** Typed JSON for matrix / area-board / multi-string-input templates (§5.3). */
    response?: unknown;
    user_id?: string;
  }>;
}

export interface AggregateResult {
  tallies: unknown;
  total_votes: number;
}

export function aggregateVotes({ template, options, votes }: AggregateInput): AggregateResult {
  switch (template) {
    case 'boolean': {
      let trueCount = 0, falseCount = 0;
      for (const v of votes) {
        if (v.value === true) trueCount++;
        else if (v.value === false) falseCount++;
      }
      const total = trueCount + falseCount;
      return {
        tallies: { true: trueCount, false: falseCount },
        total_votes: total,
      };
    }

    case 'single-select':
    case 'multi-select': {
      const tallies: Record<string, number> = {};
      const opts = options as PollOption[] | null | undefined;
      if (Array.isArray(opts)) {
        for (const o of opts) tallies[o.id] = 0;
      }
      let respondents = 0;
      for (const v of votes) {
        if (Array.isArray(v.option_ids) && v.option_ids.length > 0) {
          respondents++;
          for (const id of v.option_ids) {
            if (typeof id === 'string') {
              tallies[id] = (tallies[id] ?? 0) + 1;
            }
          }
        }
      }
      // Denominator semantics: respondents (not total selections). See §7.3.
      return { tallies, total_votes: respondents };
    }

    case 'sliding-scale': {
      const cfg = options as SlidingScaleConfig | null | undefined;
      const min = cfg?.min ?? 0;
      const max = cfg?.max ?? 10;
      const step = cfg?.step ?? 1;
      const excluded = new Set<number>(Array.isArray(cfg?.exclude) ? cfg!.exclude : []);

      const histogram: Record<string, number> = {};
      for (let i = min; i <= max; i += step) {
        if (excluded.has(i)) continue;
        histogram[String(i)] = 0;
      }

      const numericValues: number[] = [];
      for (const v of votes) {
        if (
          typeof v.value === 'number' &&
          Number.isFinite(v.value) &&
          v.value >= min && v.value <= max &&
          !excluded.has(v.value)
        ) {
          numericValues.push(v.value);
          const bucket = Math.round((v.value - min) / step) * step + min;
          const key = String(bucket);
          histogram[key] = (histogram[key] ?? 0) + 1;
        }
      }

      numericValues.sort((a, b) => a - b);
      const n = numericValues.length;
      const median = n === 0 ? null : numericValues[Math.floor(n / 2)];
      const q1 = n === 0 ? null : numericValues[Math.floor(n * 0.25)];
      const q3 = n === 0 ? null : numericValues[Math.floor(n * 0.75)];

      return {
        tallies: {
          histogram,
          median,
          iqr: q1 !== null && q3 !== null ? [q1, q3] : null,
        },
        total_votes: n,
      };
    }

    case 'multi-string-input': {
      // Reduce to (1) two scalars that are public during the live phase and
      // (2) a deduped entry list that is gated by results_visibility at the
      // API layer (see results.json route). The aggregator always computes
      // all three; the API decides what to expose.
      let total_strings = 0;
      let total_contributors = 0;
      const buckets = new Map<string, { text: string; count: number }>();
      for (const v of votes) {
        const r = (v.response ?? null) as { values?: unknown } | null;
        const values = Array.isArray(r?.values) ? r!.values : [];
        let hadString = false;
        for (const raw of values) {
          if (typeof raw !== 'string') continue;
          const trimmed = raw.trim();
          if (trimmed.length === 0) continue;
          total_strings++;
          hadString = true;
          const key = trimmed.toLowerCase();
          const existing = buckets.get(key);
          if (existing) existing.count++;
          else buckets.set(key, { text: trimmed, count: 1 });
        }
        if (hadString) total_contributors++;
      }
      const entries = Array.from(buckets.values()).sort(
        (a, b) => b.count - a.count || a.text.localeCompare(b.text)
      );
      return {
        tallies: { total_strings, total_contributors, entries },
        // For UI consistency with other templates: total_votes = contributors,
        // not raw row count. Empty submissions don't count as "responses."
        total_votes: total_contributors,
      };
    }

    default:
      return { tallies: {}, total_votes: 0 };
  }
}
