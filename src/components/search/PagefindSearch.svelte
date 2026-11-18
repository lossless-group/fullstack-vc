<script>
  /**
   * Spill-out search palette. Ported from sites/lossless-toolkit-site
   * (src/components/PagefindSearch.svelte).
   *
   * A command palette, not a filtered index page: you type, results spill out
   * beneath the bar, and the page underneath is never rearranged.
   *
   * Two facets, both Pagefind filters built by src/pages/search-records.json.ts:
   *   kind — Tool, Recipe, Session, Person, Project, Working Group. Selecting
   *          several OR-s them (a result is one kind).
   *   tag  — registry tags. Selecting several AND-s them via Pagefind's `all`,
   *          so "Personal-Agents" + "Privacy" narrows rather than widens.
   *
   * Index fragments are fetched on demand, so full-text costs a few KB per
   * query rather than shipping the catalogue to the browser.
   */

  import TagChip from './TagChip.svelte';
  import { search, toggleTag, popTag, setQuery, hydrateFromUrl, queryString, CATALOGUE } from '../../lib/search-state.svelte.js';

  let { bundlePath = '/pagefind/', placeholder = 'Search tools, people, recipes…' } = $props();

  let pagefind = $state(null);
  let failed = $state(false);
  let open = $state(false);
  let allTags = $state([]);
  let allKinds = $state([]);
  let kinds = $state([]);
  let results = $state([]);
  let total = $state(0);
  let searching = $state(false);
  let cursor = $state(-1);
  let rootEl;
  let inputEl;

  let tagMatches = $derived.by(() => {
    const q = search.query.trim().toLowerCase().replace(/\s+/g, '-');
    const pool = allTags.filter((t) => !search.tags.includes(t.value));
    if (!q) return pool.slice(0, 12);
    // Tag matches are the strongest signal, so rank them: prefix beats substring.
    const pre = pool.filter((t) => t.value.toLowerCase().startsWith(q));
    const sub = pool.filter((t) => !t.value.toLowerCase().startsWith(q) && t.value.toLowerCase().includes(q));
    return [...pre, ...sub].slice(0, 12);
  });

  // Warm the index without waiting for focus. requestIdleCallback and
  // setTimeout do NOT share a signature: passing a delay to the former throws,
  // and a throw during init kills hydration outright.
  if (typeof window !== 'undefined') {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => boot());
    else setTimeout(() => boot(), 1);
  }

  async function boot() {
    if (pagefind || failed) return;
    try {
      const mod = await import(/* @vite-ignore */ `${bundlePath}pagefind.js`);
      await mod.options({ bundlePath });
      await mod.init();
      pagefind = mod;
      const f = await mod.filters();
      allTags = Object.entries(f.tag ?? {})
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
      allKinds = Object.entries(f.kind ?? {})
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
      run();
    } catch (e) {
      console.error('pagefind boot failed', e);
      failed = true;
    }
  }

  function filters() {
    const f = {};
    if (search.tags.length) f.tag = { all: [...search.tags] };
    if (kinds.length) f.kind = { any: [...kinds] };
    return Object.keys(f).length ? f : undefined;
  }

  async function run() {
    if (!pagefind) return;
    searching = true;
    cursor = -1;
    const q = search.query.trim();
    try {
      const r = await pagefind.search(q || null, { filters: filters() });
      total = r.results.length;
      results = await Promise.all(r.results.slice(0, 8).map((x) => x.data()));
    } catch (e) { console.error(e); results = []; total = 0; }
    finally { searching = false; }
  }

  function toggle(tag) {
    const adding = !search.tags.includes(tag);
    toggleTag(tag);
    // If you typed "personal agents" to find the tag, the text has done its job
    // the moment the tag is chosen; leaving it behind double-narrows results.
    if (adding && search.query) setQuery('');
    run();
    inputEl?.focus();
  }

  function toggleKind(kind) {
    kinds = kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind];
    run();
    inputEl?.focus();
  }

  let debounce;
  function onInput() {
    open = true;
    boot();
    clearTimeout(debounce);
    debounce = setTimeout(() => { setQuery(search.query); run(); }, 150);
  }

  function onKey(e) {
    if (e.key === 'Escape') { open = false; inputEl?.blur(); return; }
    // Token-input behaviour: with nothing typed, Backspace pops the last tag.
    if ((e.key === 'Backspace' || e.key === 'Delete') && search.query === '' && search.tags.length) {
      e.preventDefault();
      popTag();
      run();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, results.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, -1); }
    else if (e.key === 'Enter' && cursor >= 0 && results[cursor]) { window.location.href = results[cursor].url; }
  }

  function onDocClick(e) { if (rootEl && !rootEl.contains(e.target)) open = false; }

  // The palette is for jumping; the catalogue is for browsing. Same ?q=&tags=
  // either way, so handing off is a link, not a re-query.
  let handoff = $derived(CATALOGUE + (search.query || search.tags.length ? queryString() : ''));

  // Hydrate ONCE, at init, outside any $effect: an effect that reads the query
  // would re-read the URL on every keystroke and clobber what was just typed.
  if (typeof window !== 'undefined') hydrateFromUrl();

  $effect(() => {
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  });
</script>

