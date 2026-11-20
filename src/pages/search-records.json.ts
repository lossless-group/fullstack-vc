// The Pagefind corpus, prerendered at build.
//
// Several of this site's routes render on demand (sessions, people), so there
// is no complete set of built HTML for Pagefind to crawl. This endpoint hands
// `scripts/build-search-index.mjs` explicit records instead, one per listed
// page, the same approach as sites/lossless-toolkit-site.
//
// Two filters drive the palette's chips:
//   kind — what the result is (Tool, Recipe, Session, Person, Project, …)
//   tag  — the registry's Train-Case tags; people carry the tools in their
//          current stack, so a tag like "Personal-Agents" also finds who uses one
//
// Drafts and unpublished entries are left out: search is a listing, and a
// listing should not surface what the index pages hide.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import timeline from '../data/claude-chatgpt-timeline-2026.json';

export const prerender = true;

const plain = (md = '') =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const join = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join('. ');
const tagsOf = (t?: string[]) => (t ?? []).filter(Boolean);

export const GET: APIRoute = async () => {
  const [tools, guides, sessions, participants, projects, workingGroups] = await Promise.all([
    getCollection('tools'),
    getCollection('guides'),
    getCollection('sessions'),
    getCollection('participants'),
    getCollection('projects'),
    getCollection('workingGroups'),
  ]);

  const toolName = new Map(tools.map((t) => [t.id, t.data.site_name ?? t.data.title ?? t.id]));
  const toolTags = new Map(tools.map((t) => [t.id, tagsOf(t.data.tags)]));

  const records = [
    ...tools
      .filter((t) => t.data.publish !== false)
      .map((t) => ({
        url: `/tools/${t.id}/`,
        content: join(t.data.site_name, t.data.title, t.data.zinger, t.data.description, plain(t.body)),
        meta: { title: t.data.site_name ?? t.data.title ?? t.id, kind: 'Tool' },
        filters: { kind: ['Tool'], tag: tagsOf(t.data.tags) },
      })),

    ...guides
      .filter((g) => g.data.publish !== false)
      .map((g) => ({
        url: `/guides/${g.id.replace(/\/index$/, '')}/`,
        content: join(g.data.title, g.data.lede, plain(g.body)),
        meta: { title: g.data.title, kind: 'Recipe' },
        filters: { kind: ['Recipe'], tag: tagsOf(g.data.tags) },
      })),

    ...sessions.map((s) => ({
      url: `/sessions/${s.id}`,
      content: join(s.data.title, s.data.lede, plain(s.body)),
      meta: { title: s.data.title, kind: 'Session' },
      filters: { kind: ['Session'], tag: [...tagsOf(s.data.tags), ...tagsOf(s.data.classifiers)] },
    })),

    ...participants
      .filter((p) => p.data.publish)
      .map((p) => {
        const stack = (p.data.current_stack ?? []).map((s) => s.tool);
        return {
          url: `/people/${p.data.handle}`,
          content: join(
            p.data.name,
            p.data.firm,
            p.data.role,
            stack.length ? `Uses ${stack.map((s) => toolName.get(s) ?? s).join(', ')}` : '',
            plain(p.body),
          ),
          meta: { title: p.data.name, kind: 'Person' },
          filters: { kind: ['Person'], tag: [...new Set(stack.flatMap((s) => toolTags.get(s) ?? []))] },
        };
      }),

    ...projects
      .filter((p) => p.data.publish !== false)
      .map((p) => ({
        url: `/projects/${p.data.slug ?? p.id.replace(/\.md$/, '').split('/').pop()}`,
        content: join(p.data.title, p.data.lede, plain(p.body)),
        meta: { title: p.data.title, kind: 'Project' },
        filters: { kind: ['Project'], tag: tagsOf(p.data.tags) },
      })),

    ...workingGroups
      .filter((w) => w.data.publish !== false)
      .map((w) => ({
        url: `/working-groups/${w.data.slug ?? w.id.replace(/\.md$/, '').split('/').pop()}`,
        content: join(w.data.title, w.data.lede, plain(w.body)),
        meta: { title: w.data.title, kind: 'Working Group' },
        filters: { kind: ['Working-Group'], tag: tagsOf(w.data.tags) },
      })),

    // Standalone data pages: one record each, carrying every release title
    // so "Dots" or "Opus 5.5" finds the timeline.
    {
      url: '/claude-gpt-release-timeline',
      content: join(
        'Six months of Claude and ChatGPT',
        'Timeline of Claude, ChatGPT, Claude Code, Codex and model releases, May to November 2026.',
        ...(timeline as { title: string; summary: string }[]).map((i) => `${i.title}. ${i.summary}`),
      ),
      meta: { title: 'Six months of Claude and ChatGPT', kind: 'Timeline' },
      filters: { kind: ['Timeline'], tag: ['Claude', 'ChatGPT', 'Claude-Code', 'Codex'] },
    },
  ];

  return new Response(JSON.stringify(records), { headers: { 'content-type': 'application/json' } });
};
