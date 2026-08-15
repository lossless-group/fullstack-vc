---
title: "Orientation: Claude Desktop vs Claude Code"
lede: "Same brain, two very different bodies. Claude Desktop is a brilliant chat app; Claude Code is an agent with hands — it can traverse your file system, soak up your real context, and write its work to disk. Here's why Code wins for real work, why Desktop is still cool, and when to reach for each."
kind: orientation
tools:
  - claude-code
  - claude-desktop
prerequisites: []
estimated_minutes: 10
difficulty: beginner
video: ""
order: 15
status: Draft
publish: true
date_created: 2026-07-29
date_modified: 2026-08-15
authors:
  - Michael Staton
augmented_with: "Claude Code on Fable 5"
tags:
  - Claude-Code
  - Claude-Desktop
  - Agentic-AI
  - Orientation
  - Getting-Started
---

> [!info] The one-sentence verdict
> Both run the same Claude models. **Claude Code wins for real work** because it operates *in* your world — it traverses your file system, reads your actual context, and writes results to disk. **Claude Desktop is still cool** — it's the better front door, the better reading room, and the better fit for half your day. The pros use both, deliberately.

## Same brain, different bodies

This is the framing that makes everything else click: when you compare Claude Desktop and [[tools/claude-code|Claude Code]], you are **not** comparing intelligences. It's the same Claude underneath. You're comparing *embodiments* — what the model is allowed to touch.

- **Claude Desktop** embodies Claude as a **conversation partner**. It lives in a chat window. Things enter its world when you paste them, upload them, or wire up a connector. Things leave its world when you copy them out.
- **Claude Code** embodies Claude as a **worker on your machine**. It lives in your terminal, inside a folder you choose. Its world *is* your file system, and its output is not a reply — it's a change: files written, edits made, commands run.

That single difference — chat window vs. file system — explains every practical divergence between them.

## Why Claude Code wins for real work

**It traverses your file system.** Point it at a folder and it can list, search, and read everything in it — and navigate outward to wherever else it needs (with your permission). A data room of PDFs, four years of deal memos, a folder of portfolio board decks, your notes vault: it walks the tree itself. In Desktop, *you* are the file system — dragging documents in one upload at a time, re-establishing context every conversation.

**It accesses your real context.** Your actual working context isn't in any chat thread — it's in files: the spreadsheet's formulas, the config that explains why something behaves oddly, the folder structure that encodes how your firm thinks. Claude Code reads all of it in place. Better: it can *persist* context in files — a `CLAUDE.md` of standing instructions, memory notes it maintains across sessions — so every session starts already knowing how you work. Desktop's Projects feature gestures at this; a file system does it natively.

**It writes to disk.** This is the big one. Ask Desktop for a memo and you get text in a bubble — the copy-paste is your job, the filing is your job, version one lives nowhere. Ask Code and the memo lands in `memos/2026-07-29_acme-series-b.md`, in the right folder, alongside a changelog entry, committed to git if you want history. The work product *arrives filed*. Multiply that by everything: it doesn't describe the fix, it applies it; it doesn't draft the analysis, it writes the analysis and the script that regenerates it next quarter.

**It compounds.** Because everything lives in files, session two builds on session one's output. Chat conversations end; a workspace accretes.

Nearly everything the Dojo has built — the polling system, the session decks, these very Recipes — was made by describing intent to Claude Code and letting it work across the file system. None of it is buildable in a chat window.

## The multiplier: many sessions at once, one per folder

Everything above describes *one* Claude Code session. The thing that changes the economics of your day is that you can run several at the same time — each one anchored to a different folder, each with its own context, its own memory, its own permissions.

**How it works.** A session is scoped to the directory you launched it in. Open a new terminal tab, `cd` somewhere else, type `claude`, and you have a second worker that knows nothing about the first — different files, different `CLAUDE.md`, different history. Nothing is shared but your machine.

```bash
# Tab 1 — the fund's memo archive
cd ~/fund/memos && claude

# Tab 2 — the portfolio data room
cd ~/fund/data-room/acme && claude

# Tab 3 — the website
cd ~/code/site && claude
```

