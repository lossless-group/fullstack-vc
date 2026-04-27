import { getCollection, type CollectionEntry } from 'astro:content';
import { loadAllProjects, type ProjectEntry } from './load-projects';

export type WorkingGroupEntry = CollectionEntry<'workingGroups'>;
export type WorkingGroupStatus = 'active' | 'proposed' | 'archived';

const ms = (d?: Date) => (d ? d.getTime() : 0);

export async function loadAllWorkingGroups(): Promise<WorkingGroupEntry[]> {
  const all = await getCollection('workingGroups');
  return all.filter(wg => wg.data.publish !== false);
}

export async function loadWorkingGroupsByStatus(status: WorkingGroupStatus): Promise<WorkingGroupEntry[]> {
  const all = await loadAllWorkingGroups();
  const filtered = all.filter(wg => wg.data.status === status);

  if (status === 'active') {
    return filtered.sort((a, b) => ms(b.data.date_last_activity) - ms(a.data.date_last_activity));
  }
  if (status === 'proposed') {
    return filtered.sort((a, b) => ms(b.data.date_initiated) - ms(a.data.date_initiated));
  }
  return filtered.sort((a, b) => ms(b.data.date_archived) - ms(a.data.date_archived));
}

export async function loadWorkingGroupsForPopdown(opts?: {
  showProposed?: boolean;
  maxItems?: number;
}): Promise<WorkingGroupEntry[]> {
  const showProposed = opts?.showProposed ?? true;
  const maxItems = opts?.maxItems ?? 6;

  const all = await loadAllWorkingGroups();
  const candidates = all.filter(wg => {
    if (wg.data.feature_in_popdown === false) return false;
    if (wg.data.status === 'archived') return false;
    if (!showProposed && wg.data.status === 'proposed') return false;
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

export function workingGroupHref(entry: WorkingGroupEntry): string {
  const slug = entry.data.slug ?? entry.id.replace(/\.md$/, '').split('/').pop() ?? entry.id;
  return `/working-groups/${slug}/`;
}

export function workingGroupSlug(entry: WorkingGroupEntry): string {
  return entry.data.slug ?? entry.id.replace(/\.md$/, '').split('/').pop() ?? entry.id;
}

export function statusLabel(status: WorkingGroupStatus): string {
  return status === 'active' ? 'Active' : status === 'proposed' ? 'Proposed' : 'Archived';
}

// ---------- Cross-collection joins ----------

/**
 * All projects whose `working_group_slugs` array includes this WG slug.
 * Used by the WG detail page to render its current/past project rail.
 */
export async function loadProjectsForWorkingGroup(wgSlug: string): Promise<ProjectEntry[]> {
  const all = await loadAllProjects();
  return all.filter(p => Array.isArray(p.data.working_group_slugs) && p.data.working_group_slugs.includes(wgSlug));
}

/**
 * Active projects only, scoped to a single WG. Convenience wrapper.
 */
export async function loadActiveProjectsForWorkingGroup(wgSlug: string): Promise<ProjectEntry[]> {
  const projects = await loadProjectsForWorkingGroup(wgSlug);
  return projects.filter(p => p.data.status === 'active');
}

/**
 * Enriched gallery shape: WG entry + its currently-active projects.
 * The gallery card uses this to render a small chip row of "current projects."
 * The loader does the join so components don't query mid-render.
 */
export interface WorkingGroupWithProjects {
  wg: WorkingGroupEntry;
  currentProjects: ProjectEntry[];
}

export async function loadWorkingGroupsWithProjects(status: WorkingGroupStatus): Promise<WorkingGroupWithProjects[]> {
  const wgs = await loadWorkingGroupsByStatus(status);
  const allProjects = await loadAllProjects();
  return wgs.map(wg => {
    const slug = workingGroupSlug(wg);
    const currentProjects = allProjects.filter(p =>
      p.data.status === 'active' &&
      Array.isArray(p.data.working_group_slugs) &&
      p.data.working_group_slugs.includes(slug)
    );
    return { wg, currentProjects };
  });
}

/**
 * All working groups a project is associated with. Reverse lookup used by
 * the project detail page for the "Part of: [WG-A · WG-B]" line.
 */
export async function loadWorkingGroupsForProject(p: ProjectEntry): Promise<WorkingGroupEntry[]> {
  const slugs = p.data.working_group_slugs;
  if (!Array.isArray(slugs) || slugs.length === 0) return [];

  const all = await loadAllWorkingGroups();
  return all.filter(wg => slugs.includes(workingGroupSlug(wg)));
}
