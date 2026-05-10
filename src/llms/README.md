# Source of truth: human-editable prose for the llms.txt endpoints

These markdown files are read at build time by the endpoints in
`src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts`. The endpoints are
deliberately dumb — they do token substitution and append the dynamic
corpus content. **All voice, framing, and structural prose lives here, not
in TypeScript.**

If you want to tweak the wording on `/llms.txt` or `/llms-full.txt`, edit
the corresponding `.md` file in this directory and rebuild. No code changes.

## Files

- `llms.md` — template for `/llms.txt` (the link index).
- `llms-full.md` — template for `/llms-full.txt` (the concatenated full content).

## Tokens (substituted at build time)

| Token | Replaced with |
|---|---|
| `{{SITE_NAME}}` | `SITE_SEO.siteName` from `src/config/seo.ts` (currently "FullStack VC") |
| `{{VENTURE_HANDBOOK_COUNT}}` | Number of published entries in the `ventureWorkflows` collection |
| `{{SESSION_COUNT}}` | Number of published entries in the `sessions` collection (excluding `unlisted: true`) |
| `{{PROJECT_COUNT}}` | Number of published entries in the `projects` collection |
| `{{WORKING_GROUP_COUNT}}` | Number of published entries in the `workingGroups` collection |
| `{{TOOL_COUNT}}` | Number of published entries in the `tools` collection |
| `{{PARTICIPANT_COUNT}}` | Number of published entries in the `participants` collection (`publish: true` only) |
| `{{CHANGELOG_COUNT}}` | Number of entries in the `changelog` collection |
| `{{LLMS_FULL_URL}}` | Absolute URL to `/llms-full.txt` |
| `{{LLMS_INDEX_URL}}` | Absolute URL to `/llms.txt` |
| `{{VENTURE_HANDBOOK_INDEX}}` | Generated link list of Venture Handbook chapters, sorted by `chapter_number` (used in `llms.md`) |
| `{{SESSIONS_INDEX}}` | Generated link list of sessions, sorted by `date_scheduled` desc (used in `llms.md`) |
| `{{PROJECTS_INDEX}}` | Generated link list of projects, grouped by `status` then sorted by recent activity (used in `llms.md`) |
| `{{WORKING_GROUPS_INDEX}}` | Generated link list of working groups, grouped by `status` (used in `llms.md`) |
| `{{TOOLS_INDEX}}` | Generated link list of tools, alphabetical by title (used in `llms.md`) |
| `{{PARTICIPANTS_INDEX}}` | Generated link list of participants, alphabetical by name (used in `llms.md`) |
| `{{CHANGELOG_INDEX}}` | Generated link list of changelog entries, sorted by `date` desc (used in `llms.md`) |
| `{{CORPUS_BODIES}}` | Concatenation of Venture Handbook + sessions + projects + working groups + tools + participants + changelog raw bodies with metadata headers (used in `llms-full.md`) |

Tokens are simple `{{NAME}}` placeholders — no Mustache, no Handlebars, no
templating engine. If a token is missing in the markdown, the endpoint emits
the file without it. If you add a new dynamic value, register it in the
endpoint's substitution map and document it here.

## Why a separate directory and not `src/lib/` or `src/content/`?

`src/lib/` is for code (TypeScript). `src/content/` is for Astro content
collections, which expect specific schemas and Astro-managed loaders. These
files are neither — they're prose templates that the build step reads as raw
strings via Vite's `?raw` import. Giving them their own directory keeps the
purpose obvious and makes the source-of-truth boundary easy to find.

## Scope decision: ship BOTH `/llms.txt` AND `/llms-full.txt`

Per the habit at
`context-v/habits/Maintain-LLM-Txt-Standard-across-Significant-Sites-&-Splash-Pages.md`,
sites with substantive markdown content collections ship both files. FullStack
VC qualifies because:

- The **Venture Handbook** (`ventureWorkflows`) is a 10-chapter long-form work
  drafted in public — exactly the use case the spec was designed for.
- **Sessions** carry meaningful long-form descriptions (lede + body) that
  reward concatenated ingest by an LLM trying to learn what the Dojo
  discusses month over month.
- **Projects** and **Working Groups** carry substantive markdown bodies
  describing scope, status, and ambitions.
- **Changelog** entries are written as ship notes with body content, not
  bare commit lines.

Together these are sizeable and structured enough that an LLM benefits from
one fetch over crawling 80+ HTML pages.

## URL patterns and the publish/private gate

The endpoints emit canonical URLs that match the rendered HTML page templates:

- Venture Handbook chapters: `/read/venture-handbook/${slug}/` — slug derived
  from `entry.id` with the leading `NN-` chapter prefix stripped (matches
  `src/pages/read/venture-handbook/[slug].astro`'s `getStaticPaths`).
- Sessions: `/sessions/${entry.id}/` — from `src/pages/sessions/[id].astro`.
- Projects: `/projects/${slug}/` — slug from `entry.data.slug ?? last segment
  of entry.id`. See `src/lib/load-projects.ts:projectHref`.
- Working groups: `/working-groups/${slug}/` — same shape as projects. See
  `src/lib/load-working-groups.ts:workingGroupHref`.
- Tools: `/stacks/${entry.id}/` — slug = entry id. (URL pattern from `/stacks`
  surface; if the on-site URL changes, update both endpoints in lockstep.)
- Participants: `/people/${handle}/` — `entry.data.handle` is the URL key.
- Changelog: `/changelog/${entry.id}/` — from `src/pages/changelog/[id].astro`.

### Publish gates

Each collection's gate is copied verbatim from its rendering surface so the
two cannot drift:

- `ventureWorkflows` — page template at `/read/venture-handbook/[slug].astro`
  intentionally renders all chapters regardless of `published`. The endpoints
  apply the same default-permissive behavior so `/llms.txt` and the rendered
  HTML stay in sync. (When the page template starts gating on `published`,
  update both endpoints in the same commit.)
- `sessions` — page template uses no publish gate but excludes `unlisted:
  true` from listing pages. The endpoints apply the same:
  `data.unlisted !== true`.
- `projects` — `loadAllProjects` filters with `data.publish !== false`. The
  endpoints reuse that loader so the predicate cannot drift.
- `workingGroups` — `loadAllWorkingGroups` filters with `data.publish !==
  false`. Same — endpoints reuse the loader.
- `tools` — page templates surface every tool today. The endpoints apply
  `data.publish !== false` defensively in case a `publish` field starts being
  set later.
- `participants` — schema's `publish` field defaults to `false`. The endpoints
  apply `data.publish === true` so only opted-in profiles surface to LLMs.
- `changelog` — schema has no publish gate; all entries are public.

## Server output (Vercel) and prerender

This site is `output: 'server'` (Vercel adapter). The llms.txt endpoints
declare `export const prerender = true` so Astro emits them as static files
at build time rather than evaluating per request. That keeps the multi-MB
`/llms-full.txt` off the request hot path.

## Sibling habit

Sitemap + robots.txt is the search-engine companion to this. Both ship
together; the sitemap filter at `astro.config.mjs` explicitly excludes
`/llms.txt` and `/llms-full.txt` so the two don't pollute each other.
