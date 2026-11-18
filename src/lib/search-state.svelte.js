/**
 * One reactive atom for search, shared by every island that imports it.
 *
 * Ported from sites/lossless-toolkit-site (src/lib/toolkit-state.svelte.js).
 * Each `client:` directive mounts a separate Svelte root, but a module-level
 * `$state` object is a singleton across all of them (Vite dedupes the module),
 * so the header palette and the /stacks/see-all-tools/ filter bar read and
 * write the same selection in the same tick.
 *
 * The URL is the serialisation of this atom, not its source of truth: hydrate
 * from it once, write back on change, so any state reached is shareable.
 */

// The catalogue the palette hands off to, and the page whose URL we keep in sync.
export const CATALOGUE = '/stacks/see-all-tools/';

export const search = $state({
  query: '',
  tags: [], // stored Train-Case values, never display labels
});

export function toggleTag(tag) {
  search.tags = search.tags.includes(tag)
    ? search.tags.filter((t) => t !== tag)
    : [...search.tags, tag];
  writeUrl();
}

export function popTag() {
  if (search.tags.length) {
    search.tags = search.tags.slice(0, -1);
    writeUrl();
  }
}

export function setQuery(q) {
  search.query = q;
  writeUrl();
}

export function clearAll() {
  search.query = '';
  search.tags = [];
  writeUrl();
}

/** `?q=&tags=` for the current selection, or '' when nothing is selected. */
export function queryString() {
  const p = new URLSearchParams();
  if (search.query.trim()) p.set('q', search.query.trim());
  if (search.tags.length) p.set('tags', search.tags.join(','));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

/** Read once on boot. Safe to call from several islands; last write wins. */
export function hydrateFromUrl() {
  if (typeof window === 'undefined') return;
  const p = new URL(window.location.href).searchParams;
  search.query = p.get('q') ?? '';
  search.tags = (p.get('tags') ?? '').split(',').filter(Boolean);
}

/**
 * Only the catalogue page owns its query string. Anywhere else the palette is
 * a jump-to overlay, and rewriting an unrelated page's URL with ?q= would make
 * a link copied from it carry a stray search.
 */
export function writeUrl() {
  if (typeof window === 'undefined') return;
  if (location.pathname !== CATALOGUE) return;
  const next = CATALOGUE + queryString();
  if (location.pathname + location.search !== next) history.replaceState(null, '', next);
}
