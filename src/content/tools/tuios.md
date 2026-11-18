---
site_name: "TuiOS"
title: "TuiOS — a terminal window manager that knows what your agents are doing"
zinger: "Tiling, nine workspaces, sessions that survive detaching, and one Inbox for everything your coding agents are waiting on."
url: https://tuios.dev/
slug: tuios
date_created: 2026-11-18
date_modified: 2026-11-18
github_repo_url: https://github.com/Gaurav-Gosain/tuios
og_image: https://tuios.dev/og/site/image.png
og_favicon: https://tuios.dev/favicon.ico
description: "TuiOS (Terminal UI OS) is an open-source terminal multiplexer and window manager written in Go by Gaurav Gosain. It offers tiling and floating windows across nine workspaces, a daemon that keeps sessions running when you detach, multi-machine support, a configuration UI and scripting — plus an Inbox where the coding agents in your panes report what they're waiting on. Install with `brew install tuios`."
pricing: "Free, open source"
oss: true
publish: true
category: "Agent-Native Multiplexers"
tags:
  - Agent-Native-Multiplexers
  - Terminal-Multiplexers
  - Open-Source-AI
  - CLI-Tools
  - AI-Coding
---

Where tmux gives you building blocks (sessions, windows, panes), TuiOS gives you an environment built from them: workspaces for your editor, shells, logs, dev servers and agents, managed like a small desktop that lives entirely in the terminal.

The agent-native part is the Inbox. Instead of cycling through panes to find the [[tools/claude-code|Claude Code]] session that stopped to ask a question, every agent's request lands in one list. Compare [[tools/herdr|Herdr]] (per-pane status, lighter footprint) and [[tools/rex|Rex]] (a whole new terminal). The [[tools/omarchy|Omarchy]] community has an open discussion about replacing tmux with TuiOS as its default.
