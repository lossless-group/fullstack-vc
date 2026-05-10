/**
 * /llms.txt — link index for LLM consumers.
 *
 * Spec: https://llmstxt.org/
 *
 * The human-editable prose template lives at `src/llms/llms.md` (with token
 * documentation in `src/llms/README.md`). This file is the dumb assembler:
 * load template, compute dynamic values, substitute tokens. Edit prose in
 * the markdown — not here.
 *
 * This site is `output: 'server'` (Vercel). `prerender = true` makes Astro
 * emit a static dist/llms.txt at build time so we never assemble multi-KB
 * markdown on a request hot path.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_SEO } from '../config/seo';
import { loadAllProjects, projectHref } from '../lib/load-projects';
import { loadAllWorkingGroups, workingGroupHref } from '../lib/load-working-groups';
import template from '../llms/llms.md?raw';

export const prerender = true;

type AnyData = Record<string, any>;

function entryDateMs(data: AnyData): number {
  const d =
    data.date_modified ??
    data.date_published ??
    data.date_authored ??
    data.date_last_activity ??
    data.date_initiated ??
    data.date_created ??
    data.date_scheduled ??
    data.date;
  if (!d) return 0;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const STATUS_ORDER: Record<string, number> = { active: 0, proposed: 1, archived: 2 };

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE ?? 'https://fullstack-vc.com';
  const base = import.meta.env.BASE_URL ?? '/';
  const root = new URL(base, site).toString().replace(/\/$/, '');

  // ── Venture Handbook (ventureWorkflows) ──────────────────────────────
  // The page template at src/pages/read/venture-handbook/[slug].astro
  // intentionally renders every chapter regardless of `published` ("YOLO"
  // comment in the source). Mirror that here; when the template starts
  // gating, gate both in the same commit.
  let vhAll: Awaited<ReturnType<typeof getCollection<'ventureWorkflows'>>> = [];
  try { vhAll = await getCollection('ventureWorkflows'); } catch { vhAll = []; }
  const ventureHandbook = [...vhAll].sort(
    (a, b) => a.data.chapter_number - b.data.chapter_number,
  );

  const vhLines: string[] = [];
  for (const entry of ventureHandbook) {
    const data = entry.data as AnyData;
    const slug = entry.id.replace(/^\d+-/, '');
    const url = `${root}/read/venture-handbook/${slug}/`;
    const title = `Chapter ${data.chapter_number} — ${data.title}`;
    const lede = data.lede ?? data.summary ?? data.description;
    vhLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
  }

  // ── Sessions ─────────────────────────────────────────────────────────
  // src/pages/sessions/[id].astro applies no publish gate but listing
  // pages exclude `unlisted: true`. Same predicate here.
  let sessionsAll: Awaited<ReturnType<typeof getCollection<'sessions'>>> = [];
  try { sessionsAll = await getCollection('sessions'); } catch { sessionsAll = []; }
  const sessions = sessionsAll.filter((e) => (e.data as AnyData).unlisted !== true);
  sessions.sort((a, b) => entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData));

  const sessionsLines: string[] = [];
  for (const entry of sessions) {
    const data = entry.data as AnyData;
    const url = `${root}/sessions/${entry.id}/`;
    const title = data.title ?? entry.id;
    const lede = data.lede ?? data.description;
    sessionsLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
  }

  // ── Projects ─────────────────────────────────────────────────────────
  // Reuses the same loader the page templates use, so the predicate
  // (data.publish !== false) cannot drift.
  const projects = await loadAllProjects();
  const projectsSorted = [...projects].sort((a, b) => {
    const sa = STATUS_ORDER[a.data.status] ?? 99;
    const sb = STATUS_ORDER[b.data.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData);
  });
  const projectsByStatus = new Map<string, typeof projectsSorted>();
  for (const entry of projectsSorted) {
    const status = entry.data.status;
    if (!projectsByStatus.has(status)) projectsByStatus.set(status, [] as any);
    projectsByStatus.get(status)!.push(entry);
  }
  const projectsLines: string[] = [];
  for (const status of ['active', 'proposed', 'archived'] as const) {
    const list = projectsByStatus.get(status);
    if (!list || list.length === 0) continue;
    projectsLines.push(`### ${status[0].toUpperCase()}${status.slice(1)}`);
    projectsLines.push('');
    for (const entry of list) {
      const data = entry.data as AnyData;
      const url = `${root}${projectHref(entry)}`;
      const title = data.title ?? entry.id;
      const lede = data.lede ?? data.summary;
      projectsLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
    }
    projectsLines.push('');
  }

  // ── Working Groups ───────────────────────────────────────────────────
  const workingGroups = await loadAllWorkingGroups();
  const wgSorted = [...workingGroups].sort((a, b) => {
    const sa = STATUS_ORDER[a.data.status] ?? 99;
    const sb = STATUS_ORDER[b.data.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData);
  });
  const wgByStatus = new Map<string, typeof wgSorted>();
  for (const entry of wgSorted) {
    const status = entry.data.status;
    if (!wgByStatus.has(status)) wgByStatus.set(status, [] as any);
    wgByStatus.get(status)!.push(entry);
  }
  const wgLines: string[] = [];
  for (const status of ['active', 'proposed', 'archived'] as const) {
    const list = wgByStatus.get(status);
    if (!list || list.length === 0) continue;
    wgLines.push(`### ${status[0].toUpperCase()}${status.slice(1)}`);
    wgLines.push('');
    for (const entry of list) {
      const data = entry.data as AnyData;
      const url = `${root}${workingGroupHref(entry)}`;
      const title = data.title ?? entry.id;
      const lede = data.lede ?? data.summary;
      wgLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
    }
    wgLines.push('');
  }

  // ── Tools ────────────────────────────────────────────────────────────
  // Defensive publish gate — schema has `publish` optional, default-allowed.
  let toolsAll: Awaited<ReturnType<typeof getCollection<'tools'>>> = [];
  try { toolsAll = await getCollection('tools'); } catch { toolsAll = []; }
  const tools = toolsAll.filter((e) => (e.data as AnyData).publish !== false);
  tools.sort((a, b) => {
    const ta = ((a.data as AnyData).title ?? (a.data as AnyData).site_name ?? a.id).toLowerCase();
    const tb = ((b.data as AnyData).title ?? (b.data as AnyData).site_name ?? b.id).toLowerCase();
    return ta.localeCompare(tb);
  });
  const toolsLines: string[] = [];
  for (const entry of tools) {
    const data = entry.data as AnyData;
    const url = `${root}/stacks/${entry.id}/`;
    const title = data.title ?? data.site_name ?? entry.id;
    const lede = data.zinger ?? data.description ?? data.description_site_cp;
    toolsLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
  }

  // ── Participants ─────────────────────────────────────────────────────
  // Schema defaults `publish` to false — only opted-in profiles surface.
  let partAll: Awaited<ReturnType<typeof getCollection<'participants'>>> = [];
  try { partAll = await getCollection('participants'); } catch { partAll = []; }
  const participants = partAll.filter((e) => (e.data as AnyData).publish === true);
  participants.sort((a, b) => {
    const na = ((a.data as AnyData).name ?? a.id).toLowerCase();
    const nb = ((b.data as AnyData).name ?? b.id).toLowerCase();
    return na.localeCompare(nb);
  });
  const participantsLines: string[] = [];
  for (const entry of participants) {
    const data = entry.data as AnyData;
    const url = `${root}/people/${data.handle}/`;
    const title = data.name ?? data.handle;
    const lede = [data.role, data.firm].filter(Boolean).join(' · ');
    participantsLines.push(lede ? `- [${title}](${url}): ${lede}` : `- [${title}](${url})`);
  }

  // ── Changelog ────────────────────────────────────────────────────────
  let changelogAll: Awaited<ReturnType<typeof getCollection<'changelog'>>> = [];
  try { changelogAll = await getCollection('changelog'); } catch { changelogAll = []; }
  const changelog = [...changelogAll].sort((a, b) => {
    const da = entryDateMs(a.data as AnyData);
    const db = entryDateMs(b.data as AnyData);
    return db - da;
  });
  const changelogLines: string[] = [];
  for (const entry of changelog) {
    const data = entry.data as AnyData;
    const url = `${root}/changelog/${entry.id}/`;
    const title = data.title ?? entry.id;
    const dateStr = (() => {
      const d = data.date;
      if (!d) return '';
      const dt = d instanceof Date ? d : new Date(d);
      return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
    })();
    const label = dateStr ? `${dateStr} — ${title}` : title;
    const lede = data.summary;
    changelogLines.push(lede ? `- [${label}](${url}): ${lede}` : `- [${label}](${url})`);
  }

  const tokens: Record<string, string> = {
    SITE_NAME: SITE_SEO.siteName,
    VENTURE_HANDBOOK_COUNT: String(ventureHandbook.length),
    SESSION_COUNT: String(sessions.length),
    PROJECT_COUNT: String(projects.length),
    WORKING_GROUP_COUNT: String(workingGroups.length),
    TOOL_COUNT: String(tools.length),
    PARTICIPANT_COUNT: String(participants.length),
    CHANGELOG_COUNT: String(changelog.length),
    LLMS_FULL_URL: `${root}/llms-full.txt`,
    LLMS_INDEX_URL: `${root}/llms.txt`,
    VENTURE_HANDBOOK_INDEX: vhLines.join('\n').trimEnd(),
    SESSIONS_INDEX: sessionsLines.join('\n').trimEnd(),
    PROJECTS_INDEX: projectsLines.join('\n').trimEnd(),
    WORKING_GROUPS_INDEX: wgLines.join('\n').trimEnd(),
    TOOLS_INDEX: toolsLines.join('\n').trimEnd(),
    PARTICIPANTS_INDEX: participantsLines.join('\n').trimEnd(),
    CHANGELOG_INDEX: changelogLines.join('\n').trimEnd(),
  };

  const body = template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : match,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
