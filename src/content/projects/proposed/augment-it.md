---
title: "Augment It"
slug: "augment-it"
lede: "Data augmentation workflows that take any data source and performs research, updates and augments data, and restructures it for both humans and machines."
summary: "Augment It is tooling that turns raw, messy investment data (founder profiles, market signals, portfolio updates) into clean, queryable, action-ready artifacts."
scope: "Data augmentation pipelines; micro-frontend composition; vendor-free enrichment workflows. Out of scope: a CRM. We're building the layer alongside your CRM."
status: proposed
date_initiated: 2025-11-01
date_last_activity: 2026-04-20
working_group_name: "Data-Driven Investment Practice"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "TBD"
working_group_slugs:
  - data-driven-venture
links:
  spec: "https://www.lossless.group/projects/gallery/augment-it/specs/data-augmentation-workflow-with-microfrontends"
tags: [Data-Augmentation, Micro-Frontends, Investment-Data, Workflow-Composition]
category: "Data Workflows"
origin: "Ported from lossless.group"
icon: "✨"
image_prompt: "Isometric vector illustration of small modular UI tiles floating in deep navy space, each tile a translucent violet card carrying a single-purpose data primitive (a domain enrichment node, a job-title normalizer, a signal scorer, a deduplication ring). Threads of cyan light connect three of the tiles into a small composed workflow at the foreground. Above the composition, a soft amber pulse marker shows a recent augmentation run. Devtools-meets-dojo aesthetic, deep navy background, restrained light bloom, violet → cyan → amber accents, no human figures, no text."
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 4
authors:
  - "Michael Staton"
at_semantic_version: 0.1.0
date_created: 2025-11-01
date_modified: 2026-04-20
---

## Why this exists

Every VC firm has a vendor problem. Crunchbase for sourcing, Affinity for CRM, Pitchbook for benchmarks, six different newsletters for signal — and none of them talk to each other. The work of *making them talk* is uncompensated labor that lands on whoever has the most patience for spreadsheets.

Augment It asks: *what if that work was the product?* What if a non-engineer could compose a "founder enrichment" workflow the same way they compose a Notion doc — picking blocks, wiring them together, hitting run?

## What we're building

- A library of small augmentation primitives (enrich a domain, normalize a job title, score a signal).
- A composition surface (micro-frontends) where these primitives can be wired into workflows.
- A run history so you can see what enriched what, and re-run when the underlying data changes.

## Working group expectations

- Bring real data, sanitized as needed. Synthetic data finds synthetic problems.
- Be willing to build for *your own* daily workflow first. If you wouldn't use it, neither will anyone else.
