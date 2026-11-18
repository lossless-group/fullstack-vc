---
site_name: "Herdr"
title: "Herdr — the runtime your coding agents live on"
zinger: "An agent-aware terminal multiplexer: run Claude Code, Codex and friends in panes that keep working after you close the window, and see which ones need you."
url: https://herdr.dev/
slug: herdr
date_created: 2026-11-18
date_modified: 2026-11-18
github_repo_url: https://github.com/herdrdev/herdr
og_image: https://opengraph.githubassets.com/d411640d87cbba8c0f6a7516e2ba3283c4c7689b5fe2918648f77edb345eb6d0/herdrdev/herdr
description: "Herdr is an open-source, tmux-like terminal multiplexer built around coding agents. It runs real terminals inside your existing terminal app, keeps sessions alive in a background server when you quit or disconnect, joins local and remote machines (over SSH) in one view, and flags each pane as working, blocked, done, idle or needs-you. A CLI and socket API (plus an official agent skill) let agents inspect and drive the multiplexer themselves. Single Rust binary; macOS, Linux and Windows."
pricing: "Free, open source"
oss: true
publish: true
category: "Agent-Native Multiplexers"
tags:
  - Agent-Native-Multiplexers
  - Terminal-Multiplexers
  - Agent-Orchestration
  - CLI-Tools
  - AI-Coding
---

The problem Herdr solves shows up the moment you run more than two agents at once: which tab was waiting on me? Herdr answers it with a status per pane (`hc ls` lists every agent, where it's working and whether it needs you) and an event stream you can watch.

It doesn't wrap your agents; it runs their real terminals, so [[tools/claude-code|Claude Code]], Codex, Pi or Amp behave exactly as they do today. Close the app and they keep working; reattach from the laptop or over SSH from a server.

**How it compares.** Herdr runs inside whatever terminal you already use. [[tools/rex|Rex]] replaces the terminal itself and folds the multiplexer in; [[tools/tuios|TuiOS]] goes further toward a full terminal desktop with workspaces and an agent Inbox. A Dojo member's honest first reaction — "this just looks like a skin for tmux, what am I missing?" — is fair: the difference is entirely in the agent-awareness.
