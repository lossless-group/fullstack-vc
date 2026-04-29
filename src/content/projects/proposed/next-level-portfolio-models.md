---
title: "Next-Level Portfolio Models"
slug: "next-level-portfolio-models"
lede: "Live portfolio models — realtime data in, agents reading the update emails, scenarios to anticipate challenges before they explode, KPIs that aren't a Friday-night Excel job."
summary: "Move beyond excel — realtime feeds, agentic email triage, interactive viz, scenario forecasts, and FX-aware KPIs with minimal human drudge work."
scope: "Realtime data ingestion; portfolio-update email parsing; better-than-spreadsheet data layers; interactive visualizations; scenario-based forecasting; fund-level KPI reporting including currency arbitrage. Out of scope: building yet another general-purpose BI tool."
status: proposed
date_initiated: 2026-04-28
working_group_name: "Next-Level Portfolio Models"
cadence: "Proposed · Bi-weekly"
tags: [Portfolio-Modeling, Realtime-Data, Agentic-Email-Triage, Scenario-Forecasting, Fund-KPIs]
category: "Decision Support"
icon: "🛰️"
image_prompt: "Isometric vector illustration of a fund-level portfolio operations bridge floating in deep navy space. A central translucent dashboard panel displays a layered scenario chart with three forking forecast lines (violet, cyan, lime) tracking forward in time. To the left, a small constellation of glowing portfolio-company nodes beams thin signal-lines into the panel — representing realtime data feeds. Above the panel, a soft amber envelope dissolves into structured rows of data, suggesting an agent parsing portfolio-update emails into a clean ledger. To the right, a delicate currency-exchange ring rotates through three FX symbols, refracting light into the dashboard. Devtools-meets-dojo aesthetic, deep navy background, restrained light bloom, violet → cyan → amber accents, no human figures, no text."
publish: true
feature_in_popdown: true
popdown_order: 11
authors:
  - "Michael Staton"
at_semantic_version: 0.0.1
date_created: 2026-04-28
date_modified: 2026-04-28
---

## Pitch

The portfolio model is usually, in 2026, a stale, semi-updated, Excel file with some charts, incomplete data, that one analyst updates on a Friday afternoon (deep into the evening) scouring an inbox full of update emails. <-- Every part of that sentence is legacy. 

Realtime data exists. Agents can read update emails. Spreadsheet-shaped data has better homes than spreadsheets. Information with no shape can become structured data. Meaning, even wow, can be visualized and interactive. Forecasts can not only be generated but be actionable. KPIs can be live. Even foreign exchange rates can be tracked automatically, for all those international LPs you surely have. 

The question this working group asks: *what would a fund-level portfolio model look like if we built it the way we'd build a product in 2026?*

> [!IDEA] Some inspiration from our fearless leader, Fernando Fabre
> 
> ![A unified portfolio visualization](https://ik.imagekit.io/xvpgfijuw/FullStackVC-Embeds/chart__Portfolio-Model-Omega-Visualization_from-Fernando-Fabre.jpeg)
## What we'd build together

- **Realtime data ingestion** — a pipeline that pulls cap-table, revenue, and operating signals from the sources of truth (Carta, banks, billing, etc.) instead of from a quarterly screenshot.
- **Agentic email triage** — agents that parse portfolio-update emails into structured records, flag anomalies, and surface the things that actually need a partner's attention.
- **Beyond-Excel data layer** — the spreadsheet-shaped data lives somewhere queryable via AI Assistants, scripts, apps, and agents... so the "model" is a view over real data, not a file.
 - Database Apps (Airtable, NocoDB, SmartSheet, etc)
 - Serverless Databases (DuckDB, MongoDB, SurrealDB, etc)
- **Interactive visualizations** — scenario sliders, cohort views, and a dashboard a partner can actually steer.
- **Scenario-based forecasting** — bull / base / bear forecasts driven by levers you can tune, seen with meaning in time to act.
- **Fund-level KPI reporting** — TVPI, DPI, IRR, and reserves modeling, all with **currency-aware** computation so multi-region funds don't quietly lose to FX drift.
- **World-class LP reporting, automated** — quarterly updates, (heck, why not monthly updates!), executive summaries, and drill-downs that actually get read. Or, at least look awesome when they bother to look for them.

## Looking for

- A few committed members who've actually maintained a portfolio model and have opinions about where the drudge work hits hardest, and some good ideas about how to not only make it better but make it nearly disappear. And how to communicate it in a way that isn't a dataroom artifact, unopened, but a living, breathing, interactive, amazing experience.
- One participant that can Hack & Ship

## How to join

Reach out to the FullStack VC Dojo via Kauffman AI SIG Whatsapp. 
