---
site_name: "MCP Market"
title: "Directory and management layer for MCP servers & Agent Skills"
zinger: "Find the MCP server or Agent Skill you need — then version, bundle, and sync it across every agent on your team."
url: https://mcpmarket.com/
og_image: "/images/tool-banners/banner__mcpmarket.png"
og_favicon: "/images/tool-favicons/favicon__mcpmarket.png"
slug: mcpmarket
date_created: 2026-08-08
date_modified: 2026-08-08
description: "A searchable directory of 42,000+ Model Context Protocol servers, MCP clients, and Agent Skills, organized by category (developer tools, browser automation, data science, analytics, security) with leaderboards for the most-installed entries. Its companion product, MCP Market Hub, turns those pieces into managed infrastructure: create or import SKILL.md files, draft/publish/version them, deploy custom MCPs, bundle tools and skills into toolkits, and sync the bundle to Claude Code, Claude Desktop, Codex, Cursor, or any MCP-enabled client with a one-line plugin install."
docs_url: "https://mcpmarket.com/tools/skills/what-are-skills"
pricing: "Directory free; Hub free tier, Pro $19/mo, Team $149/mo"
oss: false
publish: true
category: "Agent Infrastructure"
tags:
  - MCP
  - Agent-Skills
  - Agent-Infrastructure
  - Directories
  - Tool-Calling
  - Developer-Tools
  - Discovery
---

MCP Market is the "where do I find one" layer for the agent stack. The public directory indexes **42,000+ MCP servers** plus MCP clients and Agent Skills, sorted into categories (Developer Tools, Browser Automation, Data Science & ML, Analytics & Monitoring, Security & Testing, and ~20 more), with an Official/Featured tier and install-count leaderboards so you can tell a maintained server from an abandoned one. Most of the tools already in this registry have an entry there — [[firecrawl]], [[browserbase]], and [[jina-ai]]-style scrapers all show up under Web Scraping & Data Collection.

The second half is **MCP Market Hub**, which is where the directory stops being a bookmark list. Hub gives Agent Skills real version control — start from a blank `SKILL.md` or import from GitHub, then draft, publish, and roll back with a change history instead of copy-pasting prompt files between machines. You can deploy your own MCP servers (npm, PyPI, GitHub, Docker) alongside catalog ones, handle OAuth and API-key auth per user, bundle a set of servers and skills into a **toolkit**, and push that toolkit to every teammate through a single plugin install that stays synced. There's usage observability on top — tool-call volume, error rate, latency per skill and per server.

For the Dojo, the relevant question isn't "which MCP server exists" so much as "how does a small firm keep five people running the *same* skills and tools without drift." That's the toolkit + per-user-credentials story, and it's the closest thing yet to a package manager for the agent layer. It sits next to [[composio]] rather than replacing it: Composio supplies managed auth and reach into third-party apps; MCP Market supplies discovery, versioning, and team distribution for the servers and skills themselves. Works with [[claude-code]], Claude Desktop, Codex, and [[cursor]].
