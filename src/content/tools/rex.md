---
site_name: "Rex"
title: "Rex — a persistent terminal and multiplexer by Superlogical"
zinger: "From Ghostty's creator: a terminal with the multiplexer built in, sessions that outlive the window, and a CLI and protocol made for coding agents."
url: https://www.superlogical.com/
slug: rex
date_created: 2026-11-18
date_modified: 2026-11-18
product_of: "Superlogical"
docs_url: https://www.superlogical.com/rex/docs
og_image: https://www.superlogical.com/updates/public-testing-beginning/og.webp
og_favicon: https://www.superlogical.com/favicon.ico
aliases:
  - Superlogical
  - Superlogical Rex
description: "Rex is the first product from Superlogical, Mitchell Hashimoto's company: a native terminal emulator and terminal multiplexer in one app. A background server keeps shells and processes running when you close the window, other devices can connect to your Rex server, and a CLI lets you script sessions. `rex skill setup` installs an agent skill for Claude Code, Codex, OpenCode and Pi so agents can drive it. Public testing began October 2026 (macOS only, invites via the mailing list); free, self-hostable, no account required."
pricing: "Free; self-hostable"
oss: false
publish: true
category: "Agent-Native Multiplexers"
tags:
  - Agent-Native-Multiplexers
  - Terminal-Multiplexers
  - Terminal-Emulators
  - AI-Coding
  - CLI-Tools
---

Superlogical says it's building "the multiplexer for all work" — local development, remote access, coding agents, background jobs, shared terminals, incident response — and starting with the terminal. Rex is that first step, from the person who built [[tools/ghostty|Ghostty]] (and, before that, co-founded HashiCorp).

The difference from [[tools/herdr|Herdr]] is where it sits: Herdr runs inside your terminal, Rex *is* the terminal. That makes it more polished and asks you to give more up — some reviewers note it lacks features long-time tmux users rely on, and it has no built-in AI assistant of its own. What it does have is an agent skill out of the box, so a [[tools/claude-code|Claude Code]] session started inside Rex can open panes, run commands and read their output.

A Dojo member using the beta calls it "great", without having tried the fancier features yet.

Still in testing: macOS only for now, with a stable public release targeted for late 2026.
