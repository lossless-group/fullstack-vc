---
title: "Content Farm"
slug: "content-farm"
lede: "Editorial workflows that turn raw research into investor-grade narrative — at the cadence of an investment desk, not a magazine."
summary: "Content Farm is a working group exploring how a small VC team can produce sharp, defensible thought leadership without hiring a content team. We're codifying the loop from research notes → outline → draft → cite-check → publish, with agents doing the dull middle and humans doing the sharp ends."
scope: "Editorial pipelines; agentic drafting; citation discipline; publishing automation. Out of scope: SEO arbitrage, ghost-written op-eds, paid placements."
status: active
date_initiated: 2025-09-01
date_last_activity: 2026-04-22
working_group_name: "Content Farm WG"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "Bi-weekly · Wednesdays 10:00 PT"
links:
  repo: "https://github.com/lossless-group/content-farm"
  spec: "https://www.lossless.group/projects/gallery/content-farm"
tags: [Editorial-Workflow, Agentic-Drafting, Citations, Publishing, Investment-Memos]
category: "Workflow Pipelines"
origin: "Ported from lossless.group"
icon: "🌾"
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 1
authors:
  - "Michael Staton"
at_semantic_version: 0.1.0
date_created: 2025-09-01
date_modified: 2026-04-22
---

## Why this exists

Most VC content is either polished-but-late (a quarterly memo) or fast-but-shallow (a tweet thread). Content Farm asks: *what would it look like to produce one substantive, defensible piece per week — with citations, with a point of view, with the same intellectual standards we'd apply to a deal memo?*

The bet is that agentic tooling collapses the parts that are tedious (transcript wrangling, citation formatting, draft scaffolding) so a single principal can ship at a frequency that previously required a small editorial team.

## What we're building

1. **Research-to-outline loop** — agentic synthesis of long-form research into a navigable outline that a human edits before any prose is generated.
2. **Cite-aware drafting** — every generated sentence is tagged to its source; broken or weak citations fail the draft at build time.
3. **Editorial styleguide as code** — house style rules expressed as lintable rules, not PDF style guides.
4. **Publish surface integration** — clean handoff into the site's content collections (no copy-paste).

## Working group expectations

- Show up for the bi-weekly. Bring your draft, not just your opinions.
- Pick one piece in flight to shadow each cycle.
- Read the cited sources for at least one piece per month. Citations exist to be checked.

## Current focus

Migrating the citation system off bespoke regex onto the LFM hex-code standard. See [Lossless Flavored Markdown](/projects/lossless-flavored-markdown) for the shared package.
