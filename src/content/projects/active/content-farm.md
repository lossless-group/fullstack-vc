---
title: "Content Farm"
slug: "content-farm"
lede: "Editorial workflows that turn raw research into investor-grade narrative — at the cadence and quality of an analyst or thought leader."
summary: "Content Farm for professonal grade content development - exploring how a small VC team can produce sharp, defensible thought leadership rapidly, accurately, and exceeding expectation."
scope: "Editorial pipelines; market research; agentic drafting; citation discipline; publishing automation."
status: active
date_initiated: 2025-09-01
date_last_activity: 2026-04-22
working_group_name: "Professional Grade Content Development"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "Bi-weekly · WhatsApp chat"
working_group_slugs:
  - performance-content-development
links:
  repo: "https://github.com/lossless-group/content-farm"
  spec: "https://www.lossless.group/projects/gallery/content-farm"
tags: [Editorial-Workflow, Agentic-Drafting, Content-Automation, Market-Research]
category: "Workflow Pipelines"
origin: "Ported from lossless.group"
icon: "🌾"
image_prompt: "Isometric vector illustration of a small editorial workshop floating in deep navy space. A compact research desk in the foreground with stacked manuscript pages, a violet-glowing terminal cursor on a holographic editor pane, and threads of citations as fine luminous lines flowing from the pages into a network node above. Off to the side, a soft amber proof-reading lens hovers mid-air. Warm bone-colored paper textures contrasted against cool violet and cyan accents. Devtools-meets-dojo aesthetic, restrained light bloom, deep navy background, no human figures, no text."
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

>[!ALERT] Tool Preferences
> - We're currently building plugins for Obsidian that handle the research-to-outline loop and cite-aware drafting.
> - Our current experience is Perplexity - both native chat app and API integration - gives higher quality output than other tools.
> - Open to all ideas and tool preferences.  Everyone is figuring out their stack and workflow.

## Working group expectations

- Show up for some bi-weekly check-ins. Attempt to use various tools, including homegrown projects. Bring your drafts, show your output, share your wins and struggles.
- Develop original content that makes you proud, and share frustrations and shortcomings.
- Maintain high expectations for quality and rigor, as you would a professional analyst or visible thought leader.
- A bonus if you are willing to publish content as a guest on relevant sites.

## Current focus

- Obsidian plugins for research-to-outline and cite-aware drafting.
  - Currently have working prototypes:
    - Perplexed: a research-to-outline-to-draft tool: uses Perplexity API. or Perplexical on local machine to use an outline, do research, and make initial drafts.
    - Cite-Wide: citation-aware editing and validation: uses parsers to extract citations from drafts, instantly renumber, and manage unique citations across many files. 
- Lossless Flavored Markdown: a comprehensive markdown extension for academic, financial, and technical writing that can be rendered beautifully on the web. See [Lossless Flavored Markdown](/projects/lossless-flavored-markdown) for the shared package.
