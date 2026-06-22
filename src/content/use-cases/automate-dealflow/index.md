---
title: "Automate Dealflow"
lede: "Stop losing deals in your inbox. Capture inbound and sourced opportunities once, structure them automatically, and keep the whole funnel queryable — so nothing falls through and your partners see a clean pipeline."
perspective: use-case
problem: "Inbound, intros, and sourcing notes arrive in a dozen places and rot in my inbox. I want them captured, structured, and tracked without me being the bottleneck."
difficulty: intermediate
maturity_ladder:
  - "Crawl — Paste a forwarded deal email into Claude and ask it to extract company, stage, check size, and a one-line thesis into a consistent format."
  - "Walk — A saved prompt or template that turns any inbound (email, deck, intro) into a structured pipeline row you drop into Notion / Affinity by hand."
  - "Run — An agent that watches your inbox / a shared drive, classifies and enriches each new opportunity, and writes it to your CRM with a priority score — no manual step."
tools:
  - hermes-agent
  - openclaw
  - composio
  - n8n
order: 10
status: Draft
publish: false
date_created: 2026-06-22
date_modified: 2026-06-22
authors:
  - Michael Staton
augmented_with: "Claude Code on Opus 4.8"
tags:
  - Dealflow
  - Sourcing
  - Pipeline
  - CRM
  - Automation
---

# Automate Dealflow

## The problem, in one breath

A deal shows up — a forwarded email, a warm intro, a deck dropped in Slack, a note you scribbled after a call. Multiply that by everything you see in a week, and the front of your funnel becomes an unsearchable pile. The good ones get a reply; the rest evaporate. You *are* the integration layer between "an opportunity arrived" and "it's in the pipeline," and that's exactly the job an agent should take off your plate.

> [!info] What "automate dealflow" actually means here
> Not "an AI picks your investments." It means the **mechanical** parts — capture, extract, structure, route, remind — happen without you, so your judgment is spent on the deal, not on data entry.

## The maturity ladder

You don't have to jump to a fully autonomous agent. Most firms climb this in order:

> [!tip] Crawl → Walk → Run
> 1. **Crawl** — paste a deal into an LLM, get back a consistent structure. Zero setup, immediate value.
> 2. **Walk** — a reusable prompt/template that ingests inbound and emits a pipeline row you file by hand.
> 3. **Run** — an agent watches the source, enriches, scores, and writes to your CRM unattended.

Each rung is useful on its own. Pick the one that matches your appetite and your stack — and ratchet up when the lower rung starts feeling like the bottleneck.

## Guides for this use-case

These how-tos tackle automate-dealflow with a specific tool. (This list is derived from each guide's `use_cases:` relation — see the spec.)

- [[guides/hermes-agent/index|Put Hermes Agent on your dealflow]] — a persistent personal agent that captures inbound from your messaging accounts and remembers every deal.

## Tools that show up here

- [[tools/hermes-agent]] · [[tools/openclaw]] · [[tools/composio]] · [[tools/n8n]]

## Where this came from

This is the Dojo's most-named ask — straight from the launch survey ("automating the horrible parts of being an emerging manager," "end-to-end automations across sourcing, screening, follow-ups"). It's use-case #1 for a reason.