<div class="pfs" bind:this={rootEl}>
  <div class="pfs__bar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    {#each search.tags as t}
      <TagChip tagString={t} removable onclick={() => toggle(t)} />
    {/each}
    <input
      bind:this={inputEl}
      bind:value={search.query}
      oninput={onInput}
      onfocus={() => { open = true; boot(); }}
      onkeydown={onKey}
      type="search"
      {placeholder}
      aria-label="Search FullStack VC"
      autocomplete="off"
    />
  </div>

  {#if open}
    <div class="pfs__panel" role="listbox">
      {#if failed}
        <p class="pfs__msg">Search index unavailable. Run <code>pnpm build</code>, or <code>pnpm search:dev</code> while the dev server is up.</p>
      {:else}
        {#if allKinds.length}
          <div class="pfs__sec">
            <span class="pfs__hd">Show</span>
            <div class="pfs__tags">
              {#each allKinds as k}
                <TagChip tagString={k.value} count={k.count} showCount isSelected={kinds.includes(k.value)} onclick={() => toggleKind(k.value)} />
              {/each}
            </div>
          </div>
        {/if}

        {#if tagMatches.length}
          <div class="pfs__sec">
            <span class="pfs__hd">Tags</span>
            <div class="pfs__tags">
              {#each tagMatches as t}
                <TagChip tagString={t.value} count={t.count} showCount onclick={() => toggle(t.value)} />
              {/each}
            </div>
          </div>
        {/if}

        <div class="pfs__sec">
          <span class="pfs__hd">
            {searching ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`}
            {#if search.tags.length > 1}<em> · all {search.tags.length} tags must match</em>{/if}
          </span>
          {#each results as r, i}
            <a class="pfs__hit" class:pfs__hit--on={i === cursor} href={r.url}>
              <span class="pfs__kind">{r.meta?.kind}</span>
              <strong>{r.meta?.title ?? r.url}</strong>
              {#if r.excerpt}<span class="pfs__ex">{@html r.excerpt}</span>{/if}
              {#if r.filters?.tag?.length}
                <span class="pfs__meta">{r.filters.tag.slice(0, 4).map((t) => t.replace(/-/g, ' ')).join(' · ')}</span>
              {/if}
            </a>
          {/each}
          {#if results.length}
            <a class="pfs__all" href={handoff}>Browse the tool catalogue with these filters →</a>
          {/if}
          {#if !searching && !results.length}
            <p class="pfs__msg">
              {search.query.trim() || search.tags.length || kinds.length
                ? 'Nothing matches. Try removing a tag.'
                : 'Pick a tag, or start typing.'}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Anchored spill-out panel: absolute under the bar on desktop, a fixed sheet
     on small screens. Colours come from the semantic tokens, never raw hex. */
  .pfs { position: relative; width: 100%; }

  /* One row, always: the bar lives in a sticky header, so chips must never
     wrap it taller. Selected chips scroll sideways inside the bar instead. */
  .pfs__bar {
    display: flex; align-items: center; gap: .35rem; flex-wrap: nowrap;
    overflow-x: auto; scrollbar-width: none;
    padding: .4rem .65rem;
    border-radius: .5rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: border-color .15s ease;
  }
  .pfs__bar:focus-within { border-color: var(--color-primary); }
  .pfs__bar::-webkit-scrollbar { display: none; }
  .pfs__bar svg { width: 15px; height: 15px; color: var(--color-text-muted); flex: none; }
  .pfs__bar :global(.tag-chip) { flex: none; }
  .pfs__bar input {
    flex: 1 1 6rem; min-width: 4.5rem; border: 0; background: none;
    color: var(--color-text); font: inherit; font-size: .875rem; outline: none;
  }
  .pfs__bar input::placeholder { color: var(--color-text-muted); }

  .pfs__panel {
    position: absolute; left: 0; right: 0; top: calc(100% + .45rem); z-index: 80;
    min-width: min(28rem, 92vw);
    max-height: min(65vh, 32rem); overflow-y: auto;
    padding: .5rem;
    border-radius: .625rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    box-shadow: 0 18px 50px color-mix(in srgb, var(--color-text) 18%, transparent);
  }

  .pfs__sec + .pfs__sec { margin-top: .5rem; padding-top: .5rem; border-top: 1px solid var(--color-border); }
  .pfs__hd {
    display: block; font-family: var(--font-code); font-size: .66rem; text-transform: uppercase;
    letter-spacing: .1em; color: var(--color-text-muted);
    padding: .2rem .35rem .35rem;
  }
  .pfs__hd em { font-style: normal; text-transform: none; letter-spacing: 0; }

  .pfs__tags { display: flex; flex-wrap: wrap; gap: .35rem; padding: 0 .35rem .2rem; }

  .pfs__hit {
    display: block; padding: .45rem .4rem; border-radius: .375rem;
    text-decoration: none; color: var(--color-text);
  }
  .pfs__hit:hover, .pfs__hit--on { background: var(--color-surface); }
  .pfs__kind {
    display: block; font-family: var(--font-code); font-size: .62rem; text-transform: uppercase;
    letter-spacing: .1em; color: var(--color-primary);
  }
  .pfs__hit strong { display: block; font-size: .92rem; }
  .pfs__ex { display: block; font-size: .8rem; color: var(--color-text-muted); margin-top: .1rem; line-height: 1.45; }
  .pfs__meta { display: block; font-size: .7rem; color: var(--color-text-muted); opacity: .8; margin-top: .15rem; }
  .pfs__msg { padding: .5rem .35rem; font-size: .84rem; color: var(--color-text-muted); margin: 0; }

  /* Pagefind excerpts carry <mark>, which arrives through {@html} where scoped
     styles cannot reach. Left alone the browser paints it bright yellow, which
     is not a colour this brand owns. */
  .pfs__ex :global(mark),
  .pfs__hit :global(mark) {
    background: color-mix(in srgb, var(--color-primary) 22%, transparent);
    color: var(--color-text);
    border-radius: 2px;
    padding: 0 .15em;
    font-weight: 600;
  }
  .pfs__all {
    display: block; margin-top: .35rem; padding: .45rem .4rem;
    font-size: .82rem; color: var(--color-primary); text-decoration: none;
    border-top: 1px solid var(--color-border);
  }
  .pfs__all:hover { background: var(--color-surface); }

  @media (max-width: 720px) {
    .pfs__panel { position: fixed; inset: auto .5rem .5rem .5rem; top: auto; max-height: 70vh; min-width: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .pfs__bar { transition: none; } }
</style>
