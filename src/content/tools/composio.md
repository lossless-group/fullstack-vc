---
title: "The Tool-Calling & Auth Layer for AI Agents"
zinger: "Give your agents secure, managed access to 1,000+ apps — auth, tool calls, and sandboxed execution handled for you."
url: https://composio.dev/
og_image: "/images/tool-banners/banner__composio.png"
og_favicon: "/images/tool-favicons/favicon__composio.png"
slug: composio
date_created: 2026-06-22
date_modified: 2026-06-22
description: "Developer infrastructure that connects AI agents to external apps. Composio handles the unglamorous parts of agentic tool use — OAuth and delegated auth, just-in-time tool definitions, sandboxed execution, and parallel calls — across 1,000+ integrations (Gmail, Notion, Slack, GitHub, CRMs, and more). Works with the major agent frameworks and the model context protocol (MCP), so builders wire an agent into real systems without hand-rolling each integration."
docs_url: "https://docs.composio.dev/"
github_repo_url: "https://github.com/ComposioHQ/composio"
github_profile_url: "https://github.com/ComposioHQ"
pricing: "Freemium — free developer tier; usage-based and enterprise plans"
oss: true
publish: true
category: "Agent Infrastructure"
tags:
  - Agentic-AI
  - Tool-Calling
  - Agent-Infrastructure
  - Integrations
  - Developer-Tools
  - MCP
  - Auth
---

Composio is the integration and authentication layer that lets an AI agent actually *do* things in other systems. Instead of writing and maintaining a bespoke connector (plus its OAuth dance) for every app an agent needs, builders point Composio at the target apps and get back ready-to-use, function-callable tools with secure delegated auth, just-in-time tool definitions, sandboxed execution, and parallel calls across **1,000+ integrations** — Gmail, Notion, Slack, GitHub, Linear, CRMs, and the rest.

It slots in beneath the agent frameworks (LangChain, CrewAI, the OpenAI/Anthropic SDKs) and speaks **MCP**, so it complements rather than replaces tools like [[n8n]] or [[openclaw]]: those orchestrate workflows; Composio supplies the authenticated reach into third-party apps. For Dojo members building agents, it's the most direct answer to the recurring "how do I wire my agent into Affinity / Notion / Drive without it being a multi-day auth project" question — the plumbing is the product.

> OG share image left blank — fetch via the `crawl-fetch-ingest` skill or the OG fetcher when convenient.
