<script lang="ts">
  // StackBucket — one of the three columns in the multi-column StackBuilder.
  //
  // Renders a tool picker (search-to-add), the card list (with svelte-dnd-action
  // wiring), and optional reshape inline forms below newly-arrived cards.
  //
  // Drag/drop is wired by the parent (StackBuilder.svelte), not here — this
  // component just renders cards and emits events. Keeps the cross-column
  // logic in one place.

  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import type {
    Bucket,
    DraggableItem,
    StackItem,
    ToolEntry,
  } from './stack-types';
  import {
    labelForBucket,
    fieldKeyForBucket,
    placeholderForBucket,
  } from './stack-types';

  interface Props {
    bucket: Bucket;
    items: DraggableItem[];                    // owned by parent; parent reassigns on changes
    toolBySlug: Map<string, ToolEntry>;
    allTools: ToolEntry[];
    // Slugs currently in ANY bucket — to dedupe in the picker so a tool can't
    // be added to two buckets at once (unique_per_bucket index prevents this
    // server-side; the UI mirrors the constraint).
    occupiedSlugs: Set<string>;
    // Set of slugs currently showing the reshape inline form. Cleared by the
    // parent (auto-dismiss timer or user action).
    showReshapeFor: Set<string>;
    onChange: (next: DraggableItem[]) => void; // emits the new list (drag reorders / cross-column inserts)
    onAdd: (slug: string) => void;             // picker -> "add this tool to this bucket"
    onRemove: (slug: string) => void;
    onUpdateText: (slug: string, value: string) => void;
    onReshapeAction: (slug: string, action: 'keep' | 'edit' | 'clear') => void;
    // Mobile-fallback callbacks. Parent owns the modal + reorder logic.
    onRequestMove: (slug: string) => void;
    onReorder: (slug: string, direction: 'up' | 'down') => void;
    // Reshape preview text — the carry-over from the previous bucket, shown
    // until the user keeps/edits/clears.
    reshapeTextFor: Map<string, string>;
  }

  let {
    bucket,
    items,
    toolBySlug,
    allTools,
    occupiedSlugs,
    showReshapeFor,
    onChange,
    onAdd,
    onRemove,
    onUpdateText,
    onReshapeAction,
    reshapeTextFor,
    onRequestMove,
    onReorder,
  }: Props = $props();

  // ─── Picker state ─────────────────────────────────────────────────────────
  let pickerInput = $state('');
  let pickerOpen = $state(false);
  let pickerHighlight = $state(0);

  // Slug derivation for "create new" — lowercase, hyphen-separate, strip
  // non-alphanumerics. Matches the maintainer's filename convention for
  // src/content/tools/<slug>.md, so Michael can drop a markdown file with
  // the same slug later and the stack entry will pick up rich metadata.
  function deriveSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  let filteredTools = $derived.by(() => {
    const q = pickerInput.trim().toLowerCase();
    const available = allTools.filter(t => !occupiedSlugs.has(t.slug));
    if (!q) return available.slice(0, 8);
    return available
      .filter(t => {
        const hay = [t.slug, t.site_name, t.title, t.zinger, ...(t.tags ?? [])]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  });

  // Proposed slug from the current input. Shown as a "create new tool" option
  // when the user's input doesn't match an existing tool's slug exactly and
  // the proposed slug isn't already occupied in another bucket.
  let proposedSlug = $derived(deriveSlug(pickerInput));
  let canCreateNew = $derived(
    pickerInput.trim().length > 0 &&
    proposedSlug.length > 0 &&
    !allTools.some(t => t.slug === proposedSlug) &&
    !occupiedSlugs.has(proposedSlug)
  );

  function pick(slug: string) {
    if (!slug) return;
    onAdd(slug);
    pickerInput = '';
    pickerOpen = false;
    pickerHighlight = 0;
  }

  function createNew() {
    if (!canCreateNew) return;
    pick(proposedSlug);
  }

  function onPickerKeydown(e: KeyboardEvent) {
    // The dropdown can show: N existing matches + (optional) the "create new"
    // option as the last row. pickerHighlight indexes into that combined list.
    const totalRows = filteredTools.length + (canCreateNew ? 1 : 0);
    if (e.key === 'ArrowDown') {
      pickerHighlight = Math.min(pickerHighlight + 1, Math.max(0, totalRows - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      pickerHighlight = Math.max(pickerHighlight - 1, 0);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (!pickerOpen) return;
      if (pickerHighlight < filteredTools.length && filteredTools[pickerHighlight]) {
        pick(filteredTools[pickerHighlight].slug);
        e.preventDefault();
      } else if (canCreateNew) {
        createNew();
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      pickerOpen = false;
    }
  }

  // ─── DnD handlers — svelte-dnd-action emits two events:
  //   consider: drag preview (item hovering); update local items so the
  //             ghost slot renders. Don't commit to parent state yet — this
  //             event fires many times per second.
  //   finalize: drop completed; commit to parent.
  function handleConsider(e: CustomEvent<DndEvent<DraggableItem>>) {
    // Reassign items locally so the visual swap happens immediately.
    items = e.detail.items;
  }
  function handleFinalize(e: CustomEvent<DndEvent<DraggableItem>>) {
    // Commit upstream. Parent reconciles cross-column moves (the item's
    // `bucket` field may differ from this column's bucket; parent reshapes
    // and pushes the reshape inline form via showReshapeFor).
    onChange(e.detail.items);
  }

  const fieldKey = fieldKeyForBucket(bucket);
  const placeholder = placeholderForBucket(bucket);
  const label = labelForBucket(bucket);

  function valueFor(item: DraggableItem): string {
    return (item.data as any)[fieldKey] ?? '';
  }
</script>

<section class={`sbk sbk--${bucket}`} aria-labelledby={`sbk-${bucket}-title`}>
  <header class="sbk__head">
    <h3 id={`sbk-${bucket}-title`} class="sbk__title">{label}</h3>
    <span class="sbk__count">{items.length}</span>
  </header>

  <div class="sbk__picker">
    <input
      class="sbk__input"
      type="text"
      bind:value={pickerInput}
      onfocus={() => (pickerOpen = true)}
      onblur={() => setTimeout(() => (pickerOpen = false), 150)}
      onkeydown={onPickerKeydown}
      placeholder={`Add a tool to ${label.toLowerCase()}…`}
      aria-label={`Search tools to add to ${label}`}
      aria-autocomplete="list"
      aria-expanded={pickerOpen}
    />
    {#if pickerOpen && (filteredTools.length > 0 || canCreateNew)}
      <ul class="sbk__picker-results" role="listbox">
        {#each filteredTools as t, i (t.slug)}
          <li class="sbk__picker-result" class:is-active={i === pickerHighlight}>
            <button
              type="button"
              class="sbk__picker-btn"
              onmousedown={(e) => { e.preventDefault(); pick(t.slug); }}
              onmouseenter={() => (pickerHighlight = i)}
            >
              {#if t.og_favicon}
                <img src={t.og_favicon} alt="" loading="lazy" class="sbk__picker-favicon" />
              {/if}
              <span class="sbk__picker-name">{t.site_name ?? t.slug}</span>
              {#if t.zinger}
                <span class="sbk__picker-zinger">{t.zinger}</span>
              {/if}
            </button>
          </li>
        {/each}
        {#if canCreateNew}
          <li
            class="sbk__picker-result sbk__picker-result--new"
            class:is-active={pickerHighlight === filteredTools.length}
          >
            <button
              type="button"
              class="sbk__picker-btn sbk__picker-btn--new"
              onmousedown={(e) => { e.preventDefault(); createNew(); }}
              onmouseenter={() => (pickerHighlight = filteredTools.length)}
            >
              <span class="sbk__picker-new-icon" aria-hidden="true">+</span>
              <span class="sbk__picker-new-label">
                Add <strong>{pickerInput.trim()}</strong> as a new tool
              </span>
              <span class="sbk__picker-new-slug">{proposedSlug}</span>
            </button>
          </li>
        {/if}
      </ul>
    {/if}
  </div>

  <ul
    class="sbk__list"
    use:dndzone={{
      items,
      type: 'stack-card',
      flipDurationMs: 200,
      dropTargetStyle: {
        outline: 'rgba(125, 96, 255, 0.5) solid 2px',
        outlineOffset: '-2px',
        borderRadius: '0.5rem',
      },
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each items as item (item.id)}
      {@const tool = toolBySlug.get(item.id)}
      <li class="sbk__card">
        <div class="sbk__card-head">
          <span class="sbk__drag-handle" aria-hidden="true">⋮⋮</span>
          {#if tool?.og_favicon}
            <img src={tool.og_favicon} alt="" class="sbk__card-favicon" loading="lazy" />
          {/if}
          <div class="sbk__card-id">
            <p class="sbk__card-name">{tool?.site_name ?? item.id}</p>
            {#if tool?.zinger}<p class="sbk__card-zinger">{tool.zinger}</p>{/if}
          </div>
          <!-- Mobile-only Move + reorder buttons. Hidden above 768px where
               drag-and-drop is the primary interaction. -->
          <button
            class="sbk__mobile-btn sbk__mobile-btn--reorder"
            type="button"
            onclick={() => onReorder(item.id, 'up')}
            aria-label={`Move ${tool?.site_name ?? item.id} up`}
          >▲</button>
          <button
            class="sbk__mobile-btn sbk__mobile-btn--reorder"
            type="button"
            onclick={() => onReorder(item.id, 'down')}
            aria-label={`Move ${tool?.site_name ?? item.id} down`}
          >▼</button>
          <button
            class="sbk__mobile-btn sbk__mobile-btn--move"
            type="button"
            onclick={() => onRequestMove(item.id)}
            aria-label={`Move ${tool?.site_name ?? item.id} to another bucket`}
          >Move</button>
          <button
            class="sbk__remove"
            type="button"
            onclick={() => onRemove(item.id)}
            aria-label={`Remove ${tool?.site_name ?? item.id}`}
          >×</button>
        </div>

        <textarea
          class="sbk__text"
          {placeholder}
          maxlength="500"
          value={valueFor(item)}
          oninput={(e) => onUpdateText(item.id, (e.currentTarget as HTMLTextAreaElement).value)}
        ></textarea>

        {#if showReshapeFor.has(item.id) && reshapeTextFor.has(item.id)}
          <div class="sbk__reshape" role="status">
            <p class="sbk__reshape-msg">
              Moved to <strong>{label}</strong> · the previous note became:
            </p>
            <p class="sbk__reshape-preview">{reshapeTextFor.get(item.id)}</p>
            <div class="sbk__reshape-actions">
              <button type="button" class="sbk__reshape-btn" onclick={() => onReshapeAction(item.id, 'keep')}>Keep</button>
              <button type="button" class="sbk__reshape-btn" onclick={() => onReshapeAction(item.id, 'edit')}>Edit</button>
              <button type="button" class="sbk__reshape-btn sbk__reshape-btn--danger" onclick={() => onReshapeAction(item.id, 'clear')}>Clear</button>
            </div>
          </div>
        {/if}
      </li>
    {/each}

    {#if items.length === 0}
      <li class="sbk__empty">Drop tools here, or use the search above.</li>
    {/if}
  </ul>
</section>

<style>
  .sbk {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    background: var(--fx-card-bg, transparent);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    min-width: 0;       /* allow shrinking inside grid */
  }
  .sbk--current      { border-top: 2px solid var(--color-primary); }
  .sbk--aspirational { border-top: 2px solid color-mix(in srgb, var(--color-primary) 60%, transparent); }
  .sbk--abandoned    { border-top: 2px solid var(--color-text-muted); }

  .sbk__head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .sbk__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .sbk__count {
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    padding: 0.125rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
  }

  /* ── Picker ─────────────────────────────────────────────────────────── */
  .sbk__picker { position: relative; }
  .sbk__input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-text);
    font-family: var(--font-code);
    font-size: 0.8125rem;
  }
  .sbk__input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  .sbk__picker-results {
    position: absolute;
    z-index: 5;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    max-height: 18rem;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  .sbk__picker-result.is-active .sbk__picker-btn {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
  .sbk__picker-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 0;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
  }
  .sbk__picker-favicon { width: 1rem; height: 1rem; flex: 0 0 auto; }
  .sbk__picker-name { font-weight: 600; font-size: 0.8125rem; }
  .sbk__picker-zinger {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-left: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
  }
  .sbk__picker-empty {
    margin: 0.5rem 0 0;
    padding: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  /* "Add as a new tool" row — visually distinct from regular matches */
  .sbk__picker-result--new {
    border-top: 1px dashed var(--color-border);
    margin-top: 0.25rem;
    padding-top: 0.25rem;
  }
  .sbk__picker-result.is-active.sbk__picker-result--new .sbk__picker-btn--new {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  }
  .sbk__picker-btn--new {
    color: var(--color-accent);
  }
  .sbk__picker-btn--new:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .sbk__picker-new-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 700;
    font-size: 0.75rem;
    line-height: 1;
    flex: 0 0 auto;
  }
  .sbk__picker-new-label {
    font-size: 0.8125rem;
  }
  .sbk__picker-new-label strong {
    color: var(--color-text);
    font-weight: 600;
  }
  .sbk__picker-new-slug {
    margin-left: auto;
    font-family: var(--font-code, monospace);
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    padding: 0.125rem 0.375rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
  }

  /* ── Card list (dndzone target) ──────────────────────────────────────── */
  .sbk__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 4rem;     /* keep a target area even when empty */
  }
  .sbk__empty {
    padding: 1rem;
    text-align: center;
    border: 1px dashed var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
  }

  /* ── Card ───────────────────────────────────────────────────────────── */
  .sbk__card {
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    background: var(--color-background);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sbk__card-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .sbk__drag-handle {
    color: var(--color-text-muted);
    font-family: var(--font-code);
    font-size: 0.875rem;
    cursor: grab;
    user-select: none;
    padding: 0 0.125rem;
  }
  .sbk__drag-handle:active { cursor: grabbing; }
  .sbk__card-favicon { width: 1.25rem; height: 1.25rem; flex: 0 0 auto; }
  .sbk__card-id { flex: 1 1 auto; min-width: 0; }
  .sbk__card-name { margin: 0; font-weight: 600; font-size: 0.875rem; }
  .sbk__card-zinger {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sbk__remove {
    background: transparent;
    color: var(--color-text-muted);
    border: 0;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.25rem 0.375rem;
    border-radius: 0.25rem;
    transition: color 150ms ease, background 150ms ease;
  }
  .sbk__remove:hover { color: rgb(239, 68, 68); background: rgba(239, 68, 68, 0.08); }

  /* Mobile fallback affordances — visible only at <=768px where drag is
     unreliable on touch. Above the breakpoint, drag handle does the work. */
  .sbk__mobile-btn {
    display: none;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 0.25rem;
    font-family: var(--font-code);
    font-size: 0.6875rem;
    padding: 0.1875rem 0.375rem;
  }
  .sbk__mobile-btn--move { padding: 0.1875rem 0.5rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .sbk__mobile-btn:hover { color: var(--color-primary); border-color: var(--color-primary); }
  @media (max-width: 768px) {
    .sbk__mobile-btn { display: inline-flex; align-items: center; }
    .sbk__drag-handle { display: none; }
  }
  .sbk__text {
    width: 100%;
    min-height: 3rem;
    resize: vertical;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background: var(--color-background);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 0.8125rem;
    line-height: 1.45;
  }
  .sbk__text:focus { outline: none; border-color: var(--color-primary); }

  /* ── Reshape inline form ─────────────────────────────────────────────── */
  .sbk__reshape {
    margin-top: 0.25rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
    border-radius: 0.375rem;
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    font-size: 0.75rem;
  }
  .sbk__reshape-msg { margin: 0 0 0.25rem; color: var(--color-text-muted); }
  .sbk__reshape-preview {
    margin: 0 0 0.5rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: var(--font-body);
    font-style: italic;
    max-height: 4em;
    overflow: hidden;
  }
  .sbk__reshape-actions {
    display: flex;
    gap: 0.375rem;
    justify-content: flex-end;
  }
  .sbk__reshape-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: var(--font-code);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .sbk__reshape-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .sbk__reshape-btn--danger:hover { border-color: rgb(239, 68, 68); color: rgb(239, 68, 68); }
</style>
