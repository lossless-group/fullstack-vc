<script>
  /**
   * Multi-tag + text filter for /stacks/see-all-tools/.
   *
   * The catalogue counterpart to the header palette: the palette is for
   * jumping, this is for browsing. Both read and write the same atom
   * (search-state.svelte.js), so tags picked in the palette arrive here already
   * selected, and the URL (?q=&tags=) restores the same view on a shared link.
   *
   * The cards are server-rendered; this island only toggles `hidden` on them.
   * Each card's <li> carries data-tags (comma-separated Train-Case) and
   * data-text (lowercased name + description). Tags AND together, matching
   * Pagefind's `all` operator in the palette.
   */

  import TagChip from './TagChip.svelte';
  import { search, toggleTag, setQuery, clearAll, hydrateFromUrl } from '../../lib/search-state.svelte.js';

  /** [{ value: 'Personal-Agents', count: 6 }, …] — computed at build. */
  let { tags = [], total = 0, gridSelector = '[data-tool-grid]' } = $props();

  let showAll = $state(false);
  let shown = $state(total);

  if (typeof window !== 'undefined') hydrateFromUrl();

  // Tags that still have matches given the current selection, so a chip never
  // leads to an empty grid. Selected tags always stay visible.
  let visibleCounts = $state(new Map());

  function apply() {
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    const q = search.query.trim().toLowerCase();
    const sel = search.tags;
    const counts = new Map();
    let n = 0;
    for (const li of grid.querySelectorAll('[data-tags]')) {
      const own = (li.dataset.tags ?? '').split(',').filter(Boolean);
      const ok = sel.every((t) => own.includes(t)) && (!q || (li.dataset.text ?? '').includes(q));
      li.hidden = !ok;
      if (ok) {
        n++;
        for (const t of own) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    shown = n;
    visibleCounts = counts;
  }

  $effect(() => {
    // Track the atom; re-filter whenever the palette or this bar changes it.
    search.query; search.tags.length; search.tags.join(',');
    apply();
  });

  let chips = $derived.by(() => {
    const live = tags
      .map((t) => ({ value: t.value, count: visibleCounts.get(t.value) ?? 0 }))
      .filter((t) => t.count > 0 || search.tags.includes(t.value));
    return showAll ? live : live.slice(0, 24);
  });
  let hiddenChipCount = $derived(
    tags.filter((t) => (visibleCounts.get(t.value) ?? 0) > 0 || search.tags.includes(t.value)).length - chips.length
  );

  let debounce;
  function onInput(e) {
    clearTimeout(debounce);
    const v = e.currentTarget.value;
    debounce = setTimeout(() => setQuery(v), 120);
  }
</script>

<div class="tf">
  <div class="tf__row">
    <input
      class="tf__input"
      type="search"
      placeholder="Filter by name or description…"
      aria-label="Filter tools"
      value={search.query}
      oninput={onInput}
    />
    <span class="tf__count" aria-live="polite">
      {shown} of {total}
      {#if search.tags.length > 1}<em>· all {search.tags.length} tags must match</em>{/if}
    </span>
    {#if search.query || search.tags.length}
      <button class="tf__clear" type="button" onclick={clearAll}>Clear</button>
    {/if}
  </div>

  <div class="tf__chips" role="group" aria-label="Filter by tag">
    {#each chips as t (t.value)}
      <TagChip tagString={t.value} count={t.count} showCount isSelected={search.tags.includes(t.value)} onclick={() => toggleTag(t.value)} />
    {/each}
    {#if hiddenChipCount > 0 || showAll}
      <button class="tf__more" type="button" onclick={() => (showAll = !showAll)}>
        {showAll ? 'Fewer tags' : `+${hiddenChipCount} more tags`}
      </button>
    {/if}
  </div>
</div>

<style>
  .tf { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.75rem; }
  .tf__row { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
  .tf__input {
    flex: 1 1 18rem; max-width: 28rem;
    padding: .5rem .75rem; border-radius: .5rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    color: var(--color-text); font: inherit; font-size: .9rem;
  }
  .tf__input:focus { outline: none; border-color: var(--color-primary); }
  .tf__count { font-family: var(--font-code); font-size: .75rem; color: var(--color-text-muted); }
  .tf__count em { font-style: normal; margin-left: .25rem; }
  .tf__clear, .tf__more {
    background: none; border: 0; padding: .2rem .3rem; cursor: pointer;
    font-family: var(--font-code); font-size: .72rem; color: var(--color-primary);
  }
  .tf__clear:hover, .tf__more:hover { color: var(--color-text); }
  .tf__chips { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
</style>
