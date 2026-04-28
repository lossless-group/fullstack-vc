<script lang="ts">
  // PollEmbed.svelte — orchestrator for a single Poll.
  //
  // Responsibilities (blueprint v2 §11, §12):
  //   - Receive initialState (server-rendered snapshot) + isAuthenticated.
  //   - Render the right <PollQuestionTemplate__*> for snapshot.template.
  //   - Tier 1 interval polling: refresh /api/polls/[id]/results.json every 4s
  //     while open; pause on hidden tab; stop on closed.
  //   - Optimistic vote submission with rollback on server error.
  //   - Manage the six visual states from §12.2:
  //       loading · unauthenticated · open-unvoted · open-voted · closed · errored.
  //   - Card chrome (title, status badge, error banner).
  //
  // The Astro page ALWAYS provides initialState (SSR snapshot from astro:db),
  // so there's no first-paint flash and "loading" only appears between
  // optimistic vote and server confirmation.

  import type { PollSnapshot, VoteSubmissionPayload } from '../../lib/poll-templates';
  import Boolean from './PollQuestionTemplate__Boolean.svelte';
  import SingleSelect from './PollQuestionTemplate__SingleSelect.svelte';
  import MultiSelect from './PollQuestionTemplate__MultiSelect.svelte';
  import SlidingScale from './PollQuestionTemplate__SlidingScale.svelte';

  interface Props {
    pollId: string;
    initialState: PollSnapshot;
    isAuthenticated: boolean;
    displayName?: string | null;
    variant?: 'inline' | 'card' | 'present' | 'archive';
    pollIntervalMs?: number;
  }

  let {
    pollId,
    initialState,
    isAuthenticated,
    displayName = null,
    variant = 'card',
    pollIntervalMs = 4000,
  }: Props = $props();

  // ─── Reactive state ────────────────────────────────────────────────────────
  let snapshot = $state<PollSnapshot>(initialState);
  let hasVoted = $state(false);
  let myVote = $state<VoteSubmissionPayload | null>(null);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  // ─── Refresh from server ───────────────────────────────────────────────────
  async function refresh() {
    try {
      const res = await fetch(`/api/polls/${pollId}/results.json`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Merge dynamic fields onto the snapshot. Keep static metadata
      // (title, prompt, template, options, allow_revote) from initialState.
      snapshot = {
        ...snapshot,
        status: data.status ?? snapshot.status,
        total_votes: data.total_votes ?? snapshot.total_votes,
        total_votes_visible: data.total_votes_visible ?? snapshot.total_votes_visible,
        tallies: data.tallies ?? snapshot.tallies,
        last_aggregated_at: data.last_aggregated_at ?? snapshot.last_aggregated_at,
        results_visibility: data.results_visibility ?? snapshot.results_visibility,
      };
    } catch {
      // Silent — next tick will retry. Persistent failures surface via the
      // explicit error state set by submitVote.
    }
  }

  // ─── Polling lifecycle ─────────────────────────────────────────────────────
  // Run while: variant !== 'archive' AND status === 'open' AND tab visible.
  // Stop on close, hide, or destroy.
  $effect(() => {
    if (variant === 'archive') return;
    if (snapshot.status !== 'open') return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (intervalId !== null) return;
      intervalId = setInterval(refresh, pollIntervalMs);
    }
    function stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      start();
    }

    function onVisibilityChange() {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible' && snapshot.status === 'open') {
        start();
      } else {
        stop();
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  });

  // ─── Vote submission (optimistic) ──────────────────────────────────────────
  async function submitVote(payload: VoteSubmissionPayload) {
    if (isSubmitting) return;
    if (!isAuthenticated) {
      error = 'Sign in to vote.';
      return;
    }

    error = null;
    isSubmitting = true;

    // Optimistic: assume the vote will land; reflect it locally immediately.
    const priorHasVoted = hasVoted;
    const priorMyVote = myVote;
    hasVoted = true;
    myVote = payload;

    try {
      const res = await fetch(`/api/polls/${pollId}/votes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        error = body.error ?? `vote failed (HTTP ${res.status})`;
        // Roll back optimistic state.
        hasVoted = priorHasVoted;
        myVote = priorMyVote;
        return;
      }

      // Refresh tallies immediately so the UI reflects the new vote.
      await refresh();
    } catch (e) {
      error = 'Network error. Try again?';
      hasVoted = priorHasVoted;
      myVote = priorMyVote;
    } finally {
      isSubmitting = false;
    }
  }

  // ─── Status badge label ────────────────────────────────────────────────────
  const statusLabel = $derived.by(() => {
    switch (snapshot.status) {
      case 'open':      return 'LIVE';
      case 'closed':    return 'CLOSED';
      case 'scheduled': return 'STARTING SOON';
      case 'draft':     return 'DRAFT';
      default:          return snapshot.status;
    }
  });
</script>

<article class="poll-embed poll-embed--{variant} poll-embed--{snapshot.status}">
  <header class="poll-embed__header">
    <span class="poll-embed__title">{snapshot.title}</span>
    <span
      class="poll-embed__status"
      class:poll-embed__status--open={snapshot.status === 'open'}
      class:poll-embed__status--closed={snapshot.status === 'closed'}
    >
      {#if snapshot.status === 'open'}
        <span class="poll-embed__status-dot" aria-hidden="true"></span>
      {/if}
      {statusLabel}
    </span>
  </header>

  <div class="poll-embed__body">
    {#if snapshot.status === 'draft' || snapshot.status === 'scheduled'}
      <p class="poll-embed__waiting">
        {snapshot.status === 'scheduled'
          ? 'This poll opens when the host calls it.'
          : 'This poll is being prepared.'}
      </p>
    {:else if !isAuthenticated && snapshot.status === 'open'}
      <p class="poll-embed__cta">
        <a href="/login" class="poll-embed__cta-link">Sign in</a>
        to vote on this poll.
      </p>
    {:else if snapshot.template === 'boolean'}
      <Boolean
        {snapshot}
        {hasVoted}
        {myVote}
        {isAuthenticated}
        {variant}
        {isSubmitting}
        {error}
        onVote={submitVote}
      />
    {:else if snapshot.template === 'single-select'}
      <SingleSelect
        {snapshot}
        {hasVoted}
        {myVote}
        {isAuthenticated}
        {variant}
        {isSubmitting}
        {error}
        onVote={submitVote}
      />
    {:else if snapshot.template === 'multi-select'}
      <MultiSelect
        {snapshot}
        {hasVoted}
        {myVote}
        {isAuthenticated}
        {variant}
        {isSubmitting}
        {error}
        onVote={submitVote}
      />
    {:else if snapshot.template === 'sliding-scale'}
      <SlidingScale
        {snapshot}
        {hasVoted}
        {myVote}
        {isAuthenticated}
        {variant}
        {isSubmitting}
        {error}
        onVote={submitVote}
      />
    {:else}
      <p class="poll-embed__unknown">Unknown poll template: {snapshot.template}</p>
    {/if}
  </div>
</article>

<style>
  .poll-embed {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1.5rem;
    border-radius: 0.875rem;
    background: var(--fx-card-bg, var(--color-surface));
    border: 1px solid var(--fx-card-border, var(--color-border));
    box-shadow: var(--fx-card-shadow);
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .poll-embed--open {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  }
  .poll-embed--closed {
    border-style: dashed;
    opacity: 0.92;
  }
  .poll-embed--archive {
    /* Static, no live updates — matte presentation. */
    background: var(--color-surface);
    box-shadow: none;
  }
  .poll-embed--present {
    /* Projection mode — bigger everything. Templates can read the variant
       prop later if they want to amplify too. */
    padding: 2.5rem;
    font-size: 1.125rem;
  }

  .poll-embed__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }
  .poll-embed__title {
    font-family: var(--font-code);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--color-text-muted);
  }
  .poll-embed__status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.1875rem 0.625rem;
    border-radius: 999px;
    font-family: var(--font-code);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    border: 1px solid currentColor;
    color: var(--color-text-muted);
  }
  .poll-embed__status--open {
    color: var(--color-primary);
  }
  .poll-embed__status--closed {
    color: var(--color-text-muted);
  }
  .poll-embed__status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: currentColor;
    animation: poll-embed-pulse 1.4s ease-in-out infinite;
  }
  @keyframes poll-embed-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.45; transform: scale(0.85); }
  }
  @media (prefers-reduced-motion: reduce) {
    .poll-embed__status-dot { animation: none; }
  }

  .poll-embed__body { display: flex; flex-direction: column; gap: 1rem; }

  .poll-embed__waiting {
    margin: 0;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px dashed var(--color-border);
    text-align: center;
    font-family: var(--font-code);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .poll-embed__cta {
    margin: 0;
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
    font-family: var(--font-body);
    color: var(--color-text);
  }
  .poll-embed__cta-link {
    color: var(--color-primary);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    margin-right: 0.25rem;
  }

  .poll-embed__unknown {
    margin: 0;
    color: var(--color-accent, crimson);
    font-family: var(--font-code);
    font-size: 0.875rem;
  }
</style>
