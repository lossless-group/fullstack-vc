// Every shareable thing on the site gets a card: what its share image says.
// A page's card key is its own URL path ('tools/instinct', 'guides/x'), so
// BoilerPlateHTML finds a page's card without the page passing anything; a
// page with no card of its own falls back to the universal site card.
// Sections of long-form pages get their own card and a share page under /s/,
// because chat apps ignore #fragments and would otherwise unfurl every section
// with the page's image.
// Blueprint: astro-knots/context-v/blueprints/Share-Every-Page-and-Section-With-Its-Own-OG-Image.md
// Pattern source: sites/cathode-site/src/lib/share-cards.ts
import { getCollection } from 'astro:content';
import { parseMarkdown } from '@lossless-group/lfm';

export interface ShareCard {
  /** Stable key; also the image path: /og/{tall|wide}/{key}.jpg */
  key: string;
  /** Small line above the title. */
  kicker: string;
  /** The big text. For a section, the heading itself. */
  title: string;
  /** One line under the title. */
  subtitle?: string;
  /** Background photo: a /public path or an absolute URL. */
  image?: string;
  /**
   * How the image sits. 'band' (default): full-bleed across the top, for
   * artwork. 'inset': a rounded frame at the image's own proportions, for
   * banners with text in them (tool og:images), which a crop would cut.
   */
  imageFit?: 'band' | 'inset';
  /** 'universal': the site-wide big-type card (home, and any page without its own). */
  layout?: 'universal';
  /** Last words of the title to set in the accent color (universal layout). */
  accent?: string;
}

export const SITE_CARD_KEY = 'home';

// Headings that get their own share page and button. h1 is the page itself.
export const SHARE_HEADING_DEPTHS = [2, 3];

// Long-form collections whose sections are shareable. `base` is the page URL
// prefix; the section share page lives at /s/{base}/{slug}/{headingId}/.
export const SECTION_SOURCES = {
  guides: { base: 'guides', kicker: 'Recipe' },
  handbook: { base: 'read/venture-handbook', kicker: 'Venture Handbook' },
} as const;
export type SectionSource = keyof typeof SECTION_SOURCES;

export const sectionShareBase = (source: SectionSource, slug: string) => `/s/${SECTION_SOURCES[source].base}/${slug}/`;

export interface SectionShare {
  source: SectionSource;
  slug: string;
  headingId: string;
  headingText: string;
  pageTitle: string;
  pageLede?: string;
  card: ShareCard;
}

const guideSlug = (id: string) => id.replace(/\/index$/, '');
const chapterSlug = (id: string) => id.replace(/^\d+-/, '');
const entrySlug = (e: { id: string; data: any }) => e.data.slug ?? e.id.replace(/\.md$/, '').split('/').pop();

const formatDate = (d?: Date) =>
  d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(d) : '';

async function listedGuides() {
  return (await getCollection('guides')).filter((g) => (g.data as any).publish !== false);
}

async function sectionsOf(
  source: SectionSource, slug: string, body: string, pageTitle: string, pageLede?: string,
): Promise<SectionShare[]> {
  const tree: any = await parseMarkdown(body);
  const headings: { id: string; text: string; depth: number }[] = tree?.data?.headings ?? [];
  return headings
    .filter((h) => h.id && SHARE_HEADING_DEPTHS.includes(h.depth))
    .map((h) => ({
      source, slug, headingId: h.id, headingText: h.text, pageTitle, pageLede,
      card: {
        key: `s/${SECTION_SOURCES[source].base}/${slug}/${h.id}`,
        kicker: `${SECTION_SOURCES[source].kicker} · ${pageTitle}`,
        title: h.text,
        subtitle: pageLede,
      },
    }));
}

let sectionCache: Promise<SectionShare[]> | null = null;
export function getSectionShares(): Promise<SectionShare[]> {
  return (sectionCache ??= (async () => {
    const out: SectionShare[] = [];
    for (const g of await listedGuides()) {
      out.push(...(await sectionsOf('guides', guideSlug(g.id), g.body ?? '', g.data.title, g.data.lede)));
    }
    for (const c of await getCollection('ventureWorkflows')) {
      out.push(...(await sectionsOf('handbook', chapterSlug(c.id), c.body ?? '', c.data.title, c.data.lede)));
    }
    return out;
  })());
}

