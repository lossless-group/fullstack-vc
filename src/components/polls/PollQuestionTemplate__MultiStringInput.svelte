<script lang="ts">
  // PollQuestionTemplate__MultiStringInput.svelte — list-builder template.
  //
  // Voter UX:
  //   - One-line input + "Add" button (Enter equals click).
  //   - Removable chips below the input as the voter accumulates entries.
  //   - "Submit" locks the list; "Update list" appears on subsequent edits when
  //     allow_revote is true.
  //   - Empty submissions are valid — "I have nothing to share" is real data.
  //
  // Realtime contract (blueprint v2 §16.2):
  //   - Counts (total_strings, total_contributors) are always visible.
  //   - Entry CONTENT is gated by results_visibility:
  //       'live'      → entries appear publicly as added (social-pressure surface)
  //       'on-close'  → entries hidden until poll closes (recommended default)
  //       'host-only' → entries hidden from this voter view entirely
  //   The API enforces this; the component just renders what it gets.

  import { untrack } from 'svelte';
  import type {
    PollSnapshot,
    VoteSubmissionPayload,
    MultiStringInputConfig,
  } from '../../lib/poll-templates';

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

  const cfg = $derived((snapshot.options ?? {}) as MultiStringInputConfig);
  const placeholder = $derived(cfg.placeholder ?? 'Type a phrase, press Enter…');
  const maxLen = $derived(cfg.max_string_length ?? 200);
  const maxStrings = $derived(cfg.max_strings_per_voter ?? null);

  // Local entry list the voter is composing. Seeded once from a prior vote
  // (when allow_revote is true) so re-opening the page shows what they last
  // sent. We don't want this to track `myVote` reactively — the voter mutates
  // `entries` locally as they type, and the parent shouldn't reset their list
  // by passing a new myVote ref. `untrack` is Svelte 5's escape hatch for
  // "seed from a prop, then own the value."
  let entries = $state<string[]>(
    untrack(() =>
      myVote && 'values' in myVote && Array.isArray(myVote.values)
        ? [...myVote.values]
        : []
    )
  );
  let draft = $state<string>('');

  const trimmedDraft = $derived(draft.trim().slice(0, maxLen));
  const isDraftDuplicate = $derived(
    trimmedDraft.length > 0 &&
    entries.some(e => e.toLowerCase() === trimmedDraft.toLowerCase())
  );
  const atCap = $derived(maxStrings !== null && entries.length >= maxStrings);
  const canAdd = $derived(trimmedDraft.length > 0 && !isDraftDuplicate && !atCap);

  function addEntry() {
    if (!canAdd) return;
    entries = [...entries, trimmedDraft];
    draft = '';
  }

  function removeEntry(index: number) {
    entries = entries.filter((_, i) => i !== index);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  }

  function submitList() {
    if (isSubmitting) return;
    onVote({ values: entries });
  }

  // Server-derived tallies. Shape comes from the API: counts always present,
  // entries either an array (public) or null (gated by visibility).
  const tallies = $derived((snapshot.tallies ?? null) as {
    total_strings?: number;
    total_contributors?: number;
    entries?: { text: string; count: number }[] | null;
  } | null);

  const totalStrings = $derived(tallies?.total_strings ?? 0);
  const totalContributors = $derived(tallies?.total_contributors ?? 0);
  const publicEntries = $derived(tallies?.entries ?? null);

  // The user has already submitted a vote; displayed once they hit submit.
  const myValues = $derived(
    myVote && 'values' in myVote && Array.isArray(myVote.values) ? myVote.values : null
  );

  const submitLabel = $derived.by(() => {
    if (isSubmitting) return 'Submitting…';
    if (entries.length === 0 && !hasVoted) return 'Submit (nothing to share)';
    if (hasVoted) return entries.length === 0 ? 'Update (clear my entries)' : `Update list (${entries.length})`;
    return entries.length === 1 ? 'Submit 1 entry' : `Submit ${entries.length} entries`;
  });

  const showInput = $derived(
    snapshot.status === 'open' &&
    isAuthenticated &&
    (!hasVoted || snapshot.allow_revote)
  );
</script>

