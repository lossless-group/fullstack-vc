---
site_name: "Glen"
title: "Glen — shared memory for coding agents"
zinger: "Records your agent sessions and your team's, then quietly feeds the right context back into Claude Code, Codex or Cursor."
url: https://tryglen.com
slug: glen
date_created: 2026-11-18
date_modified: 2026-11-18
og_image: "/images/tool-banners/banner__glen.png"
og_favicon: "/images/tool-favicons/favicon__glen.svg"
description: "Glen is a memory and context layer for coding agents. It records your sessions and your team's, connects to your apps, and silently injects relevant context in the background, steering Claude Code, Codex or Cursor to finish faster, do better work and use fewer tokens. It adds shared skills and artifacts across a team, lets agents answer questions about their own past work, keeps a searchable library of agent sessions, and controls who can see which shared memories."
oss: false
publish: true
category: "Context Layers"
tags:
  - Memory-Layers
  - Context-Layers
  - Enterprise-Context-Layers
  - AI-Coding
  - Agent-Infrastructure
---

"Your agents finally learn and never forget." Every agent session starts from zero unless something carries the lessons forward; Glen is that something, at the level of a whole team rather than one person's notes file.

It sits in the same family as [[tools/memory-store|Memory Store]] and the home-connector pattern in [[guides/home-connector-on-cloudflare-artifacts/index|Build a Home Connector on Cloudflare Artifacts]]: a shared layer that every agent reads from. The difference is that Glen captures context automatically from the sessions themselves, instead of waiting for someone to write it down. For a fund building with [[tools/claude-code|Claude Code]], that means the second person to tackle a task inherits what the first one learned.