/** Cards for whole pages. Cheap: no markdown parsing, safe to call per request. */
let pageCache: Promise<ShareCard[]> | null = null;
export function getPageCards(): Promise<ShareCard[]> {
  return (pageCache ??= (async () => {
    const cards: ShareCard[] = [
      {
        key: SITE_CARD_KEY,
        kicker: 'Agentic VC Dojo · Kauffman Fellows',
        title: 'Learn AI superpowers for your venture firm.',
        accent: 'venture firm.',
        subtitle: 'A working community learning, in public, to make agentic AI a daily practice.',
        layout: 'universal',
      },
      { key: 'dojo', kicker: 'The Dojo', title: 'Where VCs practice with agents.', subtitle: 'Monthly sessions, working groups and the tools fellows actually use.' },
      { key: 'recipes', kicker: 'Recipes', title: 'Recipes for the agentic fund.', subtitle: 'Step-by-step guides fellows can copy into their own firm.' },
      { key: 'sessions', kicker: 'Sessions', title: 'Monthly all-hands and setupathons.', subtitle: 'What we covered, and what comes next.' },
      { key: 'stacks', kicker: 'Stacks', title: 'What the Dojo actually uses.', subtitle: 'Tools ranked by how many members run them.' },
      { key: 'stacks/see-all-tools', kicker: 'Tool registry', title: 'Every tool the Dojo talks about.', subtitle: 'Filter by tag to find the right one.' },
      { key: 'people', kicker: 'People', title: 'Who’s actually building in the Dojo.', subtitle: 'The tools members use, want to try, and moved on from.' },
      { key: 'projects', kicker: 'Projects', title: 'What members are building together.' },
      { key: 'working-groups', kicker: 'Working groups', title: 'Small groups, one problem each.' },
      { key: 'changelog', kicker: 'Changelog', title: 'What changed on the hub.', subtitle: 'Ship notes, newest first.' },
      { key: 'read/venture-handbook', kicker: 'Venture Handbook', title: 'How venture actually works, chapter by chapter.' },
      { key: 'release-timeline', kicker: 'Release timeline · May to Nov 2026', title: 'Six Months of Claude & GPT Releases', subtitle: 'Apps, Claude Code, Codex and models, side by side, each linked to its source.' },
    ];

    for (const t of await getCollection('tools')) {
      if (t.data.publish === false) continue;
      cards.push({
        key: `tools/${t.id.replace(/\/index$/, '')}`,
        kicker: `Tool${t.data.category ? ` · ${t.data.category}` : ''}`,
        title: t.data.site_name ?? t.data.title ?? t.id,
        subtitle: t.data.zinger ?? t.data.description,
        image: t.data.og_image ?? t.data.image,
        imageFit: 'inset',
      });
    }

    for (const g of await listedGuides()) {
      cards.push({ key: `guides/${guideSlug(g.id)}`, kicker: 'Recipe', title: g.data.title, subtitle: g.data.lede });
    }

    for (const s of await getCollection('sessions')) {
      cards.push({
        key: `sessions/${s.id}`,
        kicker: `Session · ${formatDate(s.data.date_scheduled)}`,
        title: s.data.title,
        subtitle: s.data.lede,
      });
    }

    for (const p of await getCollection('projects')) {
      if (p.data.publish === false) continue;
      cards.push({ key: `projects/${entrySlug(p)}`, kicker: 'Project', title: p.data.title, subtitle: p.data.lede, image: (p.data as any).hero_image ?? (p.data as any).og_image });
    }

    for (const w of await getCollection('workingGroups')) {
      if (w.data.publish === false) continue;
      cards.push({ key: `working-groups/${entrySlug(w)}`, kicker: 'Working group', title: w.data.title, subtitle: w.data.lede, image: (w.data as any).hero_image ?? (w.data as any).og_image });
    }

    for (const c of await getCollection('ventureWorkflows')) {
      cards.push({
        key: `read/venture-handbook/${chapterSlug(c.id)}`,
        kicker: `Venture Handbook · Chapter ${c.data.chapter_number}`,
        title: c.data.title,
        subtitle: c.data.lede,
        image: c.data.hero_image ?? c.data.og_image,
      });
    }

    for (const e of await getCollection('changelog')) {
      const d: any = e.data;
      if (d.publish === false) continue;
      cards.push({ key: `changelog/${e.id}`, kicker: 'Changelog', title: d.title ?? e.id, subtitle: d.lede ?? d.summary });
    }

    for (const p of await getCollection('participants')) {
      if (!p.data.publish) continue;
      const n = p.data.current_stack?.length ?? 0;
      cards.push({
        key: `people/${p.data.handle}`,
        kicker: [p.data.firm, p.data.kauffman_class ? `Kauffman ${p.data.kauffman_class}` : ''].filter(Boolean).join(' · ') || 'Dojo member',
        title: p.data.name,
        subtitle: n ? `${n} tool${n === 1 ? '' : 's'} in their stack.` : 'Member of the Agentic VC Dojo.',
      });
    }

    return cards;
  })());
}

export async function getShareCards(): Promise<ShareCard[]> {
  return [...(await getPageCards()), ...(await getSectionShares()).map((s) => s.card)];
}

/** The card key for a page path, or the site card when the page has none. */
export async function shareKeyForPath(pathname: string): Promise<string> {
  const key = pathname.replace(/^\/+|\/+$/g, '') || SITE_CARD_KEY;
  const keys = new Set((await getPageCards()).map((c) => c.key));
  return keys.has(key) ? key : SITE_CARD_KEY;
}