<div class="pq-msi">
  <p class="pq-msi__prompt">{snapshot.prompt}</p>

  {#if showInput}
    <div class="pq-msi__compose">
      <div class="pq-msi__input-row">
        <input
          type="text"
          class="pq-msi__input"
          bind:value={draft}
          {placeholder}
          maxlength={maxLen}
          onkeydown={onKeyDown}
          disabled={isSubmitting || atCap}
          aria-label="Add an entry"
        />
        <button
          type="button"
          class="pq-msi__add"
          onclick={addEntry}
          disabled={!canAdd || isSubmitting}
        >
          Add
        </button>
      </div>

      {#if isDraftDuplicate}
        <p class="pq-msi__hint">Already in your list.</p>
      {:else if atCap}
        <p class="pq-msi__hint">You've reached the entry cap ({maxStrings}). Remove one to add another.</p>
      {/if}

      {#if entries.length > 0}
        <ul class="pq-msi__chips" aria-label="Your entries">
          {#each entries as entry, i (entry + i)}
            <li class="pq-msi__chip">
              <span class="pq-msi__chip-text">{entry}</span>
              <button
                type="button"
                class="pq-msi__chip-remove"
                onclick={() => removeEntry(i)}
                disabled={isSubmitting}
                aria-label={`Remove ${entry}`}
              >
                ×
              </button>
            </li>
          {/each}
        </ul>
      {:else if !hasVoted}
        <p class="pq-msi__empty">
          No entries yet. Type a phrase and press Enter — you can add as many as come to mind.
        </p>
      {/if}

      <button
        type="button"
        class="pq-msi__submit"
        onclick={submitList}
        disabled={isSubmitting}
      >
        {submitLabel}
      </button>
    </div>
  {/if}

  {#if hasVoted && myValues !== null}
    <div class="pq-msi__voted-block">
      {#if myValues.length === 0}
        <p class="pq-msi__voted-note">You submitted no entries.</p>
      {:else}
        <p class="pq-msi__voted-note">
          You submitted <strong>{myValues.length}</strong>
          {myValues.length === 1 ? 'entry' : 'entries'}:
        </p>
        <ul class="pq-msi__voted-list">
          {#each myValues as v}
            <li class="pq-msi__voted-item">{v}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <div class="pq-msi__aggregate" aria-live="polite">
    <span class="pq-msi__count">
      <strong>{totalStrings}</strong>
      {totalStrings === 1 ? 'entry' : 'entries'}
    </span>
    <span class="pq-msi__count-sep">·</span>
    <span class="pq-msi__count">
      from <strong>{totalContributors}</strong>
      {totalContributors === 1 ? 'contributor' : 'contributors'}
    </span>
  </div>

  {#if publicEntries !== null && publicEntries.length > 0}
    <ul class="pq-msi__public-list" aria-label="All entries">
      {#each publicEntries as e}
        <li class="pq-msi__public-item">
          <span class="pq-msi__public-text">{e.text}</span>
          {#if e.count > 1}
            <span class="pq-msi__public-count">× {e.count}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if publicEntries === null && snapshot.status === 'open'}
    <p class="pq-msi__hidden">
      Entries are private until the host closes this poll.
    </p>
  {:else if publicEntries !== null && publicEntries.length === 0 && snapshot.status === 'closed'}
    <p class="pq-msi__hidden">No entries were submitted.</p>
  {/if}

  {#if error}
    <p class="pq-msi__error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .pq-msi { display: flex; flex-direction: column; gap: 1rem; }

  .pq-msi__prompt {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--color-text);
  }

  /* ── Compose region ───────────────────────────────────────────────────── */
  .pq-msi__compose {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    border-radius: 0.625rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  .pq-msi__input-row {
    display: flex;
    gap: 0.5rem;
  }
  .pq-msi__input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0.625rem 0.875rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
    background: var(--fx-card-bg, var(--color-surface));
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 0.9375rem;
    line-height: 1.4;
  }
  .pq-msi__input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
  }
  .pq-msi__input:disabled { opacity: 0.5; cursor: not-allowed; }

  .pq-msi__add {
    flex: 0 0 auto;
    padding: 0.625rem 1rem;
    border-radius: 0.375rem;
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    font-family: var(--font-code);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .pq-msi__add:hover:not(:disabled) {
    background: var(--color-primary);
    color: var(--color__bone, #fff);
  }
  .pq-msi__add:disabled { opacity: 0.4; cursor: not-allowed; }

  .pq-msi__hint {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .pq-msi__empty {
    margin: 0;
    padding: 0.75rem 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* ── Chips (the voter's staged entries) ───────────────────────────────── */
  .pq-msi__chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pq-msi__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--color-text);
    line-height: 1.2;
  }
  .pq-msi__chip-text { word-break: break-word; }
  .pq-msi__chip-remove {
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border-radius: 50%;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease;
  }
  .pq-msi__chip-remove:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent, var(--color-primary)) 25%, transparent);
    color: var(--color-text);
  }
  .pq-msi__chip-remove:disabled { opacity: 0.4; cursor: not-allowed; }

  .pq-msi__submit {
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
    border: 1px solid var(--color-primary);
    cursor: pointer;
    transition: opacity 150ms ease;
  }
  .pq-msi__submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Post-vote summary (voter's own entries) ──────────────────────────── */
  .pq-msi__voted-block {
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
  }
  .pq-msi__voted-note {
    margin: 0 0 0.5rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .pq-msi__voted-note strong { color: var(--color-primary); }
  .pq-msi__voted-list {
    list-style: disc;
    padding-left: 1.25rem;
    margin: 0;
    font-size: 0.9375rem;
    color: var(--color-text);
  }
  .pq-msi__voted-item { margin-bottom: 0.25rem; }

  /* ── Public aggregate (counts always; entries when allowed) ───────────── */
  .pq-msi__aggregate {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text);
  }
  .pq-msi__aggregate strong { color: var(--color-primary); }
  .pq-msi__count-sep { color: var(--color-text-muted); }

  .pq-msi__public-list {
    list-style: none;
    padding: 0.75rem 1rem;
    margin: 0;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .pq-msi__public-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.25rem 0;
    border-bottom: 1px dashed color-mix(in srgb, var(--color-border) 60%, transparent);
    font-size: 0.9375rem;
    color: var(--color-text);
  }
  .pq-msi__public-item:last-child { border-bottom: 0; }
  .pq-msi__public-text { word-break: break-word; flex: 1 1 auto; }
  .pq-msi__public-count {
    flex: 0 0 auto;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
  }

  .pq-msi__hidden {
    margin: 0;
    padding: 0.75rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.375rem;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .pq-msi__error {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }
</style>
