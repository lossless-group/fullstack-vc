<script lang="ts">
  /*
    StackBuilder — interactive multi-column stack editor (Svelte 5 runes).

    v2 scope:
      - Three buckets: current / aspirational / abandoned
      - Pill toggles for which buckets are visible (at-least-one invariant)
      - Single-pill: single-column max-w 36rem
      - Two-pill: side-by-side max-w 60rem
      - Three-pill: snap to two-up of the most-recently-toggled pair + a
        "more →" peek affordance (simpler than a true 3-col)
      - Pill state persists in localStorage per-handle
      - svelte-dnd-action wires drag within and across columns
      - Cross-column drops show an inline reshape form (notes ↔ intent ↔ reason)
      - Optimistic UI + dirty banner + Cmd/Ctrl+Z undo (LIFO, depth 10)
      - Save sends full snapshot of all three buckets
    See context-v/tasks/Redesign-Stack-Builder-with-Multi-Column-Drag-Drop.md
  */

  import { onMount, onDestroy, untrack } from 'svelte';
  import StackBucket from './StackBucket.svelte';
  import type {
    Bucket,
    DraggableItem,
    StackItem,
    ToolEntry,
    CurrentItem,
    AspirationalItem,
    AbandonedItem,
  } from './stack-types';
  import { reshape, labelForBucket } from './stack-types';

  interface Props {
    handle: string;
    initialName?: string;
    initialFirm?: string;
    initialPublic?: boolean;
    initialCurrent?: CurrentItem[];
    initialAspirational?: AspirationalItem[];
    initialAbandoned?: AbandonedItem[];
    avatar?: string;
  }

  let {
    handle,
    initialName = '',
    initialFirm = '',
    initialPublic = false,
    initialCurrent = [],
    initialAspirational = [],
    initialAbandoned = [],
    avatar,
  }: Props = $props();

  const PILLS_KEY = `stack-builder-pills:${handle}`;
  const DRAFT_KEY = `stack-builder-draft:${handle}`;

  // ─── Profile state ───────────────────────────────────────────────────────
  let name = $state(initialName);
  let firm = $state(initialFirm);
  let isPublic = $state(initialPublic);

  // ─── Bucket state ────────────────────────────────────────────────────────
  // The drag layer needs DraggableItem[] (with id + origin bucket + data).
  // We keep one array per bucket; cross-column moves shuffle items between
  // them on finalize via reshape().
  let currentItems      = $state<DraggableItem[]>(untrack(() => toDraggable(initialCurrent, 'current')));
  let aspirationalItems = $state<DraggableItem[]>(untrack(() => toDraggable(initialAspirational, 'aspirational')));
  let abandonedItems    = $state<DraggableItem[]>(untrack(() => toDraggable(initialAbandoned, 'abandoned')));

  function toDraggable(arr: StackItem[], bucket: Bucket): DraggableItem[] {
    return arr.map(d => ({ id: d.tool, bucket, data: d }));
  }

  // ─── Pill state ──────────────────────────────────────────────────────────
  // Default: only current pill on (matches today's single-bucket editor).
  let activeBuckets = $state<Set<Bucket>>(new Set<Bucket>(['current']));
  // Track most-recently-activated for the three-pill-active → two-up rule.
  let pillActivationOrder = $state<Bucket[]>(['current']);

  function togglePill(b: Bucket) {
    const next = new Set(activeBuckets);
    if (next.has(b)) {
      if (next.size === 1) return;  // at-least-one invariant
      next.delete(b);
      pillActivationOrder = pillActivationOrder.filter(x => x !== b);
    } else {
      next.add(b);
      pillActivationOrder = [...pillActivationOrder.filter(x => x !== b), b];
    }
    activeBuckets = next;
    persistPills();
  }

  // Visible buckets for the grid. When 3 pills are active, render the
  // most-recently-toggled pair + a "more →" peek of the third (which
  // is shown as a thin sidebar instead of a full column).
  let visibleBuckets = $derived.by<Bucket[]>(() => {
    if (activeBuckets.size <= 2) {
      // Preserve canonical order so the layout doesn't shuffle as pills toggle.
      return (['current', 'aspirational', 'abandoned'] as Bucket[]).filter(b => activeBuckets.has(b));
    }
    // 3 active → most-recent pair gets the two-up; oldest gets the peek.
    const recent = pillActivationOrder.slice(-2);
    return (['current', 'aspirational', 'abandoned'] as Bucket[]).filter(b => recent.includes(b));
  });

  let peekBucket = $derived.by<Bucket | null>(() => {
    if (activeBuckets.size !== 3) return null;
    const recent = new Set(pillActivationOrder.slice(-2));
    return (['current', 'aspirational', 'abandoned'] as Bucket[]).find(b => !recent.has(b)) ?? null;
  });

  let layoutMode = $derived(visibleBuckets.length === 1 ? 'single' : 'two-up');

  // ─── Tool catalog ────────────────────────────────────────────────────────
  let allTools = $state<ToolEntry[]>([]);
  let toolBySlug = $state<Map<string, ToolEntry>>(new Map());

  let occupiedSlugs = $derived.by(() => {
    const s = new Set<string>();
    for (const it of currentItems) s.add(it.id);
    for (const it of aspirationalItems) s.add(it.id);
    for (const it of abandonedItems) s.add(it.id);
    return s;
  });

  // ─── Reshape inline form state ───────────────────────────────────────────
  // Slugs currently showing the "moved to X" inline form.
  let showReshapeFor = $state<Set<string>>(new Set());
  // The carry-over text (e.g. previous notes when moved to aspirational).
  let reshapeTextFor = $state<Map<string, string>>(new Map());
  const reshapeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function triggerReshape(slug: string, prevText: string | undefined) {
    if (!prevText) return;  // nothing to carry over
    reshapeTextFor.set(slug, prevText);
    reshapeTextFor = new Map(reshapeTextFor);  // trigger reactivity
    showReshapeFor.add(slug);
    showReshapeFor = new Set(showReshapeFor);

    // Auto-dismiss after 5s (keep path).
    const existing = reshapeTimers.get(slug);
    if (existing) clearTimeout(existing);
    reshapeTimers.set(slug, setTimeout(() => clearReshape(slug, 'keep'), 5000));
  }
  function clearReshape(slug: string, _action: 'keep' | 'edit' | 'clear') {
    showReshapeFor.delete(slug);
    showReshapeFor = new Set(showReshapeFor);
    reshapeTextFor.delete(slug);
    reshapeTextFor = new Map(reshapeTextFor);
    const t = reshapeTimers.get(slug);
    if (t) { clearTimeout(t); reshapeTimers.delete(slug); }
  }
  function onReshapeAction(slug: string, action: 'keep' | 'edit' | 'clear') {
    if (action === 'clear') {
      // Wipe whatever per-bucket field carried over.
      replaceItemInItsBucket(slug, item => {
        const cleared = { ...item.data } as any;
        delete cleared.notes;
        delete cleared.intent;
        delete cleared.reason;
        return { ...item, data: cleared };
      });
    }
    // 'edit' just dismisses the form so the user can type in the textarea;
    // 'keep' accepts the carried-over value (which is already in the item).
    clearReshape(slug, action);
  }

  function replaceItemInItsBucket(slug: string, fn: (it: DraggableItem) => DraggableItem) {
    const update = (arr: DraggableItem[]) => arr.map(it => it.id === slug ? fn(it) : it);
    currentItems = update(currentItems);
    aspirationalItems = update(aspirationalItems);
    abandonedItems = update(abandonedItems);
  }

  // ─── DnD finalize wiring ─────────────────────────────────────────────────
  // Each StackBucket emits an onChange(next) when svelte-dnd-action's finalize
  // fires. The child has already produced the new array — we just need to
  // reshape cross-bucket arrivals and snapshot for undo.
  function handleBucketChange(targetBucket: Bucket, next: DraggableItem[]) {
    pushUndoSnapshot();

    // Reshape any items whose origin bucket differs from this target.
    const reshaped = next.map(it => {
      if (it.bucket === targetBucket) return it;
      const newData = reshape(it, targetBucket);
      const prevText = (it.data as any).notes ?? (it.data as any).intent ?? (it.data as any).reason;
      // Defer the reshape-form trigger until after state lands.
      queueMicrotask(() => triggerReshape(it.id, prevText));
      announce(`Moved ${it.id} from ${labelForBucket(it.bucket)} to ${labelForBucket(targetBucket)}`);
      return { id: it.id, bucket: targetBucket, data: newData };
    });

    // Set the target bucket.
    if (targetBucket === 'current')      currentItems      = reshaped;
    if (targetBucket === 'aspirational') aspirationalItems = reshaped;
    if (targetBucket === 'abandoned')    abandonedItems    = reshaped;

    // Cross-column move: the source bucket also needs to lose the item.
    // svelte-dnd-action does this for us when both zones share the same
    // `type` AND are mounted simultaneously. To be safe, prune the source
    // arrays of anything whose id is in `reshaped` but whose origin differs.
    const arrivedIds = new Set(reshaped.filter(r => r.bucket !== targetBucket).map(r => r.id));
    if (targetBucket !== 'current')      currentItems      = currentItems.filter(it => !arrivedIds.has(it.id));
    if (targetBucket !== 'aspirational') aspirationalItems = aspirationalItems.filter(it => !arrivedIds.has(it.id));
    if (targetBucket !== 'abandoned')    abandonedItems    = abandonedItems.filter(it => !arrivedIds.has(it.id));

    markEdited();
  }

  // ─── Add/remove/text ops per bucket ──────────────────────────────────────
  function addToBucket(bucket: Bucket, slug: string) {
    pushUndoSnapshot();
    const today = new Date().toISOString().slice(0, 10);
    let data: StackItem;
    if (bucket === 'current')          data = { tool: slug, added: today };
    else if (bucket === 'aspirational') data = { tool: slug };
    else                                data = { tool: slug, abandoned: today };
    const item: DraggableItem = { id: slug, bucket, data };
    if (bucket === 'current')      currentItems      = [...currentItems, item];
    if (bucket === 'aspirational') aspirationalItems = [...aspirationalItems, item];
    if (bucket === 'abandoned')    abandonedItems    = [...abandonedItems, item];
    markEdited();
  }
  function removeFromBucket(bucket: Bucket, slug: string) {
    pushUndoSnapshot();
    if (bucket === 'current')      currentItems      = currentItems.filter(it => it.id !== slug);
    if (bucket === 'aspirational') aspirationalItems = aspirationalItems.filter(it => it.id !== slug);
    if (bucket === 'abandoned')    abandonedItems    = abandonedItems.filter(it => it.id !== slug);
    markEdited();
  }
  function updateTextInBucket(bucket: Bucket, slug: string, value: string) {
    const fieldKey = bucket === 'current' ? 'notes' : bucket === 'aspirational' ? 'intent' : 'reason';
    replaceItemInItsBucket(slug, it => ({ ...it, data: { ...it.data, [fieldKey]: value } }));
    markEdited();
  }

  // ─── Within-column ↑/↓ reorder (mobile fallback) ─────────────────────────
  function reorderInBucket(bucket: Bucket, slug: string, direction: 'up' | 'down') {
    pushUndoSnapshot();
    const arr = (bucket === 'current' ? currentItems : bucket === 'aspirational' ? aspirationalItems : abandonedItems).slice();
    const idx = arr.findIndex(it => it.id === slug);
    if (idx < 0) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    if (bucket === 'current')      currentItems      = arr;
    if (bucket === 'aspirational') aspirationalItems = arr;
    if (bucket === 'abandoned')    abandonedItems    = arr;
    markEdited();
  }

  // ─── Move modal (mobile fallback for cross-column moves) ─────────────────
  let moveModalState = $state<{ slug: string; from: Bucket } | null>(null);
  function requestMove(from: Bucket, slug: string) {
    moveModalState = { slug, from };
  }
  function performMove(to: Bucket) {
    const m = moveModalState;
    if (!m) return;
    if (m.from === to) { moveModalState = null; return; }
    pushUndoSnapshot();
    const sourceArr = (m.from === 'current' ? currentItems : m.from === 'aspirational' ? aspirationalItems : abandonedItems);
    const item = sourceArr.find(it => it.id === m.slug);
    if (!item) { moveModalState = null; return; }
    // Remove from source.
    if (m.from === 'current')      currentItems      = currentItems.filter(it => it.id !== m.slug);
    if (m.from === 'aspirational') aspirationalItems = aspirationalItems.filter(it => it.id !== m.slug);
    if (m.from === 'abandoned')    abandonedItems    = abandonedItems.filter(it => it.id !== m.slug);
    // Reshape + append to dest.
    const newData = reshape(item, to);
    const newItem: DraggableItem = { id: item.id, bucket: to, data: newData };
    if (to === 'current')      currentItems      = [...currentItems, newItem];
    if (to === 'aspirational') aspirationalItems = [...aspirationalItems, newItem];
    if (to === 'abandoned')    abandonedItems    = [...abandonedItems, newItem];
    // Same reshape inline form pattern as the drag path.
    const prevText = (item.data as any).notes ?? (item.data as any).intent ?? (item.data as any).reason;
    queueMicrotask(() => triggerReshape(item.id, prevText));
    markEdited();
    moveModalState = null;
  }

  // ─── Undo stack ──────────────────────────────────────────────────────────
  type Snapshot = {
    current: DraggableItem[];
    aspirational: DraggableItem[];
    abandoned: DraggableItem[];
  };
  let undoStack = $state<Snapshot[]>([]);
  const UNDO_DEPTH = 10;
  function pushUndoSnapshot() {
    const snap: Snapshot = {
      current: structuredClone($state.snapshot(currentItems)),
      aspirational: structuredClone($state.snapshot(aspirationalItems)),
      abandoned: structuredClone($state.snapshot(abandonedItems)),
    };
    undoStack = [...undoStack, snap].slice(-UNDO_DEPTH);
  }
  function undo() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    currentItems      = last.current;
    aspirationalItems = last.aspirational;
    abandonedItems    = last.abandoned;
    undoStack = undoStack.slice(0, -1);
    markEdited();
  }

  // ─── Save state machine ──────────────────────────────────────────────────
  type SaveStatus =
    | { kind: 'idle' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved'; profileUrl: string; total: number; at: number }
    | { kind: 'error'; message: string };
  let status = $state<SaveStatus>({ kind: 'idle' });
  let lastSavedSnapshot = $state('');

  function snapshotForDirty(): string {
    return JSON.stringify({
      handle, name, firm, isPublic,
      c: currentItems.map(i => i.data),
      a: aspirationalItems.map(i => i.data),
      x: abandonedItems.map(i => i.data),
    });
  }
  function isDirty(): boolean { return snapshotForDirty() !== lastSavedSnapshot; }

  function markEdited() {
    persistDraft();
    if (status.kind === 'saved' || status.kind === 'idle') status = { kind: 'dirty' };
  }

  function persistDraft() {
    try { localStorage.setItem(DRAFT_KEY, snapshotForDirty()); } catch {}
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.handle !== handle) return;
      if (typeof parsed.name === 'string') name = parsed.name;
      if (typeof parsed.firm === 'string') firm = parsed.firm;
      if (typeof parsed.isPublic === 'boolean') isPublic = parsed.isPublic;
      if (Array.isArray(parsed.c)) currentItems      = toDraggable(parsed.c, 'current');
      if (Array.isArray(parsed.a)) aspirationalItems = toDraggable(parsed.a, 'aspirational');
      if (Array.isArray(parsed.x)) abandonedItems    = toDraggable(parsed.x, 'abandoned');
    } catch {}
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

  function persistPills() {
    try {
      localStorage.setItem(PILLS_KEY, JSON.stringify({
        active: Array.from(activeBuckets),
        order: pillActivationOrder,
      }));
    } catch {}
  }
  function loadPills() {
    try {
      const raw = localStorage.getItem(PILLS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.active) && parsed.active.length > 0) {
        activeBuckets = new Set(parsed.active);
      }
      if (Array.isArray(parsed.order)) {
        pillActivationOrder = parsed.order;
      }
    } catch {}
  }

  async function save() {
    if (status.kind === 'saving') return;
    status = { kind: 'saving' };
    try {
      const res = await fetch('/api/stack/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          name,
          firm: firm || undefined,
          publish: isPublic,
          current_stack:      currentItems.map(i => i.data),
          aspirational_stack: aspirationalItems.map(i => i.data),
          abandoned_stack:    abandonedItems.map(i => i.data),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ? `${err.error}: ${err.detail}` : (err?.error ?? `save failed: ${res.status}`));
      }
      const body = await res.json();
      lastSavedSnapshot = snapshotForDirty();
      clearDraft();
      status = {
        kind: 'saved',
        profileUrl: body.profileUrl,
        total: typeof body.total === 'number' ? body.total : 0,
        at: Date.now(),
      };
    } catch (e: any) {
      status = { kind: 'error', message: String(e?.message ?? e) };
    }
  }

  function statusLabel(s: SaveStatus): string {
    if (s.kind === 'idle')   return 'Up to date';
    if (s.kind === 'dirty')  return `Unsaved changes${undoStack.length ? ` (${undoStack.length})` : ''}`;
    if (s.kind === 'saving') return 'Saving…';
    if (s.kind === 'saved')  return 'Saved — your edits are live for you; the public page updates on the next sync.';
    if (s.kind === 'error')  return `Save failed — try again. ${s.message}`;
    return '';
  }

  // ─── Lifecycle + global keybinds ─────────────────────────────────────────
  onMount(async () => {
    lastSavedSnapshot = snapshotForDirty();
    loadPills();
    loadDraft();
    if (snapshotForDirty() !== lastSavedSnapshot) status = { kind: 'dirty' };

    try {
      const res = await fetch('/api/tools.json');
      if (res.ok) {
        allTools = await res.json();
        toolBySlug = new Map(allTools.map(t => [t.slug, t]));
      }
    } catch {}

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    for (const t of reshapeTimers.values()) clearTimeout(t);
  });

  function onKeydown(e: KeyboardEvent) {
    // Cmd/Ctrl+Z anywhere (except inside a textarea/input — let the browser
    // handle text-undo there).
    const tgt = e.target as HTMLElement | null;
    const inText = tgt && (tgt.tagName === 'TEXTAREA' || tgt.tagName === 'INPUT');
    if (!inText && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Esc closes the move modal.
    if (e.key === 'Escape' && moveModalState) {
      moveModalState = null;
    }
  }

  // ─── SR-only live region for drag announcements ──────────────────────────
  let liveAnnouncement = $state('');
  function announce(msg: string) {
    liveAnnouncement = msg;
    // Clear after a moment so consecutive identical announcements re-fire.
    setTimeout(() => { if (liveAnnouncement === msg) liveAnnouncement = ''; }, 1500);
  }
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && isDirty() && status.kind !== 'saving') save();
  }
