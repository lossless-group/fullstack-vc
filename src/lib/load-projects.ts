import { getCollection, type CollectionEntry } from 'astro:content';

export type ProjectEntry = CollectionEntry<'projects'>;
export type ProjectStatus = 'active' | 'proposed' | 'archived';

const ms = (d?: Date) => (d ? d.getTime() : 0);

export async function loadAllProjects(): Promise<ProjectEntry[]> {
  const all = await getCollection('projects');
  return all.filter(p => p.data.publish !== false);
}

export async function loadProjectsByStatus(status: ProjectStatus): Promise<ProjectEntry[]> {
  const all = await loadAllProjects();
  const filtered = all.filter(p => p.data.status === status);

  if (status === 'active') {
    return filtered.sort((a, b) => ms(b.data.date_last_activity) - ms(a.data.date_last_activity));
  }
  if (status === 'proposed') {
    return filtered.sort((a, b) => ms(b.data.date_initiated) - ms(a.data.date_initiated));
  }
  return filtered.sort((a, b) => ms(b.data.date_archived) - ms(a.data.date_archived));
}

export async function loadProjectsForPopdown(opts?: {
  showProposed?: boolean;
  maxItems?: number;
}): Promise<ProjectEntry[]> {
  const showProposed = opts?.showProposed ?? true;
  const maxItems = opts?.maxItems ?? 6;

  const all = await loadAllProjects();
  const candidates = all.filter(p => {
    if (p.data.feature_in_popdown === false) return false;
    if (p.data.status === 'archived') return false;
    if (!showProposed && p.data.status === 'proposed') return false;
    return true;
  });

  candidates.sort((a, b) => {
    const orderA = a.data.popdown_order ?? Number.POSITIVE_INFINITY;
    const orderB = b.data.popdown_order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return ms(b.data.date_last_activity) - ms(a.data.date_last_activity);
  });

  return candidates.slice(0, maxItems);
}

export function projectHref(entry: ProjectEntry): string {
  const slug = entry.data.slug ?? entry.id.replace(/\.md$/, '').split('/').pop() ?? entry.id;
  return `/projects/${slug}/`;
}

export function statusLabel(status: ProjectStatus): string {
  return status === 'active' ? 'Active' : status === 'proposed' ? 'Proposed' : 'Archived';
}

export function statusToken(status: ProjectStatus): string {
  return `var(--color-status-${status})`;
}
