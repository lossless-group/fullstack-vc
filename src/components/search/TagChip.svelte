<script>
  /**
   * TagChip — a tag drawn as a control, inside the search islands.
   *
   * Ported from sites/lossless-toolkit-site (src/components/TagChip.svelte),
   * with colours rewired to this site's semantic tokens.
   *
   * Train-Case is the storage form (`Personal-Agents`); Normal Case is the
   * display form (`Personal Agents`). Callers always pass the stored value —
   * converting on render means the two can never drift.
   */

  let {
    tagString,
    count = 0,
    isSelected = false,
    showCount = false,
    removable = false,
    title = '',
    onclick,
  } = $props();

  const normalCase = $derived(
    typeof tagString === 'string'
      ? tagString.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : String(tagString)
  );

  const effectiveTitle = $derived(
    title || (removable ? `Remove ${normalCase}` : `Filter by ${normalCase}`)
  );

  const ariaLabel = $derived(
    removable
      ? `Remove filter ${normalCase}`
      : `Filter by ${normalCase}${isSelected ? ' (currently selected)' : ''}`
  );

  function fire(e) {
    e.preventDefault();
    e.stopPropagation();
    onclick?.({ tag: tagString, selected: !isSelected });
  }

  function onKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') fire(e);
  }
</script>

<span
  class="tag-chip"
  class:selected={isSelected}
  class:removable
  title={effectiveTitle}
  aria-label={ariaLabel}
  aria-pressed={removable ? undefined : isSelected}
  data-tag={tagString}
  role="button"
  tabindex="0"
  onclick={fire}
  onkeydown={onKeydown}
>
  <span class="tag-chip__label">{normalCase}</span>
  {#if showCount && count > 0}<span class="tag-chip__count">{count}</span>{/if}
  {#if removable}<span class="tag-chip__x" aria-hidden="true">×</span>{/if}
</span>

<style>
  /* A control, not a label: the hit area stays tappable and .selected keeps a
     solid fill, the only cue for which facets are active. */
  .tag-chip {
    display: inline-flex; align-items: center; gap: .35em;
    white-space: nowrap; cursor: pointer;
    padding: .3em .6em; border-radius: .375rem;
    background: none; color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    font-family: var(--font-code);
    font-size: .68rem; letter-spacing: .04em; line-height: 1.4;
    transition: border-color .15s ease, background .15s ease, color .15s ease;
  }
  .tag-chip:hover { border-color: var(--color-primary); color: var(--color-text); }
  .tag-chip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  .tag-chip__count { color: var(--color-text-muted); opacity: .75; font-size: .9em; }
  .tag-chip.selected,
  .tag-chip.removable {
    background: var(--color-primary); color: var(--color-background); border-color: transparent;
  }
  .tag-chip.selected .tag-chip__count,
  .tag-chip.removable .tag-chip__count { color: inherit; }
  .tag-chip.removable .tag-chip__x { font-size: 1.05em; opacity: .75; }
  .tag-chip.removable:hover .tag-chip__x { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .tag-chip { transition: none; } }
</style>
