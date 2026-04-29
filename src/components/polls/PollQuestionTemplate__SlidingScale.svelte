<script lang="ts">
  // PollQuestionTemplate__SlidingScale.svelte — numeric slider with bounds + step.
  //
  // Display:
  //   - Range slider with min/max labels under the track.
  //   - Submit button.
  //   - Histogram with median line and (optional) IQR bracket after vote.
  //
  // See: blueprint v2 §7.5.

  import type { PollSnapshot, SlidingScaleConfig, VoteSubmissionPayload } from '../../lib/poll-templates';

  interface Props {
    snapshot: PollSnapshot;
    hasVoted: boolean;
    myVote: VoteSubmissionPayload | null;
    isAuthenticated: boolean;
    variant: 'inline' | 'card' | 'present' | 'archive';
    isSubmitting: boolean;
    error: string | null;
    onVote: (payload: VoteSubmissionPayload) => void;
  }

  let { snapshot, hasVoted, myVote, isAuthenticated, isSubmitting, error, onVote }: Props = $props();

  const cfg = $derived((snapshot.options ?? { min: 0, max: 10 }) as SlidingScaleConfig);
  const min = $derived(cfg.min ?? 0);
  const max = $derived(cfg.max ?? 10);
  const step = $derived(cfg.step ?? 1);
  const labels = $derived(cfg.labels ?? {});
  const excluded = $derived(new Set<number>(Array.isArray(cfg.exclude) ? cfg.exclude : []));

  // Pick a sensible default that respects `exclude`. If the configured
  // default_value (or the midpoint) is excluded, snap to the nearest
  // valid value below it (then above) so the slider doesn't start invalid.
  function pickInitialValue(): number {
    const proposed = cfg.default_value ?? Math.round((min + max) / 2);
    if (!excluded.has(proposed)) return proposed;
    for (let d = step; d <= (max - min); d += step) {
      if (proposed - d >= min && !excluded.has(proposed - d)) return proposed - d;
      if (proposed + d <= max && !excluded.has(proposed + d)) return proposed + d;
    }
    return min;
  }
  let value = $state<number>(pickInitialValue());

  const isExcluded = $derived(excluded.has(value));

  const tallies = $derived((snapshot.tallies ?? null) as {
    histogram?: Record<string, number>;
    median?: number | null;
    iqr?: [number, number] | null;
  } | null);

  const histogram = $derived(tallies?.histogram ?? {});
  const median = $derived(tallies?.median ?? null);
  const iqr = $derived(tallies?.iqr ?? null);

  const showTallies = $derived(
    snapshot.tallies !== null &&
    (snapshot.results_visibility === 'live' ||
     (snapshot.results_visibility === 'on-close' && snapshot.status === 'closed'))
  );

  // Buckets to render (one per step from min..max). Heights normalized to the
  // tallest bucket so visualization is always readable regardless of N.
  const buckets = $derived.by(() => {
    const list: { value: number; count: number }[] = [];
    for (let i = min; i <= max; i += step) {
      list.push({ value: i, count: histogram[String(i)] ?? 0 });
    }
    return list;
  });
  const maxCount = $derived(buckets.reduce((m, b) => Math.max(m, b.count), 0));

  const myValue = $derived(
    myVote && 'value' in myVote && typeof myVote.value === 'number' ? myVote.value : null
  );

  // Position helpers for median / IQR markers (percentage along the histogram).
  function pctPosition(v: number): number {
    return max === min ? 50 : ((v - min) / (max - min)) * 100;
  }

  function castVote() {
    if (isSubmitting) return;
    if (isExcluded) return;
    if (hasVoted && !snapshot.allow_revote) return;
    onVote({ value });
  }
</script>

