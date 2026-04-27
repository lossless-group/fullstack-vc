---
title: "MemoPop AI"
slug: "memopop-ai"
lede: "Investment memos that pop — structured, citation-rich, and generated alongside the diligence rather than after it."
summary: "MemoPop AI is streamlining the investment memo: drafted in parallel with diligence, structured for both human reading and AI assistance, and traceable back to every source."
scope: "Memo structure; diligence-to-memo pipeline; partner-meeting-ready outputs; queryable memo archives. Out of scope: replacing the partner meeting itself."
status: active
date_initiated: 2025-10-15
date_last_activity: 2026-04-25
working_group_name: "MemoPop WG"
working_group_leads:
  - name: "Michael Staton"
    role: "Lead"
cadence: "Weekly · Tuesdays 12:00 PT"
working_group_slugs:
  - hack-and-ship
  - data-driven-venture
links:
  spec: "https://www.lossless.group/projects/gallery/memopop-ai"
tags: [Investment-Memos, Diligence-Workflow, Agentic-Research, Decision-Support]
category: "Decision Support"
origin: "Ported from lossless.group"
icon: "📑"
image_prompt: "Isometric vector illustration of a structured investment memo unfolding mid-air, pages laid out in a zig-zag 3D pattern in deep navy space. Each page glows with subtle violet section dividers and tiny amber footnote pills. Floating beside the memo: a small holographic queryable archive panel with cyan filter chips and a magnifying lens. Translucent blue threads connect the memo to a stylized diligence-call icon (a glowing waveform) and a model spreadsheet rendered as rows of subtle code-font numerics. Devtools-meets-dojo aesthetic, deep navy background with violet → cyan accents, restrained light bloom, no human figures, no text."
banner_overlay: "gradient"
publish: true
feature_in_popdown: true
popdown_order: 2
authors:
  - "Michael Staton"
at_semantic_version: 0.1.0
date_created: 2025-10-15
date_modified: 2026-04-25
---

## Why this exists

The investment memo has barely changed in 30 years: 8–15 pages, written after diligence, read once at IC, then filed. We think it should be:

- **Drafted *during* diligence**, not after — so the act of writing surfaces gaps in the work.
- **Structured for both humans and machines** — same content, queryable later (e.g., "show me every memo where we flagged regulatory risk").
- **Traceable** — every claim links back to a source artifact (call notes, model output, founder reference).

## What we're building

- A memo template that's structured enough to be parsed, loose enough to be readable.
- An agentic loop that ingests diligence artifacts (call transcripts, data room files, model outputs) and produces draft memo sections.
- A queryable memo archive — not RAG over PDFs, but structured queries over a memo collection.

## Working group expectations

- Bring a memo in flight, real or sanitized. Generic templates aren't enough to find the rough edges.
- Be willing to share what you'd actually write to your IC. The point is partner-meeting-grade output.

## Open questions

- How much structure is too much? At some point a structured memo becomes a form-fill exercise.
- What's the right relationship between a memo and a thesis document — same artifact or sibling artifacts?
