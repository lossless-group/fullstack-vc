---
title: "Lossless Flavored Markdown"
slug: "lossless-flavored-markdown"
lede: "A named, versioned extended markdown flavor — and the shared remark/rehype package that backs it — so every Lossless site renders content the same way."
summary: "LFM (Lossless Flavored Markdown) is the working group codifying the markdown features the network actually uses — citations with hex-code identifiers, directive-based callouts, GFM tables, image directives, and a wishlist of polyglot trigger syntaxes. The output is the @lossless-group/lfm package, published to GitHub Packages and JSR."
scope: "Markdown spec; shared remark/rehype pipeline; citation handling; directive system; component routing. Out of scope: a new MDX, a new content CMS."
status: archived
date_initiated: 2026-01-25
date_last_activity: 2026-04-26
working_group_name: "LFM WG"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "Bi-weekly · Mondays 14:00 PT"
links:
  repo: "https://github.com/lossless-group/astro-knots"
  spec: "https://github.com/lossless-group/astro-knots/blob/main/context-v/specs/Codifying-a-Comprehensive-Extended-Markdown-Flavor-and-Shared-Package.md"
tags: [Markdown, Remark, Rehype, Citations, Directives, Shared-Package]
category: "Content Infrastructure"
origin: "Astro Knots umbrella"
icon: "📝"
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 6
authors:
  - "Michael Staton"
at_semantic_version: 0.2.1
date_created: 2026-01-25
date_modified: 2026-04-26
---

## Why this exists

Across five+ sites we have five+ slightly different markdown pipelines — each fixing the same bugs in slightly different ways, each diverging a little further every month. LFM is the bet that:

1. **A documented flavor** lets authors know what syntax they can rely on.
2. **A shared package** means a citation bug fixed once is fixed everywhere.
3. **A polyglot parser** (directives + Markdoc + MDX-lite + Obsidian callouts → same node tree) means we don't have to fight authors about syntax.

## What we're building

- The `@lossless-group/lfm` published package (already shipping; consumed by mpstaton-site and now FullStack VC).
- A formal spec — feature catalog with Stable / Beta / Wish List tiers.
- A wish list backed by real authoring pain (highlights, wikilinks, auto-unfurl, slide separators).

## Working group expectations

- Authors tell us what they want to write; we figure out how to render it.
- Renderers tell us what they want to receive; we figure out how to parse it.
- The spec is a living document — read [the LFM spec](https://github.com/lossless-group/astro-knots/blob/main/context-v/specs/Codifying-a-Comprehensive-Extended-Markdown-Flavor-and-Shared-Package.md) before bringing a new feature request.