<div class="pq-sl">
  <p class="pq-sl__prompt">{snapshot.prompt}</p>

  {#if snapshot.status === 'open' && (!hasVoted || snapshot.allow_revote) && isAuthenticated}
    <div class="pq-sl__input-block">
      <div class="pq-sl__value-display">
        <span class="pq-sl__value">{value}</span>
        <span class="pq-sl__range">/ {max}</span>
      </div>

      <input
        type="range"
        class="pq-sl__slider"
        {min}
        {max}
        {step}
        value={value}
        oninput={(e) => (value = Number((e.currentTarget as HTMLInputElement).value))}
        disabled={isSubmitting}
        aria-label={snapshot.prompt}
      />

      <div class="pq-sl__labels">
        <span class="pq-sl__label-min">{labels.min ?? min}</span>
        {#if labels.mid}
          <span class="pq-sl__label-mid">{labels.mid}</span>
        {/if}
        <span class="pq-sl__label-max">{labels.max ?? max}</span>
      </div>

      <button
        type="button"
        class="pq-sl__submit"
        disabled={isSubmitting || isExcluded}
        onclick={castVote}
      >
        {isSubmitting
          ? 'Submitting…'
          : isExcluded
            ? `${value} isn't a valid choice — pick a side`
            : (hasVoted ? `Update to ${value}` : `Submit ${value}`)}
      </button>
    </div>
  {/if}

  {#if hasVoted && !snapshot.allow_revote && snapshot.status === 'open' && myValue !== null}
    <p class="pq-sl__voted-note">
      You voted <strong>{myValue}</strong>.
    </p>
  {/if}

  {#if showTallies && buckets.length > 0}
    <div class="pq-sl__tally" aria-live="polite">
      <div class="pq-sl__histogram">
        {#each buckets as b}
          {@const isExc = excluded.has(b.value)}
          {@const heightPct = !isExc && maxCount > 0 ? Math.round((b.count / maxCount) * 100) : 0}
          <div
            class="pq-sl__bucket"
            class:pq-sl__bucket--mine={!isExc && myValue !== null && Math.abs(myValue - b.value) < step / 2}
            class:pq-sl__bucket--excluded={isExc}
            aria-hidden={isExc}
          >
            <div class="pq-sl__bar-wrap">
              {#if !isExc}
                <span class="pq-sl__bucket-count" class:pq-sl__bucket-count--show={b.count > 0}>
                  {b.count}
                </span>
                <div class="pq-sl__bar" style="height: {heightPct}%"></div>
              {/if}
            </div>
            <span class="pq-sl__bucket-value">{b.value}</span>
          </div>
        {/each}
      </div>

      {#if iqr && iqr[0] !== iqr[1]}
        <div class="pq-sl__iqr-bracket">
          <div
            class="pq-sl__iqr-line"
            style="left: {pctPosition(iqr[0])}%; right: {100 - pctPosition(iqr[1])}%"
          ></div>
          <div class="pq-sl__iqr-label" style="left: {(pctPosition(iqr[0]) + pctPosition(iqr[1])) / 2}%">
            IQR {iqr[0]}–{iqr[1]}
          </div>
        </div>
      {/if}

      {#if median !== null}
        <p class="pq-sl__median">
          <strong>Median: {median}</strong>{#if iqr} · IQR {iqr[0]}–{iqr[1]}{/if}
        </p>
      {/if}

      {#if snapshot.total_votes_visible}
        <p class="pq-sl__total">
          {snapshot.total_votes} {snapshot.total_votes === 1 ? 'response' : 'responses'}
        </p>
      {/if}
    </div>
  {:else if snapshot.results_visibility === 'on-close' && snapshot.status === 'open'}
    <p class="pq-sl__hidden">Results revealed when the host closes the poll.</p>
  {/if}

  {#if error}
    <p class="pq-sl__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .pq-sl { display: flex; flex-direction: column; gap: 1rem; }

  .pq-sl__prompt {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--color-text);
  }

  .pq-sl__input-block {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1.25rem;
    border-radius: 0.625rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  .pq-sl__value-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.375rem;
  }
  .pq-sl__value {
    font-family: var(--font-display);
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;
  }
  .pq-sl__range {
    font-family: var(--font-code);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .pq-sl__slider {
    width: 100%;
    accent-color: var(--color-primary);
    cursor: grab;
  }
  .pq-sl__slider:active { cursor: grabbing; }

  .pq-sl__labels {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
    font-family: var(--font-code);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }
  .pq-sl__label-min { text-align: left; }
  .pq-sl__label-mid { text-align: center; }
  .pq-sl__label-max { text-align: right; }

  .pq-sl__submit {
    align-self: stretch;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    background: var(--color-primary);
    color: var(--color__bone, #fff);
    font-family: var(--font-code);
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid var(--color-primary);
    transition: opacity 150ms ease;
  }
  .pq-sl__submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .pq-sl__voted-note {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-sl__voted-note strong { color: var(--color-primary); }

  .pq-sl__tally {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1rem;
    border-radius: 0.625rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
    position: relative;
  }
  .pq-sl__histogram {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 8rem;
    padding: 0.5rem 0 1.5rem;
    position: relative;
  }
  .pq-sl__bucket {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    height: 100%;
    position: relative;
  }
  .pq-sl__bar-wrap {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    position: relative;
  }
  .pq-sl__bar {
    width: 100%;
    background: var(--color-primary);
    border-radius: 2px 2px 0 0;
    min-height: 1px;
    transition: height 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pq-sl__bucket--mine .pq-sl__bar {
    background: linear-gradient(0deg, var(--color-accent, var(--color-primary)), var(--color-primary));
  }
  .pq-sl__bucket--excluded .pq-sl__bucket-value {
    text-decoration: line-through;
    opacity: 0.45;
  }
  .pq-sl__bucket--excluded .pq-sl__bar-wrap::before {
    /* Subtle visual marker that this slot is intentionally empty. */
    content: '';
    position: absolute;
    bottom: 0;
    left: 35%;
    right: 35%;
    height: 1px;
    background: var(--color-text-muted);
    opacity: 0.3;
  }
  .pq-sl__bucket-count {
    position: absolute;
    top: -1.125rem;
    font-family: var(--font-code);
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    opacity: 0;
    transition: opacity 200ms ease;
    font-variant-numeric: tabular-nums;
  }
  .pq-sl__bucket-count--show { opacity: 1; }
  .pq-sl__bucket-value {
    position: absolute;
    bottom: -1.25rem;
    font-family: var(--font-code);
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .pq-sl__iqr-bracket {
    position: relative;
    height: 1.25rem;
    margin-top: -0.5rem;
  }
  .pq-sl__iqr-line {
    position: absolute;
    top: 0;
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
    opacity: 0.4;
  }
  .pq-sl__iqr-label {
    position: absolute;
    top: 0.375rem;
    transform: translateX(-50%);
    font-family: var(--font-code);
    font-size: 0.6875rem;
    color: var(--color-text-muted);
  }

  .pq-sl__median {
    margin: 0;
    text-align: center;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text);
  }
  .pq-sl__median strong { color: var(--color-primary); }

  .pq-sl__total {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: right;
  }
  .pq-sl__hidden {
    margin: 0;
    padding: 0.75rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.375rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .pq-sl__error {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .pq-sl__bar,
    .pq-sl__submit,
    .pq-sl__bucket-count { transition: none; }
  }
</style>