</script>

<!-- SR-only live region for drag/move announcements. role="status" +
     aria-live="polite" so screen readers announce without interrupting. -->
<div class="sb__sr-live" role="status" aria-live="polite" aria-atomic="true">
  {liveAnnouncement}
</div>

<div class={`sb sb--${layoutMode}`}>
  <header class="sb__head">
    {#if avatar}
      <img class="sb__avatar" src={avatar} alt="" loading="lazy" />
    {:else}
      <span class="sb__avatar sb__avatar--initials" aria-hidden="true">
        {(name || handle).split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase()).join('')}
      </span>
    {/if}
    <div>
      <p class="sb__head-eyebrow">@{handle}</p>
      <h2 class="sb__head-title">Edit your stack</h2>
    </div>
  </header>

  <section class="sb__section">
    <h3 class="sb__section-title">Profile</h3>
    <div class="sb__row">
      <label class="sb__label">
        <span>Name</span>
        <input class="sb__input" type="text" bind:value={name} oninput={markEdited} maxlength="120" />
      </label>
      <label class="sb__label">
        <span>Firm</span>
        <input class="sb__input" type="text" bind:value={firm} oninput={markEdited} maxlength="120" placeholder="Optional" />
      </label>
    </div>
    <label class="sb__toggle">
      <input type="checkbox" bind:checked={isPublic} onchange={markEdited} />
      <span>Make my profile public at <code>/people/{handle}</code></span>
    </label>
  </section>

  <section class="sb__section">
    <div class="sb__pills" role="tablist" aria-label="Visible stack buckets">
      {#each ['current', 'aspirational', 'abandoned'] as Bucket[] as b}
        <button
          type="button"
          role="tab"
          class="sb__pill"
          class:is-active={activeBuckets.has(b)}
          aria-pressed={activeBuckets.has(b)}
          onclick={() => togglePill(b)}
        >
          <span class="sb__pill-dot" aria-hidden="true"></span>
          {labelForBucket(b)}
        </button>
      {/each}
      {#if layoutMode === 'two-up'}
        <span class="sb__pills-mode" aria-hidden="true">Two-up ◧</span>
      {/if}
    </div>

    <div class={`sb__grid sb__grid--${layoutMode}`}>
      {#each visibleBuckets as b (b)}
        {@const items = b === 'current' ? currentItems : b === 'aspirational' ? aspirationalItems : abandonedItems}
        <StackBucket
          bucket={b}
          {items}
          {toolBySlug}
          {allTools}
          {occupiedSlugs}
          {showReshapeFor}
          {reshapeTextFor}
          onChange={(next) => handleBucketChange(b, next)}
          onAdd={(slug) => addToBucket(b, slug)}
          onRemove={(slug) => removeFromBucket(b, slug)}
          onUpdateText={(slug, v) => updateTextInBucket(b, slug, v)}
          {onReshapeAction}
          onRequestMove={(slug) => requestMove(b, slug)}
          onReorder={(slug, dir) => reorderInBucket(b, slug, dir)}
        />
      {/each}
    </div>

    {#if peekBucket}
      {@const peekItems = peekBucket === 'current' ? currentItems : peekBucket === 'aspirational' ? aspirationalItems : abandonedItems}
      <p class="sb__peek">
        <strong>{labelForBucket(peekBucket)}</strong> ({peekItems.length})
        <button type="button" class="sb__peek-btn" onclick={() => {
          // Promote the peek bucket — pop the oldest of the two-up pair.
          const recent = pillActivationOrder.slice(-2);
          if (recent.length === 2) togglePill(recent[0]);
          togglePill(peekBucket!);
        }}>view →</button>
      </p>
    {/if}
  </section>

  {#if moveModalState}
    <div class="sb__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sb-move-title" onclick={() => (moveModalState = null)}>
      <div class="sb__modal" onclick={(e) => e.stopPropagation()}>
        <h3 id="sb-move-title" class="sb__modal-title">Move to…</h3>
        <p class="sb__modal-lede">
          {toolBySlug.get(moveModalState.slug)?.site_name ?? moveModalState.slug}
          — currently in <strong>{labelForBucket(moveModalState.from)}</strong>
        </p>
        <div class="sb__modal-buckets">
          {#each ['current', 'aspirational', 'abandoned'] as Bucket[] as b}
            {#if b !== moveModalState.from}
              <button type="button" class="sb__modal-bucket" onclick={() => performMove(b)}>
                {labelForBucket(b)}
              </button>
            {/if}
          {/each}
        </div>
        <button type="button" class="sb__modal-cancel" onclick={() => (moveModalState = null)}>Cancel</button>
      </div>
    </div>
  {/if}

  <footer class="sb__foot">
    <p class={`sb__status sb__status--${status.kind}`}>{statusLabel(status)}</p>
    <div class="sb__actions">
      {#if undoStack.length > 0}
        <button type="button" class="sb__btn sb__btn--ghost" onclick={undo} title="Cmd/Ctrl+Z">Undo</button>
      {/if}
      {#if status.kind === 'saved'}
        <a class="sb__btn sb__btn--ghost" href={status.profileUrl}>View live →</a>
      {/if}
      <button
        type="button"
        class="sb__btn sb__btn--primary"
        onclick={save}
        disabled={status.kind === 'saving' || (status.kind !== 'dirty' && status.kind !== 'error')}
      >
        {status.kind === 'saving' ? 'Saving…' : 'Save now'}
      </button>
    </div>
  </footer>
</div>

<style>
  /* Visually-hidden but screen-reader-accessible. Standard sr-only recipe. */
  .sb__sr-live {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .sb {
    margin-inline: auto;
    transition: max-width 200ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .sb { transition: none; }
  }
  .sb--single { max-width: 36rem; }
  .sb--two-up { max-width: 60rem; }

  .sb__head {
    display: flex; align-items: center; gap: 1rem;
    margin-bottom: 2rem; padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .sb__avatar {
    width: 4rem; height: 4rem; border-radius: 50%;
    border: 2px solid var(--color-primary);
    object-fit: cover; flex: 0 0 auto;
  }
  .sb__avatar--initials {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--color-surface); color: var(--color-primary);
    font-family: var(--font-display); font-weight: 700; font-size: 1.5rem;
  }
  .sb__head-eyebrow {
    margin: 0; font-family: var(--font-code);
    font-size: 0.75rem; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-text-muted);
  }
  .sb__head-title { margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 700; }

  .sb__section {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    background: var(--fx-card-bg, transparent);
  }
  .sb__section-title { margin: 0 0 0.75rem; font-family: var(--font-display); font-size: 1.0625rem; font-weight: 700; }
  .sb__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
  @media (max-width: 600px) { .sb__row { grid-template-columns: 1fr; } }
  .sb__label { display: flex; flex-direction: column; gap: 0.25rem; font-family: var(--font-code); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
  .sb__input { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-background); color: var(--color-text); font-family: var(--font-body); font-size: 0.9375rem; }
  .sb__input:focus { outline: none; border-color: var(--color-primary); }
  .sb__toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--color-text); cursor: pointer; }
  .sb__toggle code { padding: 0.0625rem 0.375rem; border-radius: 0.25rem; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-primary); }

  /* ── Pills ───────────────────────────────────────────────────────────── */
  .sb__pills {
    display: flex; align-items: center; gap: 0.5rem;
    margin-bottom: 1rem; flex-wrap: wrap;
  }
  .sb__pill {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-muted);
    font-family: var(--font-code); font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    cursor: pointer;
    transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
  }
  .sb__pill-dot { width: 0.4375rem; height: 0.4375rem; border-radius: 50%; border: 1px solid currentColor; background: transparent; }
  .sb__pill.is-active { color: var(--color-text); border-color: var(--color-primary); }
  .sb__pill.is-active .sb__pill-dot { background: var(--color-primary); border-color: var(--color-primary); }
  .sb__pills-mode {
    margin-left: auto;
    font-family: var(--font-code); font-size: 0.6875rem;
    color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;
  }

  /* ── Grid ────────────────────────────────────────────────────────────── */
  .sb__grid--single { display: block; }
  .sb__grid--two-up { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 768px) {
    .sb__grid--two-up { grid-template-columns: 1fr; }
  }

  .sb__peek {
    margin: 1rem 0 0;
    padding: 0.625rem 0.875rem;
    border: 1px dashed var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text-muted);
    font-family: var(--font-code); font-size: 0.75rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .sb__peek strong { color: var(--color-text); }
  .sb__peek-btn {
    margin-left: auto;
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-primary);
    font-family: var(--font-code); font-size: 0.6875rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer;
  }
  .sb__peek-btn:hover { border-color: var(--color-primary); }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  .sb__foot {
    display: flex; align-items: center; gap: 1rem;
    margin-top: 1.5rem; padding: 1rem 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--fx-card-bg, transparent);
  }
  .sb__status { margin: 0; font-family: var(--font-code); font-size: 0.8125rem; }
  .sb__status--idle    { color: var(--color-text-muted); }
  .sb__status--dirty   { color: rgb(245, 158, 11); }
  .sb__status--saving  { color: var(--color-primary); }
  .sb__status--saved   { color: rgb(34, 197, 94); }
  .sb__status--error   { color: rgb(239, 68, 68); }
  .sb__actions { margin-left: auto; display: flex; gap: 0.5rem; }
  .sb__btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-family: var(--font-code); font-size: 0.8125rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    background: transparent; color: var(--color-text);
    cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }
  .sb__btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
  .sb__btn--primary {
    background: var(--color-primary); color: var(--color-background); border-color: var(--color-primary);
  }
  .sb__btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 80%, white); color: var(--color-background); }
  .sb__btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Move modal (mobile fallback for cross-bucket moves) ──────────────── */
  .sb__modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    padding: 1rem;
  }
  .sb__modal {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    max-width: 24rem; width: 100%;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  }
  .sb__modal-title { margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 1.125rem; font-weight: 700; }
  .sb__modal-lede { margin: 0 0 1rem; color: var(--color-text-muted); font-size: 0.875rem; }
  .sb__modal-lede strong { color: var(--color-text); }
  .sb__modal-buckets { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
  .sb__modal-bucket {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-code); font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
  }
  .sb__modal-bucket:hover { border-color: var(--color-primary); color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, transparent); }
  .sb__modal-cancel {
    width: 100%;
    padding: 0.5rem;
    background: transparent;
    border: 0;
    color: var(--color-text-muted);
    font-family: var(--font-code); font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    cursor: pointer;
  }
</style>
