/**
 * /llms-full.txt — concatenated raw markdown of every published Venture
 * Handbook chapter, session note, project, working group, tool, opted-in
 * participant profile, and changelog entry on FullStack VC.
 *
 * Spec: https://llmstxt.org/
 *
 * The human-editable prose template lives at `src/llms/llms-full.md` (with
 * token documentation in `src/llms/README.md`). This file is the dumb
 * assembler: load template, gather corpus bodies with metadata headers,
 * substitute tokens. Edit prose in the markdown — not here.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_SEO } from '../config/seo';
import { loadAllProjects, projectHref } from '../lib/load-projects';
import { loadAllWorkingGroups, workingGroupHref } from '../lib/load-working-groups';
import template from '../llms/llms-full.md?raw';

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

function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

const STATUS_ORDER: Record<string, number> = { active: 0, proposed: 1, archived: 2 };

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE ?? 'https://fullstack-vc.com';
  const base = import.meta.env.BASE_URL ?? '/';
  const root = new URL(base, site).toString().replace(/\/$/, '');

  // Same predicates as llms.txt.ts — keep these in lockstep so the link
  // index and the full-corpus file describe the same set of documents.

  let vhAll: Awaited<ReturnType<typeof getCollection<'ventureWorkflows'>>> = [];
  try { vhAll = await getCollection('ventureWorkflows'); } catch { vhAll = []; }
  const ventureHandbook = [...vhAll].sort(
    (a, b) => a.data.chapter_number - b.data.chapter_number,
  );

  let sessionsAll: Awaited<ReturnType<typeof getCollection<'sessions'>>> = [];
  try { sessionsAll = await getCollection('sessions'); } catch { sessionsAll = []; }
  const sessions = sessionsAll
    .filter((e) => (e.data as AnyData).unlisted !== true)
    .sort((a, b) => entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData));

  const projects = await loadAllProjects();
  const projectsSorted = [...projects].sort((a, b) => {
    const sa = STATUS_ORDER[a.data.status] ?? 99;
    const sb = STATUS_ORDER[b.data.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData);
  });

  const workingGroups = await loadAllWorkingGroups();
  const wgSorted = [...workingGroups].sort((a, b) => {
    const sa = STATUS_ORDER[a.data.status] ?? 99;
    const sb = STATUS_ORDER[b.data.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return entryDateMs(b.data as AnyData) - entryDateMs(a.data as AnyData);
  });

  let toolsAll: Awaited<ReturnType<typeof getCollection<'tools'>>> = [];
  try { toolsAll = await getCollection('tools'); } catch { toolsAll = []; }
  const tools = toolsAll
    .filter((e) => (e.data as AnyData).publish !== false)
    .sort((a, b) => {
      const ta = ((a.data as AnyData).title ?? (a.data as AnyData).site_name ?? a.id).toLowerCase();
      const tb = ((b.data as AnyData).title ?? (b.data as AnyData).site_name ?? b.id).toLowerCase();
      return ta.localeCompare(tb);
    });

  let partAll: Awaited<ReturnType<typeof getCollection<'participants'>>> = [];
  try { partAll = await getCollection('participants'); } catch { partAll = []; }
  const participants = partAll
    .filter((e) => (e.data as AnyData).publish === true)
    .sort((a, b) => {
      const na = ((a.data as AnyData).name ?? a.id).toLowerCase();
      const nb = ((b.data as AnyData).name ?? b.id).toLowerCase();
      return na.localeCompare(nb);
    });

  let changelogAll: Awaited<ReturnType<typeof getCollection<'changelog'>>> = [];
  try { changelogAll = await getCollection('changelog'); } catch { changelogAll = []; }
  const changelog = [...changelogAll].sort((a, b) => {
    const da = entryDateMs(a.data as AnyData);
    const db = entryDateMs(b.data as AnyData);
    return db - da;
  });

  type Kind = 'venture-handbook' | 'session' | 'project' | 'working-group' | 'tool' | 'participant' | 'changelog';
  type Tagged = {
    kind: Kind;
    title: string;
    url: string;
    sourcePath: string;
    lastModified: string | undefined;
    body: string;
  };

  const stream: Tagged[] = [];

  for (const entry of ventureHandbook) {
    const data = entry.data as AnyData;
    const slug = entry.id.replace(/^\d+-/, '');
    stream.push({
      kind: 'venture-handbook',
      title: `Chapter ${data.chapter_number} — ${data.title}`,
      url: `${root}/read/venture-handbook/${slug}/`,
      sourcePath: `src/content/long-form/venture-workflows/${entry.id}.md`,
      lastModified: isoDate(data.date_modified ?? data.date_published ?? data.date_authored),
      body: entry.body ?? '',
    });
  }

  for (const entry of sessions) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'session',
      title: data.title ?? entry.id,
      url: `${root}/sessions/${entry.id}/`,
      sourcePath: `src/content/sessions/${entry.id}.md`,
      lastModified: isoDate(data.date_posted ?? data.date_scheduled),
      body: entry.body ?? '',
    });
  }

  for (const entry of projectsSorted) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'project',
      title: data.title ?? entry.id,
      url: `${root}${projectHref(entry)}`,
      sourcePath: `src/content/projects/${entry.id}.md`,
      lastModified: isoDate(data.date_modified ?? data.date_last_activity ?? data.date_initiated),
      body: entry.body ?? '',
    });
  }

  for (const entry of wgSorted) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'working-group',
      title: data.title ?? entry.id,
      url: `${root}${workingGroupHref(entry)}`,
      sourcePath: `src/content/working-groups/${entry.id}.md`,
      lastModified: isoDate(data.date_modified ?? data.date_last_activity ?? data.date_initiated),
      body: entry.body ?? '',
    });
  }

  for (const entry of tools) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'tool',
      title: data.title ?? data.site_name ?? entry.id,
      url: `${root}/stacks/${entry.id}/`,
      sourcePath: `src/content/tools/${entry.id}.md`,
      lastModified: isoDate(data.date_modified ?? data.og_last_fetch),
      body: entry.body ?? '',
    });
  }

  for (const entry of participants) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'participant',
      title: data.name ?? data.handle ?? entry.id,
      url: `${root}/people/${data.handle}/`,
      sourcePath: `src/content/participants/${entry.id}.md`,
      lastModified: isoDate(data.joined_dojo),
      body: entry.body ?? '',
    });
  }

  for (const entry of changelog) {
    const data = entry.data as AnyData;
    stream.push({
      kind: 'changelog',
      title: data.title ?? entry.id,
      url: `${root}/changelog/${entry.id}/`,
      sourcePath: `changelog/${entry.id}.md`,
      lastModified: isoDate(data.date),
      body: entry.body ?? '',
    });
  }

  const bodyParts: string[] = [];
  for (const item of stream) {
    bodyParts.push('---');
    bodyParts.push('');
    bodyParts.push(`## ${item.title}`);
    bodyParts.push('');
    bodyParts.push(`- Kind: \`${item.kind}\``);
    bodyParts.push(`- Source path: \`${item.sourcePath}\``);
    bodyParts.push(`- Canonical URL: ${item.url}`);
    if (item.lastModified) bodyParts.push(`- Last modified: ${item.lastModified}`);
    bodyParts.push('');
    bodyParts.push(item.body);
    bodyParts.push('');
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
    LLMS_INDEX_URL: `${root}/llms.txt`,
    CORPUS_BODIES: bodyParts.join('\n').trimEnd(),
  };

  const body = template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : match,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
