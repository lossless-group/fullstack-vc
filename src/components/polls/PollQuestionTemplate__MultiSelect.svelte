<script lang="ts">
  // PollQuestionTemplate__MultiSelect.svelte — checkbox-style, 1+ options.
  //
  // Display:
  //   - Checkbox list with optional min/max selection counters.
  //   - Submit button gates on the count.
  //   - Bar chart per option after vote; denominator is RESPONDENTS, not selections.
  //
  // See: blueprint v2 §7.3.

  import type { PollSnapshot, PollOption, VoteSubmissionPayload } from '../../lib/poll-templates';

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

  // The poll's `options` field for multi-select is PollOption[]. The min/max
  // bounds live on the row-level Poll record (not in options). For v0.0.1 we
  // accept them via a dual-shape: options can be PollOption[] OR an object
  // { items: PollOption[], min_selections, max_selections }. The seed uses the
  // simple PollOption[] shape; bounds default to 1..N.
  const rawOptions = $derived(snapshot.options);
  const options = $derived(Array.isArray(rawOptions) ? rawOptions as PollOption[] : []);

  const minSelections = 1;
  const maxSelections = options.length;

  let selected = $state<Set<string>>(new Set());

  function toggle(id: string) {
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      if (selected.size >= maxSelections) return;
      selected.add(id);
    }
    selected = new Set(selected);  // trigger reactivity
  }

  const selectionCount = $derived(selected.size);
  const canSubmit = $derived(selectionCount >= minSelections && selectionCount <= maxSelections);

  const tallies = $derived((snapshot.tallies ?? {}) as Record<string, number>);
  const totalRespondents = $derived(snapshot.total_votes);

  const showTallies = $derived(
    snapshot.tallies !== null &&
    (snapshot.results_visibility === 'live' ||
     (snapshot.results_visibility === 'on-close' && snapshot.status === 'closed'))
  );

  const sortedByTally = $derived(
    [...options].sort((a, b) => (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0))
  );

  const myOptionIds = $derived(
    myVote && 'option_ids' in myVote && Array.isArray(myVote.option_ids) ? new Set<string>(myVote.option_ids) : new Set<string>()
  );

  function pct(count: number): number {
    return totalRespondents === 0 ? 0 : Math.round((count / totalRespondents) * 100);
  }

  function castVote() {
    if (!canSubmit || isSubmitting) return;
    if (hasVoted && !snapshot.allow_revote) return;
    onVote({ option_ids: Array.from(selected) });
  }
</script>

<div class="pq-ms">
  <p class="pq-ms__prompt">{snapshot.prompt}</p>

  {#if snapshot.status === 'open' && (!hasVoted || snapshot.allow_revote) && isAuthenticated}
    <fieldset class="pq-ms__options">
      <legend class="pq-ms__legend">
        Select {minSelections === maxSelections
          ? `exactly ${minSelections}`
          : minSelections > 1
            ? `at least ${minSelections}`
            : 'one or more'}
      </legend>
      {#each options as option (option.id)}
        {@const isChecked = selected.has(option.id)}
        <label class="pq-ms__option" class:pq-ms__option--selected={isChecked}>
          <input
            type="checkbox"
            checked={isChecked}
            onchange={() => toggle(option.id)}
            disabled={isSubmitting}
          />
          <span class="pq-ms__option-label">{option.label}</span>
          {#if option.description}
            <span class="pq-ms__option-desc">{option.description}</span>
          {/if}
        </label>
      {/each}
    </fieldset>

    <div class="pq-ms__footer">
      <span class="pq-ms__count">{selectionCount} selected</span>
      <button
        type="button"
        class="pq-ms__submit"
        disabled={!canSubmit || isSubmitting}
        onclick={castVote}
      >
        {isSubmitting ? 'Submitting…' : (hasVoted ? 'Update my vote' : 'Submit')}
      </button>
    </div>
  {/if}

  {#if hasVoted && !snapshot.allow_revote && snapshot.status === 'open'}
    <p class="pq-ms__voted-note">
      You voted for <strong>{myOptionIds.size}</strong> {myOptionIds.size === 1 ? 'option' : 'options'}.
    </p>
  {/if}

  {#if showTallies}
    <div class="pq-ms__tally" aria-live="polite">
      {#each sortedByTally as option (option.id)}
        {@const count = tallies[option.id] ?? 0}
        {@const percent = pct(count)}
        <div class="pq-ms__row" class:pq-ms__row--mine={myOptionIds.has(option.id)}>
          <span class="pq-ms__row-label">{option.label}</span>
          <div class="pq-ms__row-bar">
            <div class="pq-ms__row-fill" style="width: {percent}%"></div>
          </div>
          <span class="pq-ms__row-pct">{percent}% <span class="pq-ms__row-count">({count})</span></span>
        </div>
      {/each}

      {#if snapshot.total_votes_visible}
        <p class="pq-ms__total">
          {totalRespondents} {totalRespondents === 1 ? 'respondent' : 'respondents'}
        </p>
      {/if}
    </div>
  {:else if snapshot.results_visibility === 'on-close' && snapshot.status === 'open'}
    <p class="pq-ms__hidden">Results revealed when the host closes the poll.</p>
  {/if}

  {#if error}
    <p class="pq-ms__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .pq-ms { display: flex; flex-direction: column; gap: 1rem; }

  .pq-ms__prompt {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--color-text);
  }

  .pq-ms__options {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pq-ms__legend {
    font-family: var(--font-code);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }
  .pq-ms__option {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.625rem 0.75rem;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
  }
  .pq-ms__option:hover { border-color: var(--color-primary); }
  .pq-ms__option--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  }
  .pq-ms__option input[type="checkbox"] {
    accent-color: var(--color-primary);
    width: 1rem;
    height: 1rem;
  }
  .pq-ms__option-label {
    font-family: var(--font-body);
    color: var(--color-text);
    font-size: 0.9375rem;
  }
  .pq-ms__option-desc {
    grid-column: 2;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .pq-ms__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .pq-ms__count {
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-ms__submit {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    background: var(--color-primary);
    color: var(--color__bone, #fff);
    font-family: var(--font-code);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid var(--color-primary);
    transition: opacity 150ms ease;
  }
  .pq-ms__submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .pq-ms__voted-note {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-ms__voted-note strong { color: var(--color-primary); }

  .pq-ms__tally {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.625rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
  }
  .pq-ms__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(8rem, 2fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    transition: background 200ms ease;
  }
  .pq-ms__row--mine {
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
  }
  .pq-ms__row-label {
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pq-ms__row-bar {
    height: 1.25rem;
    border-radius: 0.25rem;
    background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
    overflow: hidden;
  }
  .pq-ms__row-fill {
    height: 100%;
    background: var(--color-primary);
    transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pq-ms__row-pct {
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }
  .pq-ms__row-count { color: var(--color-text-muted); font-size: 0.75rem; }
  .pq-ms__total {
    margin: 0.25rem 0 0;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: right;
  }
  .pq-ms__hidden {
    margin: 0;
    padding: 0.75rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.375rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .pq-ms__error {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .pq-ms__row,
    .pq-ms__row-fill,
    .pq-ms__option,
    .pq-ms__submit { transition: none; }
  }
</style>
