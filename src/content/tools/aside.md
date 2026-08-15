---
site_name: "Aside"
title: "The browser built to do real work for you"
zinger: "Benchmark-leading agentic browser that operates your logged-in accounts like a human — with memory that stays on your machine."
url: https://aside.com/
slug: aside
date_created: 2026-08-15
date_modified: 2026-08-15
description: "A standalone Chromium desktop browser from Aside Computer Inc. (YC F25, San Francisco), built so an in-browser agent can complete real tasks across the websites and accounts you're already logged into — Gmail, Notion, Slack, Figma, banking portals, internal tools — with no integrations, because it drives the UI the way a person does. Turns browsing history into on-device memory so you stop re-explaining context every task, and ships an agent-oriented password manager. Currently tops three agent benchmarks (Online-Mind2Web, BU-Bench-V1, Odysseys). macOS only; bring your own ChatGPT or Claude subscription."
pricing: "Free to download; bring-your-own-model (your existing ChatGPT/Claude plan, optional API key billed per token, or Aside cloud credits)"
oss: false
publish: true
category: "Agentic Browsers"
tags:
  - Agentic-Browsers
  - Agentic-AI
  - Browser-Automation
  - Local-First
  - Y-Combinator
---

Aside's pitch is the sharpest in the category: **no integrations.** Where most automation tooling asks which SaaS connectors it can install, Aside's agent just uses the websites and the logins you already have, operating them the way you would by hand. That covers the long tail of venture software that will never expose an API you can get a key for — a portco's internal dashboard, a fund-admin portal, a data room with a bespoke viewer.

Two design choices make it interesting beyond the benchmark scores (it currently leads Online-Mind2Web, BU-Bench-V1 and Odysseys). First, **memory is on-device** — your browsing history becomes context the agent can draw on without that history leaving your machine, which is the difference between "useful" and "permissible" when the material is portfolio-company correspondence. Second, it's **bring-your-own-model**: you point it at the ChatGPT or Claude subscription you already pay for rather than buying another seat.

The constraints are real: macOS only, and the company is young enough that it shouldn't be load-bearing for a firm-critical process yet. It's the flagship tool for the portco-email-to-filed-PDFs recipe in [[guides/agent-native-browsers/index|Orientation: Agent-Native Browsers]], where it pairs with [[tools/claude-code|Claude Code]] — the browser gets data out of a system with no API, Code reasons across the resulting folder. Compare with [[tools/comet|Comet]] (free, every platform) and [[tools/dia-browser|Dia]] (better at reading, less aggressive about acting).
