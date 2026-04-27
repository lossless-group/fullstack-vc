---
title: "LP Update Bot"
slug: "lp-update-bot"
lede: "An early experiment in agent-drafted LP updates — archived after we concluded the bottleneck wasn't drafting, it was approval."
summary: "LP Update Bot was an early working group exploring whether agents could draft quarterly LP updates from portfolio data. Archived in 2026-Q1 after we concluded the real bottleneck was the approval workflow, not the writing."
status: archived
date_initiated: 2025-04-01
date_archived: 2026-02-28
date_last_activity: 2026-02-15
working_group_name: "LP Update Bot WG (archived)"
tags: [LP-Reporting, Agentic-Drafting, Lessons-Learned, Archived-Project]
category: "Investor Reporting"
icon: "📨"
image_prompt: "Isometric vector illustration of a softly faded mailbot — a small violet robotic envelope-disposer hovering above a stack of partially-completed LP report pages, the topmost page marked with a translucent grey 'archived' band. Behind the bot, a faint cyan timeline ribbon trails off into deep navy space, fading. Subtle desaturation across the entire scene — this is a retrospective, not a celebration. Devtools-meets-dojo aesthetic, deep navy background, restrained desaturated palette with muted violet → grey accents, no human figures, no text."
publish: true
feature_in_popdown: false
authors:
  - "Michael Staton"
at_semantic_version: 0.3.0
date_created: 2025-04-01
date_modified: 2026-02-28
---

## Why we archived

Six months in we had a working drafting loop — agents could ingest the portfolio data, produce a credible LP update draft, and route it for review. The reviews never got faster.

The real cost of an LP update isn't the drafting — it's the partner-level decisions about *what to disclose, what to soften, and what to celebrate*. Agents don't reduce that cost. They just make the unedited draft show up faster.

## What we kept

- The data-ingestion side (portfolio metrics → structured artifacts) graduated into [MemoPop AI](/projects/memopop-ai).
- The "which sentences need partner judgment" classifier graduated into Context Vigilance as a generic review-boundary detector.

## What to read if you're tempted to try this again

- The pre-archive retro doc (in repo).
- The MemoPop AI spec — different angle on a similar surface.

## Lesson

If the bottleneck is *approval*, automating *drafting* doesn't help. Find the bottleneck first.
