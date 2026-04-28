<script lang="ts">
  // PollQuestionTemplate__SingleSelect.svelte — radio-style, exactly one option.
  //
  // Display:
  //   - List of radio rows (one per option) when not voted.
  //   - Submit button (or auto-submit on click — using submit button for forgiveness).
  //   - Bar chart sorted by tally after vote.
  //   - Winner gets --fx-glow-* halo when poll closes.
  //
  // See: blueprint v2 §7.4.

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

  const options = $derived((snapshot.options ?? []) as PollOption[]);

  let selectedId = $state<string | null>(null);

  const tallies = $derived((snapshot.tallies ?? {}) as Record<string, number>);
  const totalRespondents = $derived(snapshot.total_votes);

  const showTallies = $derived(
    snapshot.tallies !== null &&
    (snapshot.results_visibility === 'live' ||
     (snapshot.results_visibility === 'on-close' && snapshot.status === 'closed'))
  );

  // Sorted view of options by tally desc — used for the result bar chart.
  const sortedByTally = $derived(
    [...options].sort((a, b) => (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0))
  );

  // Winner = option with highest tally; only highlighted on close.
  const winnerId = $derived(
    snapshot.status === 'closed' && sortedByTally.length > 0 ? sortedByTally[0].id : null
  );

  const myOptionId = $derived(
    myVote && 'option_ids' in myVote && Array.isArray(myVote.option_ids) ? myVote.option_ids[0] ?? null : null
  );

  function pct(count: number): number {
    return totalRespondents === 0 ? 0 : Math.round((count / totalRespondents) * 100);
  }

  function castVote() {
    if (!selectedId || isSubmitting) return;
    if (hasVoted && !snapshot.allow_revote) return;
    onVote({ option_ids: [selectedId] });
  }
</script>

<div class="pq-ss">
  <p class="pq-ss__prompt">{snapshot.prompt}</p>

  {#if snapshot.status === 'open' && (!hasVoted || snapshot.allow_revote) && isAuthenticated}
    <fieldset class="pq-ss__options">
      <legend class="pq-ss__legend">Select one</legend>
      {#each options as option (option.id)}
        <label class="pq-ss__option" class:pq-ss__option--selected={selectedId === option.id}>
          <input
            type="radio"
            name="ss-{snapshot.poll_id}"
            value={option.id}
            checked={selectedId === option.id}
            onchange={() => (selectedId = option.id)}
            disabled={isSubmitting}
          />
          <span class="pq-ss__option-label">{option.label}</span>
          {#if option.description}
            <span class="pq-ss__option-desc">{option.description}</span>
          {/if}
        </label>
      {/each}
    </fieldset>
    <button
      type="button"
      class="pq-ss__submit"
      disabled={!selectedId || isSubmitting}
      onclick={castVote}
    >
      {isSubmitting ? 'Submitting…' : (hasVoted ? 'Change my vote' : 'Submit')}
    </button>
  {/if}

  {#if hasVoted && !snapshot.allow_revote && snapshot.status === 'open'}
    {@const myOpt = options.find(o => o.id === myOptionId)}
    {#if myOpt}
      <p class="pq-ss__voted-note">You voted <strong>{myOpt.label}</strong>.</p>
    {/if}
  {/if}

  {#if showTallies}
    <div class="pq-ss__tally" aria-live="polite">
      {#each sortedByTally as option (option.id)}
        {@const count = tallies[option.id] ?? 0}
        {@const percent = pct(count)}
        <div
          class="pq-ss__row"
          class:pq-ss__row--mine={myOptionId === option.id}
          class:pq-ss__row--winner={winnerId === option.id}
        >
          <span class="pq-ss__row-label">{option.label}</span>
          <div class="pq-ss__row-bar">
            <div class="pq-ss__row-fill" style="width: {percent}%"></div>
          </div>
          <span class="pq-ss__row-pct">{percent}% <span class="pq-ss__row-count">({count})</span></span>
        </div>
      {/each}

      {#if snapshot.total_votes_visible}
        <p class="pq-ss__total">{totalRespondents} {totalRespondents === 1 ? 'respondent' : 'respondents'}</p>
      {/if}
    </div>
  {:else if snapshot.results_visibility === 'on-close' && snapshot.status === 'open'}
    <p class="pq-ss__hidden">Results revealed when the host closes the poll.</p>
  {/if}

  {#if error}
    <p class="pq-ss__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .pq-ss { display: flex; flex-direction: column; gap: 1rem; }

  .pq-ss__prompt {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--color-text);
  }

  .pq-ss__options {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pq-ss__legend {
    font-family: var(--font-code);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }
  .pq-ss__option {
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
  .pq-ss__option:hover { border-color: var(--color-primary); }
  .pq-ss__option--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  }
  .pq-ss__option input[type="radio"] {
    accent-color: var(--color-primary);
    width: 1rem;
    height: 1rem;
  }
  .pq-ss__option-label {
    font-family: var(--font-body);
    color: var(--color-text);
    font-size: 0.9375rem;
  }
  .pq-ss__option-desc {
    grid-column: 2;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .pq-ss__submit {
    align-self: flex-start;
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
  .pq-ss__submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .pq-ss__voted-note {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-ss__voted-note strong { color: var(--color-primary); }

  .pq-ss__tally {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.625rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
  }
  .pq-ss__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(8rem, 2fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    transition: background 200ms ease, box-shadow 400ms ease;
  }
  .pq-ss__row--mine {
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
  }
  .pq-ss__row--winner {
    box-shadow: 0 0 0 1px var(--color-primary),
                0 0 var(--fx-glow-spread, 16px) color-mix(in srgb, var(--color-primary) var(--fx-glow-opacity, 30%), transparent);
  }
  .pq-ss__row-label {
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pq-ss__row-bar {
    height: 1.25rem;
    border-radius: 0.25rem;
    background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
    overflow: hidden;
  }
  .pq-ss__row-fill {
    height: 100%;
    background: var(--color-primary);
    transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pq-ss__row--winner .pq-ss__row-fill {
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent, var(--color-primary)));
  }
  .pq-ss__row-pct {
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }
  .pq-ss__row-count { color: var(--color-text-muted); font-size: 0.75rem; }

  .pq-ss__total {
    margin: 0.25rem 0 0;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: right;
  }
  .pq-ss__hidden {
    margin: 0;
    padding: 0.75rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.375rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .pq-ss__error {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .pq-ss__row,
    .pq-ss__row-fill,
    .pq-ss__option,
    .pq-ss__submit { transition: none; }
  }
</style>
