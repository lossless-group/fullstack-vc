---
title: "Astro Knots"
slug: "astro-knots"
lede: "A pseudo-monorepo of Astro sites for the Lossless network — pattern library, shared markdown pipeline, and a place where small client teams ship fast without drift."
summary: "Astro Knots is the working group maintaining the umbrella repo that hosts FullStack VC, Hypernova, Cilantro, The Water Foundation, Dark Matter, and others as git submodules. We're learning, in public, where shared packages help and where copy-and-adapt is honest."
scope: "Workspace structure; site templates; shared markdown pipeline (LFM); pattern extraction from client work. Out of scope: a true monorepo where every component is shared at runtime."
status: active
date_initiated: 2025-06-01
date_last_activity: 2026-04-27
working_group_name: "Astro Knots WG"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "Bi-weekly · Mondays 11:00 PT"
links:
  repo: "https://github.com/lossless-group/astro-knots"
  spec: "https://www.lossless.group/projects/gallery/astro-knots"
tags: [Astro, Monorepo, Pattern-Library, Site-Architecture, Component-Reuse]
category: "Site Infrastructure"
origin: "Ported from lossless.group"
icon: "🪢"
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 3
authors:
  - "Michael Staton"
at_semantic_version: 0.2.0
date_created: 2025-06-01
date_modified: 2026-04-27
---

## Why this exists

We started with a simple question: *can a small team ship five client sites without each one becoming a snowflake?* Six months in we've learned that the answer is "yes, but not the way the JS ecosystem tells you to."

A true monorepo with shared packages at runtime created more problems than it solved — every brand wanted its own treatment, and the abstraction tax was higher than the reuse benefit. Pure copy-paste was equally painful — bug fixes never propagated.

Astro Knots is the synthesis: **pattern library by default, published packages where the abstraction is genuine.** The first real package is `@lossless-group/lfm` (markdown pipeline). Everything else is `@knots/*` patterns you copy and adapt.

## What we're building

- A workspace where every site is a git submodule, deployable from its own repo.
- `@knots/*` reference packages that sites copy from, not import.
- `@lossless-group/*` published packages where genuine sharing is justified (LFM is the first; more to come).
- A documented "pseudo-monorepo philosophy" so contributors don't accidentally re-introduce the abstractions we've explicitly rejected.

## Working group expectations

- Real client work is the input — patterns get extracted *after* they prove themselves in a paid engagement.
- Be willing to delete a shared abstraction when it's not earning its keep. Reversal is part of the practice.
