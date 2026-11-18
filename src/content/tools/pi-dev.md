---
url: "https://pi.dev"
slug: pi-dev
date_created: 2026-04-28
date_modified: 2026-11-18
site_uuid: 7baeeb5d-ff0a-4fc2-b8b6-2ee64d85338d
publish: true
site_name: "Pi"
title: "Pi — the minimal coding agent you make your own"
zinger: "An open-source terminal coding agent that ships the primitives, not the features — then rebuilds itself to fit your workflow."
description: "Pi is an open-source (MIT), terminal-based coding agent and agent toolkit from Earendil. It ships a deliberately minimal system prompt and core, and leaves features like sub-agents, plan mode, permission prompts and to-dos to extensions: TypeScript modules with access to tools, commands, shortcuts, events and the full TUI. It works with 15+ providers and hundreds of models (Anthropic, OpenAI, Google, Bedrock, Azure, xAI, Mistral, Groq, OpenRouter, Ollama and more), switchable mid-session. Sessions are stored as branchable trees you can rewind, export to HTML or share as a gist. It supports AGENTS.md, SYSTEM.md, skills, prompt templates and built-in MCP with Codemode, and runs in four modes: interactive TUI, print/JSON for scripts, RPC over stdin/stdout, and an SDK for embedding."
pricing: "Free, open source (MIT); bring your own model keys or subscriptions"
oss: true
category: "Coding Agents"
docs_url: "https://docs.pi.dev/latest"
github_repo_url: "https://github.com/earendil-works/pi"
og_image: "/images/tool-banners/banner__pi-dev.png"
og_favicon: "/images/tool-favicons/favicon__pi-dev.svg"
tags:
  - AI-Coding
  - Coding-Agents
  - Agent-Harnesses
  - CLI-Tools
  - Open-Source-AI
  - Developer-Tools
---

Pi's tagline is "there are many agent harnesses, but this one is yours." Where [[tools/claude-code|Claude Code]] and Codex are sealed products with features baked in, Pi is a small core you're expected to change: ask Pi to build the command, tool or workflow you want, hit `/reload`, and keep going. Over 50 example extensions and a [package registry](https://pi.dev/packages) cover the usual asks (sub-agents, plan mode, permission gates, sandboxing, SSH) if you'd rather install than build.

**Why it matters beyond coders.** Pi is also the engine inside other agents: [[tools/openclaw|OpenClaw]] embeds it through the SDK, and the multiplexers ([[tools/herdr|Herdr]], [[tools/rex|Rex]]) list it alongside Claude Code and Codex as a first-class agent. When people talk about agent *harnesses*, Pi is the clearest example of the idea: the model is swappable, and the harness (prompt, tools, memory, workflow) is what you own.

**Good fits for a fund.**

- **Model freedom:** one agent across Claude, GPT, Gemini, open models via [[tools/openrouter|OpenRouter]] or local models via Ollama, switching mid-session with `/model`. Useful for comparing models on the same diligence task.
- **Scripting:** `pi -p "…"` in print mode turns a prompt into a shell step, e.g. a nightly job that summarizes new files in a deal folder.
- **Shareable sessions:** `/share` publishes a whole session tree as a link, a lightweight way to show a colleague exactly how an analysis was done.

**Trade-offs.** No permission popups by default: run it in a container or add a permission-gate extension before pointing it at anything sensitive. And the minimalism is the point: if you want everything working out of the box, Claude Code is the easier start.
