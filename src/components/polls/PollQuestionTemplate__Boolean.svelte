<script lang="ts">
  // PollQuestionTemplate__Boolean.svelte — Yes/No / True-False template.
  //
  // Display:
  //   - Two big buttons (Yes / No) when not voted.
  //   - Two-bar tally with percent each side after vote.
  //   - "Consensus" badge if one side exceeds 80%.
  //
  // See: blueprint v2 §7.1.

  import type { PollSnapshot, VoteSubmissionPayload } from '../../lib/poll-templates';

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

  // Labels (default Yes/No) — pulled from poll's options if author overrode them.
  // Note: for boolean, options is null; labels come from a separate `labels` field
  // on the poll definition. v0.0.1 just uses Yes/No defaults.
  const trueLabel = 'Yes';
  const falseLabel = 'No';

  const tallies = $derived(snapshot.tallies as { true?: number; false?: number } | null);
  const tallyTrue = $derived(tallies?.true ?? 0);
  const tallyFalse = $derived(tallies?.false ?? 0);
  const tallyTotal = $derived(tallyTrue + tallyFalse);

  const pctTrue = $derived(tallyTotal === 0 ? 0 : Math.round((tallyTrue / tallyTotal) * 100));
  const pctFalse = $derived(tallyTotal === 0 ? 0 : Math.round((tallyFalse / tallyTotal) * 100));

  const showTallies = $derived(
    snapshot.tallies !== null &&
    (snapshot.results_visibility === 'live' ||
     (snapshot.results_visibility === 'on-close' && snapshot.status === 'closed'))
  );

  const consensus = $derived(pctTrue >= 80 ? 'true' : pctFalse >= 80 ? 'false' : null);

  const myValue = $derived(myVote && 'value' in myVote && typeof myVote.value === 'boolean' ? myVote.value : null);

  function castVote(value: boolean) {
    if (isSubmitting) return;
    if (hasVoted && !snapshot.allow_revote) return;
    onVote({ value });
  }
</script>

<div class="pq-bool" data-variant={'card'}>
  <p class="pq-bool__prompt">{snapshot.prompt}</p>

  {#if snapshot.status === 'open' && (!hasVoted || snapshot.allow_revote) && isAuthenticated}
    <div class="pq-bool__buttons">
      <button
        type="button"
        class="pq-bool__btn pq-bool__btn--true"
        class:pq-bool__btn--selected={myValue === true}
        disabled={isSubmitting}
        onclick={() => castVote(true)}
      >
        {trueLabel}
      </button>
      <button
        type="button"
        class="pq-bool__btn pq-bool__btn--false"
        class:pq-bool__btn--selected={myValue === false}
        disabled={isSubmitting}
        onclick={() => castVote(false)}
      >
        {falseLabel}
      </button>
    </div>
  {/if}

  {#if hasVoted && !snapshot.allow_revote && snapshot.status === 'open'}
    <p class="pq-bool__voted-note">
      You voted <strong>{myValue ? trueLabel : falseLabel}</strong>. Watch the room come in below.
    </p>
  {/if}

  {#if showTallies}
    <div class="pq-bool__tally" aria-live="polite">
      <div class="pq-bool__tally-row">
        <span class="pq-bool__tally-label">{trueLabel}</span>
        <div class="pq-bool__tally-bar pq-bool__tally-bar--true">
          <div class="pq-bool__tally-fill" style="width: {pctTrue}%"></div>
        </div>
        <span class="pq-bool__tally-pct">{pctTrue}% <span class="pq-bool__tally-count">({tallyTrue})</span></span>
      </div>
      <div class="pq-bool__tally-row">
        <span class="pq-bool__tally-label">{falseLabel}</span>
        <div class="pq-bool__tally-bar pq-bool__tally-bar--false">
          <div class="pq-bool__tally-fill" style="width: {pctFalse}%"></div>
        </div>
        <span class="pq-bool__tally-pct">{pctFalse}% <span class="pq-bool__tally-count">({tallyFalse})</span></span>
      </div>

      {#if consensus && tallyTotal >= 5}
        <p class="pq-bool__consensus">
          <strong>Consensus</strong> — {consensus === 'true' ? trueLabel : falseLabel}
        </p>
      {/if}

      {#if snapshot.total_votes_visible}
        <p class="pq-bool__total">{snapshot.total_votes} {snapshot.total_votes === 1 ? 'vote' : 'votes'} total</p>
      {/if}
    </div>
  {:else if snapshot.results_visibility === 'on-close' && snapshot.status === 'open'}
    <p class="pq-bool__hidden-results">Results revealed when the host closes the poll.</p>
  {/if}

  {#if error}
    <p class="pq-bool__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .pq-bool { display: flex; flex-direction: column; gap: 1rem; }
  .pq-bool__prompt {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--color-text);
  }
  .pq-bool__buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .pq-bool__btn {
    padding: 1rem 1.5rem;
    border-radius: 0.625rem;
    font-family: var(--font-code);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    transition: border-color 150ms ease, transform 150ms ease, background 150ms ease;
  }
  .pq-bool__btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  .pq-bool__btn--selected {
    background: var(--color-primary);
    color: var(--color__bone, #fff);
    border-color: var(--color-primary);
  }
  .pq-bool__btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .pq-bool__voted-note {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-bool__voted-note strong { color: var(--color-primary); }

  .pq-bool__tally {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 1rem;
    border-radius: 0.625rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
  }
  .pq-bool__tally-row {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    align-items: center;
    gap: 0.75rem;
  }
  .pq-bool__tally-label {
    font-family: var(--font-code);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }
  .pq-bool__tally-bar {
    height: 1.5rem;
    border-radius: 0.375rem;
    background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
    overflow: hidden;
  }
  .pq-bool__tally-fill {
    height: 100%;
    transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
    background: var(--color-primary);
  }
  .pq-bool__tally-bar--false .pq-bool__tally-fill { background: var(--color-text-muted); }
  .pq-bool__tally-pct {
    font-family: var(--font-code);
    font-size: 0.875rem;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }
  .pq-bool__tally-count { color: var(--color-text-muted); font-size: 0.75rem; }

  .pq-bool__consensus {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    color: var(--color-primary);
    font-family: var(--font-code);
    font-size: 0.8125rem;
    text-align: center;
  }
  .pq-bool__total {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: right;
  }
  .pq-bool__hidden-results {
    margin: 0;
    padding: 0.75rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.375rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .pq-bool__error {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .pq-bool__tally-fill,
    .pq-bool__btn { transition: none; }
  }
</style>
