---
title: "Context Vigilance"
slug: "context-vigilance"
lede: "A practical framework for keeping AI agents performant and accurate — managing the context they read, what they remember, and what they're allowed to change."
summary: "Context Vigilance is the working group studying the discipline of running agents day-to-day inside a working firm. We codify what context to feed, when to checkpoint, when to compact, and where the trust boundaries belong."
scope: "Agent context engineering; memory hygiene; trust boundaries; review motions for agent-authored work. Out of scope: model selection, model training, prompt-as-product."
status: proposed
date_initiated: 2026-01-15
date_last_activity: 2026-04-26
working_group_name: "Context Vigilance WG"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "TBD"
working_group_slugs:
  - hack-and-ship
links:
  spec: "https://www.lossless.group/projects/gallery/context-vigilance"
tags: [Agentic-Workflows, Context-Engineering, Memory, Trust-Boundaries, AI-Practice]
category: "Agentic Practice"
origin: "Ported from lossless.group"
icon: "🛡️"
image_prompt: "Isometric vector illustration of a guardian motif: a small translucent shield in violet hovering over a stack of context document tiles arranged like steps. Below the shield, a tiny memory layer represented by a horizontal row of colored ribbons (violet, lime, amber) sliding through a glowing checkpoint gate. Subtle cyan trust-boundary lines surround a central agent node rendered as a small geometric core. Above, a single small star ornament marking vigilance. Devtools-meets-dojo aesthetic, deep navy background, restrained light bloom, violet → lime accents, no human figures, no text."
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 5
authors:
  - "Michael Staton"
at_semantic_version: 0.1.0
date_created: 2026-01-15
date_modified: 2026-04-26
---

## Why this exists

Most teams using agents are still in the "demo it once, marvel, then quietly stop" phase. The reason isn't model capability — it's *context discipline*. The agent that worked yesterday gets fed slightly different context today and produces noticeably worse output. Nobody has a name for what went wrong.

Context Vigilance gives that practice a name and a toolkit. We're not optimizing models. We're optimizing the *context* — what the agent sees, what it remembers, what it's allowed to do with what it learns.

## What we're building

- A vocabulary for the practice (context budgets, memory tiers, trust boundaries, review motions).
- Working examples per role (an analyst's daily loop, an associate's diligence loop, a partner's review loop).
- Diagnostic tools — when output drifts, what changed in the context?

## Working group expectations

- Bring an agent loop you actually run, not a hypothetical. We diagnose live.
- Read each other's memory files. The vigilance is collective.
