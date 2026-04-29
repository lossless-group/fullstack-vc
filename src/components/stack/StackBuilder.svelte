<script lang="ts">
  /*
    StackBuilder — interactive stack editor.

    v0.5 scope:
      - profile: name, firm, publish toggle
      - current_stack only (aspirational/abandoned defer to v2)
      - tool typeahead from window.__STACK_TOOLS__ (passed in by the host page)
      - per-tool: notes textarea, remove button
      - localStorage draft buffer per handle
      - 5-minute idle auto-save when dirty
      - "Save now" button + inline status
      - on success: clear draft, show "publishing… ready in ~30s" with link
  */
  import { onMount, onDestroy } from 'svelte';

  type ToolEntry = {
    slug: string;
    site_name?: string;
    title?: string;
    zinger?: string;
    og_favicon?: string;
    tags?: string[];
  };

  type CurrentItem = { tool: string; added?: string; notes?: string };

  export let handle: string;
  export let initialName: string = '';
  export let initialFirm: string = '';
  export let initialPublic: boolean = false;
  export let initialCurrent: CurrentItem[] = [];
  export let avatar: string | undefined = undefined;

  const DRAFT_KEY = `stack-draft:${handle}`;
  const IDLE_MS = 5 * 60 * 1000;

  let name = initialName;
  let firm = initialFirm;
  let isPublic = initialPublic;
  let currentStack: CurrentItem[] = initialCurrent.map(s => ({ ...s }));

  let allTools: ToolEntry[] = [];
  let toolBySlug = new Map<string, ToolEntry>();
  let pickerInput = '';
  let pickerOpen = false;
  let pickerHighlight = 0;

  // Save status
  type SaveStatus =
    | { kind: 'idle' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved'; profileUrl: string; commitSha: string; at: number }
    | { kind: 'error'; message: string };
  let status: SaveStatus = { kind: 'idle' };

  let lastEditedAt = Date.now();
  let lastSavedSnapshot = '';
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  function snapshot(): string {
    return JSON.stringify({
      handle, name, firm, publish: isPublic,
      current_stack: currentStack,
    });
  }

  function isDirty(): boolean {
    return snapshot() !== lastSavedSnapshot;
  }

  function persistDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, snapshot());
    } catch { /* localStorage unavailable */ }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.handle !== handle) return;
      if (typeof parsed.name === 'string') name = parsed.name;
      if (typeof parsed.firm === 'string') firm = parsed.firm;
      if (typeof parsed.publish === 'boolean') isPublic = parsed.publish;
      if (Array.isArray(parsed.current_stack)) currentStack = parsed.current_stack;
    } catch { /* ignore */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }

  function markEdited() {
    lastEditedAt = Date.now();
    persistDraft();
    if (status.kind === 'saved' || status.kind === 'idle') {
      status = { kind: 'dirty' };
    }
    scheduleIdleSave();
  }

  function scheduleIdleSave() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (isDirty() && Date.now() - lastEditedAt >= IDLE_MS - 1_000) {
        save();
      }
    }, IDLE_MS);
  }

  // --- Tool picker ---

  $: filteredTools = (() => {
    const q = pickerInput.trim().toLowerCase();
    if (!q) return allTools.slice(0, 8);
    const inUse = new Set(currentStack.map(s => s.tool));
    return allTools
      .filter(t => !inUse.has(t.slug))
      .filter(t => {
        const hay = [t.slug, t.site_name, t.title, t.zinger, ...(t.tags ?? [])]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  })();

  function addTool(slug: string) {
    if (!slug) return;
    if (currentStack.some(s => s.tool === slug)) return;
    currentStack = [...currentStack, { tool: slug, added: today() }];
    pickerInput = '';
    pickerOpen = false;
    pickerHighlight = 0;
    markEdited();
  }

  function removeTool(slug: string) {
    currentStack = currentStack.filter(s => s.tool !== slug);
    markEdited();
  }

  function updateNotes(slug: string, notes: string) {
    currentStack = currentStack.map(s => s.tool === slug ? { ...s, notes } : s);
    markEdited();
  }

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function onPickerKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      pickerHighlight = Math.min(pickerHighlight + 1, filteredTools.length - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      pickerHighlight = Math.max(pickerHighlight - 1, 0);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (pickerOpen && filteredTools[pickerHighlight]) {
        addTool(filteredTools[pickerHighlight].slug);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      pickerOpen = false;
    }
  }

  // --- Save ---

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
          current_stack: currentStack,
          aspirational_stack: [],
          abandoned_stack: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.detail
          ? `${err.error ?? 'save failed'}: ${err.detail}`
          : err?.error ?? `save failed: ${res.status}`;
        throw new Error(msg);
      }
      const body = await res.json();
      lastSavedSnapshot = snapshot();
      clearDraft();
      status = {
        kind: 'saved',
        profileUrl: body.profileUrl,
        commitSha: body.commitSha,
        at: Date.now(),
      };
    } catch (e: any) {
      status = { kind: 'error', message: String(e?.message ?? e) };
    }
  }

  // --- Lifecycle ---

  onMount(async () => {
    lastSavedSnapshot = snapshot();
    loadDraft();
    if (snapshot() !== lastSavedSnapshot) {
      status = { kind: 'dirty' };
    }
    // Fetch tools registry
    try {
      const res = await fetch('/api/tools.json');
      if (res.ok) {
        allTools = await res.json();
        toolBySlug = new Map(allTools.map(t => [t.slug, t]));
      }
    } catch { /* tools fetch failed; picker just empty */ }

    // Save on visibility-loss if dirty (best-effort; not awaited)
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onDestroy(() => {
    if (idleTimer) clearTimeout(idleTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  });

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && isDirty() && status.kind !== 'saving') {
      // Don't await — page is going away, this is best-effort
      save();
    }
  }

  function statusLabel(s: SaveStatus): string {
    if (s.kind === 'idle') return 'Up to date';
    if (s.kind === 'dirty') return 'Unsaved changes — auto-saves after 5 min';
    if (s.kind === 'saving') return 'Saving…';
    if (s.kind === 'saved') return 'Published — rebuild in ~30s';
    if (s.kind === 'error') return `Error: ${s.message}`;
    return '';
  }
</script>

<div class="sb">
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
        <input class="sb__input" type="text" bind:value={name} on:input={markEdited} maxlength="120" />
      </label>
      <label class="sb__label">
        <span>Firm</span>
        <input class="sb__input" type="text" bind:value={firm} on:input={markEdited} maxlength="120" placeholder="Optional" />
      </label>
    </div>
    <label class="sb__toggle">
      <input type="checkbox" bind:checked={isPublic} on:change={markEdited} />
      <span>Make my profile public at <code>/people/{handle}</code></span>
    </label>
  </section>

  <section class="sb__section">
    <div class="sb__section-head">
      <h3 class="sb__section-title">Current stack</h3>
      <span class="sb__count">{currentStack.length}</span>
    </div>

    <div class="sb__picker">
      <input
        class="sb__input"
        type="text"
        bind:value={pickerInput}
        on:focus={() => pickerOpen = true}
        on:blur={() => setTimeout(() => pickerOpen = false, 150)}
        on:keydown={onPickerKeydown}
        placeholder="Search tools to add…"
        aria-label="Search tools"
        aria-autocomplete="list"
        aria-expanded={pickerOpen}
      />
      {#if pickerOpen && filteredTools.length > 0}
        <ul class="sb__picker-results" role="listbox">
          {#each filteredTools as t, i (t.slug)}
            <li class="sb__picker-result" class:is-active={i === pickerHighlight}>
              <button
                type="button"
                class="sb__picker-btn"
                on:mousedown|preventDefault={() => addTool(t.slug)}
                on:mouseenter={() => pickerHighlight = i}
              >
                {#if t.og_favicon}
                  <img src={t.og_favicon} alt="" loading="lazy" class="sb__picker-favicon" />
                {/if}
                <span class="sb__picker-name">{t.site_name ?? t.slug}</span>
                {#if t.zinger}
                  <span class="sb__picker-zinger">{t.zinger}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else if pickerOpen && pickerInput.trim()}
        <p class="sb__picker-empty">No matching tools — tool registry is maintainer-curated for now.</p>
      {/if}
    </div>

    {#if currentStack.length === 0}
      <p class="sb__empty">No tools yet. Search above to add the first one.</p>
    {:else}
      <ul class="sb__stack-list" role="list">
        {#each currentStack as item (item.tool)}
          {@const tool = toolBySlug.get(item.tool)}
          <li class="sb__stack-item">
            <div class="sb__stack-item-head">
              {#if tool?.og_favicon}
                <img src={tool.og_favicon} alt="" class="sb__stack-favicon" loading="lazy" />
              {/if}
              <div class="sb__stack-id">
                <p class="sb__stack-name">{tool?.site_name ?? item.tool}</p>
                {#if tool?.zinger}<p class="sb__stack-zinger">{tool.zinger}</p>{/if}
              </div>
              <button class="sb__remove" type="button" on:click={() => removeTool(item.tool)} aria-label={`Remove ${tool?.site_name ?? item.tool}`}>
                ×
              </button>
            </div>
            <textarea
              class="sb__notes"
              placeholder="Why this tool? (optional, public if profile is public)"
              maxlength="500"
              value={item.notes ?? ''}
              on:input={(e) => updateNotes(item.tool, (e.currentTarget as HTMLTextAreaElement).value)}
            ></textarea>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <footer class="sb__foot">
    <p class="sb__status sb__status--{status.kind}">{statusLabel(status)}</p>
    <div class="sb__actions">
      {#if status.kind === 'saved'}
        <a class="sb__btn sb__btn--ghost" href={status.profileUrl}>View live →</a>
      {/if}
      <button
        class="sb__btn sb__btn--primary"
        type="button"
        on:click={save}
        disabled={status.kind === 'saving' || (status.kind === 'idle' && !isDirty())}
      >
        {status.kind === 'saving' ? 'Saving…' : 'Save now'}
      </button>
    </div>
  </footer>
</div>

<style>
  .sb {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .sb__head {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .sb__avatar {
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    object-fit: cover;
    background: var(--color-surface);
    border: 1.5px solid var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
    flex: 0 0 auto;
  }
  .sb__avatar--initials {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-primary);
  }
  .sb__head-eyebrow {
    margin: 0 0 0.125rem;
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .sb__head-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .sb__section {
    padding: 1.25rem;
    border-radius: 0.875rem;
    background: var(--fx-card-bg);
    border: 1px solid var(--fx-card-border);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }
  .sb__section-head {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
  }
  .sb__section-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .sb__count {
    font-family: var(--font-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    padding: 0.0625rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
  }

  .sb__row { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
  @media (min-width: 640px) { .sb__row { grid-template-columns: 1fr 1fr; } }
  .sb__label {
    display: flex;
    flex-direction: column;
    gap: 0.3125rem;
    font-family: var(--font-code);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }
  .sb__input {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-body, inherit);
    font-size: 0.9375rem;
    text-transform: none;
    letter-spacing: normal;
  }
  .sb__input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 24%, transparent);
  }
  .sb__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
    cursor: pointer;
  }
  .sb__toggle code {
    font-family: var(--font-code);
    font-size: 0.875em;
    color: var(--color-primary);
  }

  .sb__picker { position: relative; }
  .sb__picker-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0.25rem 0 0;
    padding: 0.25rem;
    list-style: none;
    border-radius: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--fx-card-border-hover);
    box-shadow: var(--fx-card-shadow);
    z-index: 10;
    max-height: 18rem;
    overflow-y: auto;
  }
  .sb__picker-result.is-active .sb__picker-btn {
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }
  .sb__picker-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.625rem;
    border: 0;
    background: transparent;
    text-align: left;
    border-radius: 0.375rem;
    cursor: pointer;
    color: var(--color-text);
  }
  .sb__picker-favicon { width: 1.125rem; height: 1.125rem; border-radius: 0.1875rem; }
  .sb__picker-name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.9375rem;
  }
  .sb__picker-zinger {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb__picker-empty {
    margin: 0.5rem 0 0;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    padding: 0 0.25rem;
  }

  .sb__empty {
    margin: 0;
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    border: 1px dashed var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-style: italic;
  }

  .sb__stack-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .sb__stack-item {
    padding: 0.75rem 0.875rem;
    border-radius: 0.625rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sb__stack-item-head { display: flex; align-items: center; gap: 0.625rem; }
  .sb__stack-favicon { width: 1.25rem; height: 1.25rem; border-radius: 0.25rem; flex: 0 0 auto; }
  .sb__stack-id { flex: 1; min-width: 0; }
  .sb__stack-name {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--color-text);
  }
  .sb__stack-zinger {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb__remove {
    background: transparent;
    border: 0;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: color 150ms ease, background 150ms ease;
  }
  .sb__remove:hover { color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, transparent); }
  .sb__notes {
    width: 100%;
    min-height: 2.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
    background: var(--fx-card-bg);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.8125rem;
    line-height: 1.4;
    resize: vertical;
  }
  .sb__notes:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .sb__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.875rem 1.125rem;
    border-radius: 0.625rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    position: sticky;
    bottom: 1rem;
  }
  .sb__status {
    margin: 0;
    font-family: var(--font-code);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .sb__status--dirty   { color: var(--color-text); }
  .sb__status--saving  { color: var(--color-primary); }
  .sb__status--saved   { color: var(--color-primary); font-weight: 600; }
  .sb__status--error   { color: var(--color-accent, #c33); }

  .sb__actions { display: flex; gap: 0.5rem; }
  .sb__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4375rem;
    padding: 0.5625rem 1rem;
    border-radius: 0.5rem;
    border: 0;
    font-family: var(--font-code);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: box-shadow 150ms ease, transform 150ms ease, background 150ms ease;
  }
  .sb__btn--primary {
    background: var(--color-primary);
    color: var(--color__bone);
  }
  .sb__btn--primary:not(:disabled):hover {
    box-shadow: var(--fx-card-shadow-hover);
    transform: translateY(-1px);
  }
  .sb__btn--primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sb__btn--ghost {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
  .sb__btn--ghost:hover {
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }
</style>