In Ghostty that's `Cmd+T` per session. This is the payoff of the terminal setup — tabs are the concurrency primitive, and you already have them. (There's a whole class of tooling built to manage this at higher volume — see [For the Geekmaxxers](#for-the-geekmaxxers) at the end.)

**Why this matters more than it sounds.** The bottleneck in agentic work is *you*. A session doing a twenty-minute pass over a data room is twenty minutes you spend watching a progress log. With three sessions, that dead time becomes the time you're reviewing session two's output and briefing session three. You stop being the worker and start being the desk that assigns work.

The patterns that show up in practice:

- **One session per workstream.** Diligence in one folder, the memo it feeds in another, the website in a third. Contexts stay clean — no session is carrying three unrelated problems in its head.
- **Long-runner plus reviewer.** Set the slow, sprawling task going in one tab (read every PDF in this data room and extract the terms), keep a second tab in the same folder for quick questions while it works.
- **Reader and writer.** One session mining source material, one drafting from what it surfaces — you carry the findings across by hand, which is a feature: you decide what's worth passing on.

**The rules that keep it from getting messy:**

1. **Two sessions writing the same file will clobber each other.** Nobody is coordinating them. Give each session its own folder, or — for parallel work in one repo — give each a `git worktree` so they're on separate checkouts of the same project.
2. **You are the scheduler.** No session tells you it's blocked on a permission prompt. Sessions waiting on your approval are sessions doing nothing; make a habit of cycling through tabs.
3. **Three is usually the ceiling.** Not a technical limit — an attention limit. Past three you're not supervising, you're just accumulating output you haven't read.
4. **Usage adds up in parallel.** Four sessions burn tokens four times as fast. Worth knowing before you leave six running over lunch.

> [!info] Sessions vs. subagents
> Claude Code can also spin up **subagents** inside a single session — helpers it dispatches and supervises itself, sharing that session's folder and goal. That's Claude parallelizing its own work. Multiple sessions are *you* parallelizing yours: separate folders, separate context, separate judgment about what each is for. Use subagents to go faster on one problem; use sessions to work on several.

**Where Desktop's work lives, by contrast.** Desktop has no equivalent, and the reason is worth stating plainly: it has no working directory. Claude Code's first move is `cd` — you pick the folder, and that folder *is* the session's world. Desktop never asks, because it isn't working on your machine. It works on Anthropic's servers, and it keeps what it makes there: the conversation, the files you uploaded into it, and the artifacts it produced all live inside that thread, in your account. A **Project** is the closest thing to a folder — a knowledge base several chats can draw on — but it's a bucket in the cloud, not a directory on your disk, and nothing in it is visible to any other tool you use. Getting work *out* is a deliberate act every time: copy the text, or hit download and go find the file sitting in `~/Downloads`, unfiled, detached from the folder it actually belongs to.

Which means parallelism in Desktop is **jumping between chats** — same body, same window, one conversation in focus at a time, each carrying its own history and none of them anchored anywhere. Three conversations, not three workers.

## Why Claude Desktop is still cool

Genuinely, not consolation-prize cool:

- **It's the frictionless front door.** Zero setup, no terminal, no folder to choose. For a quick question, a gut-check, a "summarize this PDF," opening a terminal is overkill. Desktop is where casual use *should* happen.
- **Connectors reach where files don't.** Through MCP connectors, Desktop talks to your Gmail, Calendar, Drive, CRM — live services rather than local files. "Find the thread where that founder mentioned their burn rate" is a Desktop-shaped question.
- **Artifacts are a lovely medium.** Interactive charts, small web apps, polished documents rendered live next to the conversation — great for shareable one-offs.
- **It meets non-technical colleagues where they are.** Your ops person or an EA gets real value from Desktop on day one. Prescribing a terminal to everyone is how rollouts die. (Also: your phone. Code has no thumbs-friendly mode.)
- **It follows you across devices.** Because the work lives server-side, it's waiting wherever you sign in. A thread you started at your desk is there in full on the Claude iOS or Android app — pick it up in the back of a cab, keep going, and find it again on the laptop that evening. The cloud storage that costs Desktop a working directory is exactly what buys it continuity. A Claude Code session, by contrast, sits on the one machine it ran on.
- **It's the better reading room.** Long thinking-out-loud conversations — talking through a term sheet, pressure-testing a thesis — feel natural in chat and gain nothing from file access.

## When to reach for which

| Situation | Reach for |
|---|---|
| Quick question, gut-check, summarize one document | Desktop |
| Talking through a decision, drafting from scratch | Desktop |
| Anything touching email / calendar / CRM via connectors | Desktop |
| On your phone, or helping a non-technical teammate | Desktop |
| Work spanning many files or folders (data rooms, memo archives) | Code |
| Output that should *land* somewhere and persist | Code |
| Anything repeatable — scripts, pipelines, site changes | Code |
| Building durable context that compounds across sessions | Code |
| Several unrelated workstreams you want moving at once | Code |

The honest pattern: **think in Desktop, work in Code.** Many things start as a Desktop conversation and graduate into a Code session the moment they touch real files.

## The upgrade path

The only real barrier between you and Claude Code is terminal comfort — and that's a solved problem: [[guides/terminal-setup-ghostty-oh-my-posh/index|How To: Getting Unafraid and Setting Up Your Terminal]] gets you a terminal you'll actually enjoy in about 25 minutes. Then:

```bash
brew install --cask claude-code
cd ~/some-folder-with-real-files
claude
```

Ask it to look around. Ask it to organize something. Watch it write a file. The difference between a chat window and an agent in your file system stops being an abstraction in the first five minutes.

## For the Geekmaxxers

Skip this section unless running three agents at once already sounds too small. Terminal tabs are fine up to about three sessions. Past that, two problems bite — and both are the rules from earlier, showing up as tooling requirements.

**Problem one: tabs show you text, not state.** A tab full of scrollback doesn't tell you which agent is blocked waiting on your approval, which finished nine minutes ago, and which died quietly at some point this afternoon. You find out by clicking through all of them.

**Problem two: isolation is manual.** Two agents in one repo will step on each other. A `git worktree` per agent fixes it, but you're the one creating, tracking, and tearing down the worktrees.

Terminal multiplexers solve the first half of this and have for years. [**tmux**](https://github.com/tmux/tmux/wiki) is the 2007 tool that turns out to be exactly right for the agentic era — process isolation, session persistence, detach and reattach, and an agent that keeps working after you close the laptop or drop the SSH connection. Claude Code's own tooling leans on it. [**Zellij**](https://zellij.dev/) is the modern Rust-written alternative with friendlier defaults. Both are agent-agnostic: they multiplex terminals, and an agent is just a process in one.

The newer crop is **agent-aware** — it knows a pane is running Claude Code, and it knows what that agent is currently doing:

| Tool | Shape | What it adds over tabs |
|---|---|---|
| [herdr](https://terminaltrove.com/herdr/) | Single Rust binary, tmux-like keys | Detects agent state from process and output heuristics; ships integrations for Claude Code, Codex, opencode and others. Agents talk *back* to it over a Unix socket — spawning panes, reading sibling output, waiting on state changes. Runs as a server, so closing a window doesn't kill the work. |
| [muxel](https://muxel.sh/) | Native GUI app (GPUI) | Shaped like an agent manager rather than a terminal: first-class git worktrees, live per-agent status, task runners and scheduled loops, SSH remotes, built-in editor and file browser, and a notification when an agent needs you. |
| [rmux](https://rmux.io/) | Rust rewrite, tmux-compatible | Drop-in tmux compatibility (~90 commands, your keybindings survive) plus a typed async SDK for Rust, Python and TypeScript — so a supervisor script can drive terminals the way Playwright drives a browser. Windows, macOS, Linux. |
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | TUI orchestrator on top of tmux | Solves problem two directly: every task gets its own git worktree automatically, no conflicts and nothing for you to tear down. Runs tasks in the background with optional auto-accept, and lets you review each agent's diff before checking it out. Agent-agnostic across Claude Code, Codex, Gemini and Aider. |

The feature worth paying attention to when you compare them is **notification on blocked** — the multiplexer telling you *an agent needs you* instead of you discovering it on your next lap through the tabs. That's the thing that actually raises your ceiling from three concurrent sessions to eight, because it removes you from the polling loop.

> [!warning] This corner of the ecosystem moves weekly
> The tools above were surveyed in August 2026 and several are months old. Treat the table as a map of the *shapes* on offer — tmux-compatible, agent-aware, worktree-first, SDK-drivable — rather than a standing recommendation. Start with plain tabs; adopt one of these only when you can name the specific thing tabs stopped doing for you.

## Related

- Tool: [[tools/claude-code|Claude Code]]
- Tool: [[tools/claude-desktop|Claude Desktop]]
- Prerequisite comfort: [[guides/terminal-setup-ghostty-oh-my-posh/index|Getting Unafraid and Setting Up Your Terminal]]
- Adjacent: [[tools/cursor|Cursor]] and [[tools/windsurf|Windsurf]] — IDE-embodied agents, a third body type for people who live in editors
