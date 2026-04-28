// src/lib/poll-templates.ts — pure helpers for poll vote validation + aggregation.
//
// No DB access. No I/O. Safe to import from API routes, sync scripts, and tests.
// Each shipping template (boolean, single-select, multi-select, sliding-scale)
// has a vote-payload validator and an aggregator. Adding a new template means
// adding cases here + a new <PollQuestionTemplate__*> Svelte component.
//
// See: context-v/blueprints/Maintain-an-Interactive-Polling-System--v2.md
//      §5.3 Vote, §7 Templates, §13.1 Integrity contract

export type PollTemplate = 'boolean' | 'single-select' | 'multi-select' | 'sliding-scale';

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
}

// ─── Vote payload shapes (per template) ────────────────────────────────────
export interface BooleanVotePayload      { value: boolean; }
export interface SingleSelectVotePayload { option_ids: [string]; }
export interface MultiSelectVotePayload  { option_ids: string[]; }
export interface SlidingScaleVotePayload { value: number; }

export type ValidatedVote =
  | { template: 'boolean';        payload: BooleanVotePayload }
  | { template: 'single-select';  payload: SingleSelectVotePayload }
  | { template: 'multi-select';   payload: MultiSelectVotePayload }
  | { template: 'sliding-scale';  payload: SlidingScaleVotePayload };

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
  options: PollOption[] | SlidingScaleConfig | null;
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
  | { value: number };                     // sliding-scale

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
      const opts = options as PollOption[] | null | undefined;
      if (!Array.isArray(opts) || !opts.some(o => o.id === r.option_ids![0])) {
        return { ok: false, error: 'single-select: option_ids[0] does not match any known option' };
      }
      return { ok: true, value: { template: 'single-select', payload: { option_ids: [r.option_ids[0]] as [string] } } };
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
      return { ok: true, value: { template: 'sliding-scale', payload: { value: r.value } } };
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
  votes: Array<{ option_ids?: unknown; value?: unknown }>;
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

      const histogram: Record<string, number> = {};
      for (let i = min; i <= max; i += step) histogram[String(i)] = 0;

      const numericValues: number[] = [];
      for (const v of votes) {
        if (typeof v.value === 'number' && Number.isFinite(v.value) && v.value >= min && v.value <= max) {
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

    default:
      return { tallies: {}, total_votes: 0 };
  }
}
