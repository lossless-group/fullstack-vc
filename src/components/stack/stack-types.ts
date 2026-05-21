// Shared types for the multi-column StackBuilder.
//
// Each bucket holds a different shape (notes / intent / reason are
// bucket-specific). The drag-drop layer treats them as a discriminated union
// so cross-column moves can transform the shape via reshape().

export type Bucket = 'current' | 'aspirational' | 'abandoned';

export interface CurrentItem {
  tool: string;
  added?: string;       // ISO date
  notes?: string;
}

export interface AspirationalItem {
  tool: string;
  intent?: string;
}

export interface AbandonedItem {
  tool: string;
  abandoned?: string;   // ISO date
  reason?: string;
}

export type StackItem = CurrentItem | AspirationalItem | AbandonedItem;

// Discriminated wrapper used by the drag-drop layer so a card carries its
// origin bucket as it moves between zones. svelte-dnd-action requires items
// to be uniquely identified by `id` — we use the tool slug since one tool
// can only appear in one bucket at a time (the unique_per_bucket index in
// Stack table enforces this; the UI mirrors the constraint by removing
// from origin before allowing insertion in destination).
export interface DraggableItem {
  id: string;              // tool slug (svelte-dnd-action id)
  bucket: Bucket;          // origin bucket — used for cross-column transforms
  data: CurrentItem | AspirationalItem | AbandonedItem;
}

export interface ToolEntry {
  slug: string;
  site_name?: string;
  title?: string;
  zinger?: string;
  og_favicon?: string;
  tags?: string[];
}

// Cross-bucket reshape: when a card lands in a different bucket, the existing
// per-bucket field (notes/intent/reason) is the most useful signal to carry
// over. This function does the mapping. The user can edit/clear via the
// inline reshape form after the drop.
export function reshape(item: DraggableItem, dest: Bucket): StackItem {
  if (item.bucket === dest) return item.data;
  const tool = item.data.tool;
  const text = pickText(item);
  const today = new Date().toISOString().slice(0, 10);
  switch (dest) {
    case 'current':
      return { tool, added: today, notes: text };
    case 'aspirational':
      return { tool, intent: text };
    case 'abandoned':
      return { tool, abandoned: today, reason: text };
  }
}

function pickText(item: DraggableItem): string | undefined {
  const d = item.data as any;
  return d.notes ?? d.intent ?? d.reason ?? undefined;
}

export function labelForBucket(b: Bucket): string {
  return b === 'current' ? 'Current' : b === 'aspirational' ? 'Aspiring' : 'Archived';
}

export function fieldKeyForBucket(b: Bucket): 'notes' | 'intent' | 'reason' {
  return b === 'current' ? 'notes' : b === 'aspirational' ? 'intent' : 'reason';
}

export function placeholderForBucket(b: Bucket): string {
  if (b === 'current')      return 'Why this tool? (optional, public if profile is public)';
  if (b === 'aspirational') return 'What do you want from this tool? (optional)';
  return 'Why did you move on? (optional)';
}
