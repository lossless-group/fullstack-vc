# FullStack VC

Homebase for the **Agentic VC Dojo** — a learning community of venture capitalists applying agentic AI with deliberate practice. Monthly working sessions, recordings, working groups for specific use cases, a coalition of the willing... and knowledge sharing that brings the community together.

> **Status:** Scaffolding complete. 

---

## What this site does

A small, opinionated marketing + community site:

- **Landing page** that explains the dojo to a first-time visitor.
- **`/webinars`** — calendar-style schedule of monthly sessions, grouped Live → Upcoming → Past. Each entry has a detail page with the session description.
- **`/changelog`** — public log of what we've shipped, with AI-generated banner images. Every entry leads with a "Why Care?" framing for both the firm and the end user.
- **`/brand-kit`** — internal brand reference (`noindex`).
- **`/design-system`** — internal component catalog (`noindex`).

---

## Where this fits

Part of the **[astro-knots](../../README.md)** family of websites maintained by [The Lossless Group](https://lossless.group). astro-knots is a pseudo-monorepo of independently-deployable Astro sites that share patterns, components, and conventions through pattern-reference packages (copy-and-adapt) and a small number of published packages (real npm dependencies).

This site is derived from [Astro Knots](https://github.com/lossless-group/astro-knots), a collection of sites developed by The Lossless Group. Most of them are for VCs, but quite sophisticated relative to typical VC sites.

Conventions, blueprints, and prompts that govern this site live under [`context-v/`](https://github.com/lossless-group/astro-knots/tree/main/context-v) at the [pseudomonorepo root](https://github.com/lossless-group/astro-knots/context-v/). **Read those first** if you're contributing, or like being very nerdy.

---

## Stack

- **Astro 6** (static SSG) + **Tailwind CSS 4** + **TypeScript 6**
- **pnpm** workspace member
- **Node 22+** for build scripts (uses native `--experimental-strip-types`, no `tsx` / `ts-node` deps)
- **Ideogram v3** API for changelog banner generation (build-time only)

---

## Quick start

```bash
# From the astro-knots monorepo root:
pnpm install                       # one-time
pnpm --filter fullstack-vc dev     # http://localhost:4321 (or next free port)
pnpm --filter fullstack-vc build   # static output → dist/
pnpm --filter fullstack-vc preview # serve dist/
pnpm --filter fullstack-vc check   # astro check (TS + content schema)
```

If you add a new `.md` to a content collection and the dev server doesn't pick it up, clear Astro's cache and restart:

```bash
rm -rf sites/fullstack-vc/.astro && pnpm --filter fullstack-vc dev
```

---

## Conventions

### Theme + Mode (firm-wide policy, three modes)

Every page renders in one of **three modes**: `light`, `dark`, or `vibrant`. The toggle lives in the header (`<ModeToggle />`) on every public page — a stakeholder-management feature that lets each viewer pick the rendering style that suits them.

- Architecture: dual-axis (`theme` × `mode`), both controlled via `data-*` attributes and classes on `<html>`.
- Switchers: `src/utils/{theme,mode}-switcher.js` — copied from the canonical `packages/ui/theme-mode/` pattern reference. SSR-safe, persist to localStorage, emit `theme-change` / `mode-change` events.
- Toggle UI: `src/components/ui/ModeToggle.astro` — also from the canonical package. Inline sun/moon/star SVGs, CSS-driven icon visibility via `html[data-mode="..."]` selectors.
- Booted by `BaseThemeLayout`. Pre-paint mode application in `BoilerPlateHTML` prevents FOUC.

**Full spec:** [`context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md`](../../context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md)

### Two-tier CSS token convention

Brand tokens live in `src/styles/theme.css` in two tiers:

- **Tier 1 — named tokens** (raw values): `--color__violet-electric: #7c5cff;`, `--font__lato: 'Lato', ...;`. The brand's palette of "things we have." BEM-ish syntax with `__` separator. Components do **not** reference these directly.
- **Tier 2 — semantic tokens** (system layer): `--color-primary: var(--color__violet-electric);`, `--font-body: var(--font__lato);`. Kebab-case so Tailwind v4's `@theme` auto-generates utilities. **All components and Tailwind utilities read from this tier.**

When iterating on the brand, you change which named token a semantic token points to. Components don't change. Tailwind utilities don't change. Search-and-replace across the codebase is never required.

The `--fx-*` effect tokens are mode-adaptive (different values in light / dark / vibrant) and drive glows, gradients, and card shadows.

**Full spec:** [`context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md`](../../context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md) §2.1

### Reference pages: `/brand-kit` + `/design-system`

Two internal pages, both `noindex,nofollow`, both required:

- **`/brand-kit`** — brand experience essentials (named colors, semantic colors, typography, marks, signature layouts). Audience: stakeholders / brand reviewers.
- **`/design-system`** — exhaustive component catalog (variants, props, CSS contracts). Audience: developers and AI assistants.

> **Maintenance motion:** every new component lands in `/design-system` in the same change that introduces it. Brand evolutions update `/brand-kit` first, before propagating elsewhere. **This discipline is what replaces Storybook in our workflow.** Skip it and the catalog rots.

**Full spec:** [`context-v/blueprints/Maintain-Design-System-and-Brandkit-Motions.md`](../../context-v/blueprints/Maintain-Design-System-and-Brandkit-Motions.md)

### Markdown rendering: a custom polyglot extended markdown flavor -- Lossless Flavored Markdown

Currently uses **Astro 6's built-in markdown renderer** (`render(entry).Content`) with minimal scoped prose styles per page (counters Tailwind preflight on `ul`/`ol`/`p`). No extended markdown features (citations, callouts, directives) are needed yet for this site's content shapes.

When this site needs richer markdown — citations on long-form posts, Obsidian-style callouts, image directives — adopt the firm's home-built **Lossless Flavored Markdown** stack:

- Package: `@lossless-group/lfm` (published to GitHub Packages and JSR)
- Bundles `unified` + `remark-parse` + `remark-gfm` + `remark-directive` + `remark-callouts` + `remark-citations` (hex-code footnote renumbering, structured definition parsing)
- Renderers: copy `packages/lfm-astro/components/{AstroMarkdown,Sources,Callout,CodeBlock,MarkdownImage}.astro` into `src/components/markdown/`
- Wire via `parseMarkdown(entry.body)` → MDAST tree → `<AstroMarkdown node={tree} />`

**Full spec:** [`context-v/blueprints/Maintain-Extended-Markdown-Render-Pipeline.md`](../../context-v/blueprints/Maintain-Extended-Markdown-Render-Pipeline.md). **Adoption guide:** [`../../CLAUDE.md`](../../CLAUDE.md) — search for "Implementing @lossless-group/lfm in a New Site."

### Tags are Train-Case

`Agentic-AI`, `Best-Practices`, `Two-Tier-Tokens`. Never `agentic_ai` or `agentic-ai`. Applies to all frontmatter `tags` arrays across content collections.

---

## Content collections

All Zod-validated schemas live in [`src/content.config.ts`](./src/content.config.ts).

### `webinars` — `src/content/webinars/*.md`

The Agentic VC Dojo schedule. **Status (`Upcoming` / `Live` / `Recorded`) is NOT in the frontmatter** — it's inferred at render time from `date_scheduled` + `durationMinutes` via [`src/lib/webinar-status.ts`](./src/lib/webinar-status.ts). Authors never set status manually.

```yaml
---
title: "Agentic VC Dojo · Topic"
lede: "One-sentence hook."
date_scheduled: 2026-06-15T17:00:00-04:00
date_posted: 2026-04-25
durationMinutes: 60
presenters:
  - Michael Staton
tags: [Agentic-AI, Venture-Capital, Community]
rsvpUrl: https://lu.ma/your-event-url
recordingUrl: https://...   # add after the session
---

Body markdown here.
```

Renders via:

- `<WebinarCard data={entry.data} href={`/webinars/${entry.id}`} />` — calendar-style card with date tear-off, status badge, dual CTAs (RSVP/Watch primary, "Learn more" secondary)
- `/webinars` index page — grouped Live → Upcoming → Past
- `/webinars/[id]` detail page — bigger date tear-off + full body

### `changelog` — `changelog/*.md` (top-level, not under `src/content/`)

Public log of what we've shipped. **Convention: first H2 is `## Why Care?`** with sub-sections for both the firm and the end user. Reverse-chronological on `/changelog`.

```yaml
---
title: "Title"
date: 2026-04-25
authors: [Michael Staton]
augmented_with: "Claude Code on Opus 4.7"
category: Feature
tags: [Train-Case, Tags]
summary: "One-paragraph summary."
files_modified:
  - sites/fullstack-vc/...
image_prompt: "Subject of the AI-generated banner — visual only, no text content"
image_text: "What the overlay should say"
image: "/changelog/{slug}__{hash}.png"   # written by gen:banners script
---
```

The `image:` field is **populated automatically** by the banner generation script (see below). Manual edits to it are overwritten.

### `pages` — `src/content/pages/*.md`

Generic standalone pages (about, membership, etc.). Loader registered, no entries authored yet.

---

## Banner generation pipeline

Each changelog entry can have a unique-but-brand-consistent banner image. The pipeline:

1. **Author** writes `image_prompt` (the visual subject) and `image_text` (overlay text) in the changelog's frontmatter.
2. **Build script** (`scripts/generate-changelog-banners.ts`) wraps the prompt in a brand-consistent style template, calls Ideogram v3 Generate (QUALITY tier, 3:1 aspect ratio), then runs the result through Layerize Text to strip any incidental letterforms the model baked in.
3. **Output** lands at `public/changelog/{slug}__{hash}.png` and the `image:` frontmatter field is updated automatically.
4. **Render time** — `<BannerWithOverlay>` displays the base image with the title text composited as crisp HTML/CSS in the brand's display font. Title is always pixel-perfect, mode-aware (color shifts with light/dark/vibrant), accessible, and editable without re-running the API.

**The brand color palette in the AI prompt is read from `theme.css` at build time** via [`src/lib/theme-tokens.ts`](./src/lib/theme-tokens.ts) — when designers iterate on `--color__violet-electric` etc., the next banner generation uses the new value automatically.

```bash
# Generates banners for all changelog entries (skips cached). Idempotent.
pnpm --filter fullstack-vc gen:banners
```

Cost: ~$0.15 per banner (Ideogram QUALITY tier + Layerize). Output is committed to git; binary handling is governed by `.gitattributes` in this directory (LFS migration commented in for when accumulation warrants).

**Setup:** add `IDEOGRAM_API_KEY=...` to `sites/fullstack-vc/.env` (gitignored). Get a key at [ideogram.ai/manage-api](https://ideogram.ai/manage-api).

**Full exploration:** [`context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md`](../../context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md) — covers the Generate→Layerize→Overlay pattern, the API surface, and the theme-tokens reader.

---

## Directory layout

```
sites/fullstack-vc/
├── .env                              # IDEOGRAM_API_KEY (gitignored)
├── .gitattributes                    # binary handling, LFS migration commented
├── astro.config.mjs                  # Astro 6 + Tailwind v4 + monorepo fs.allow
├── package.json
├── tsconfig.json
├── changelog/                        # top-level — not under src/content
│   └── 2025-04-25_*.md
├── public/
│   ├── favicon.svg
│   └── changelog/                    # generated banner PNGs (committed)
├── scripts/
│   └── generate-changelog-banners.ts # Ideogram API pipeline
└── src/
    ├── components/
    │   ├── basics/Header.astro       # site chrome with ModeToggle
    │   ├── changelog/BannerWithOverlay.astro
    │   ├── ui/ModeToggle.astro       # 3-mode cycle button
    │   ├── ui/ModeThemeToggle.astro  # explicit mode-pick + theme-toggle (brand-kit/design-system inspection)
    │   └── webinars/WebinarCard.astro
    ├── content/
    │   ├── pages/                    # general standalone pages
    │   └── webinars/                 # one .md per dojo session
    ├── content.config.ts
    ├── layouts/
    │   ├── BoilerPlateHTML.astro     # HTML skeleton + pre-paint mode script
    │   └── BaseThemeLayout.astro     # boots switchers, renders Header
    ├── lib/
    │   ├── theme-tokens.ts           # parses theme.css for build-time tools
    │   └── webinar-status.ts         # render-time status inference
    ├── pages/
    │   ├── index.astro
    │   ├── brand-kit/index.astro
    │   ├── changelog/{index,[id]}.astro
    │   ├── design-system/index.astro
    │   └── webinars/{index,[id]}.astro
    ├── styles/
    │   ├── global.css                # imports tailwindcss + theme.css + base resets
    │   └── theme.css                 # two-tier tokens, three-mode blocks, --fx-* effects
    └── utils/
        ├── api-connectors/ideogram.ts # typed Ideogram v3 wrapper
        ├── theme-switcher.js         # copied from packages/ui/theme-mode/
        └── mode-switcher.js          # copied from packages/ui/theme-mode/
```

---

## Where conventions are documented

| Topic | Location |
|---|---|
| Astro Knots philosophy + when to publish vs copy patterns | [`../../CLAUDE.md`](../../CLAUDE.md), [`../../README.md`](../../README.md) |
| New-site scaffolding (this site was built from this guide) | [`../../context-v/prompts/New-Site-Quickstart-Guide.md`](../../context-v/prompts/New-Site-Quickstart-Guide.md) |
| Three-mode + two-tier token system | [`../../context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md`](../../context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md) |
| Brand Kit + Design System pages | [`../../context-v/blueprints/Maintain-Design-System-and-Brandkit-Motions.md`](../../context-v/blueprints/Maintain-Design-System-and-Brandkit-Motions.md) |
| LFM markdown pipeline (when adopted) | [`../../context-v/blueprints/Maintain-Extended-Markdown-Render-Pipeline.md`](../../context-v/blueprints/Maintain-Extended-Markdown-Render-Pipeline.md) |
| AI banner generation tradeoffs + Ideogram API reference | [`../../context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md`](../../context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md) |
| Canonical 3-mode `ModeToggle` + switcher utilities | [`../../packages/ui/theme-mode/README.md`](../../packages/ui/theme-mode/README.md) |

---

## Deployment

**Deployed on Vercel.** 

---

## Contributing

If you're an AI assistant or human contributor:

1. **Read [`../../CLAUDE.md`](../../CLAUDE.md) first** — it's the source of truth for Astro Knots conventions and the philosophy behind import-vs-copy decisions.
2. **Read the relevant blueprints** in [`../../context-v/blueprints/`](../../context-v/blueprints/) before changing theme/mode, design-system, or markdown rendering code.
3. **Always update `/design-system`** in the same change that introduces or modifies a component. The catalog can't drift from the production code.
4. **Use pnpm/pnpx exclusively.** Never npm, npx, yarn, or node directly (except for the Node 22 `--experimental-strip-types` script invocations registered in `package.json`).
5. **Tags are Train-Case.** Always.
6. **Don't introduce `workspace:*` deps.** This site must remain independently deployable.

---

Made with intent by [The Lossless Group](https://lossless.group).
