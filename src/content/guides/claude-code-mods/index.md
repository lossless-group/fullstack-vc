---
title: "Mods: Make Claude Code Work the Way Your Fund Does"
lede: "A mod changes how Claude Code itself looks and behaves: a pane beside the chat, a check before Claude sends anything, a command of your own."
kind: how-to
tools:
  - claude-code
  - claude-desktop
prerequisites:
  - "Claude Code v2.1.287 or later in a terminal, or the Code tab of the Claude Desktop app (v2.1.286 or later)"
estimated_minutes: 10
difficulty: intermediate
order: 6
status: Published
publish: true
date_created: 2026-11-19
date_modified: 2026-11-19
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Claude-Code
  - Mods
  - Plugins
  - Guardrails
---

## Skip the reading: paste this

You don't write a mod; you describe one. Open [[tools/claude-code|Claude Code]], in a terminal or the **Code** tab of [[tools/claude-desktop|Claude Desktop]], and paste:

```text
Make me a mod. Before any tool call that sends an email or writes to our
CRM, hold it, show me what it will send or change in a pane beside the
chat, and give me Proceed and Cancel buttons. Read calls go through untouched.

For background on mods and how we use them, read
https://fullstack-vc.com/guides/claude-code-mods/
```

Claude asks once: **Turn on the mods Claude writes in this session?** Choose **Turn them on**. The mod loads when Claude's turn ends, and every later change reloads it the same way, so you can say "make the pane narrower" and see it a moment later.

## Can Claude Desktop take mods?

Yes, in its **Code** tab. Mods are a Claude Code feature, and the Desktop app's Code tab runs its own copy of Claude Code. The chat and Cowork tabs don't run mods: they aren't on [the list of places mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run).

| Where you use Claude | Does a mod run? | Does what it draws show? |
|---|---|---|
| Claude Code in a terminal (any editor's terminal, JetBrains) | Yes | Yes |
| The Code tab of Claude Desktop | Yes | Yes, apart from a few terminal-only elements |
| A WSL session in Claude Desktop (Windows) | No | No |
| The VS Code extension | Yes | Yes, from extension v2.1.299 |
| Claude Code on your machine, driven from claude.ai or the phone (Remote Control) | Yes | In the terminal on your machine |
| A Claude Code cloud session, `claude -p`, the Agent SDK | Yes | No: nothing draws, so a mod there is rules, not panes |

Check your version: in a terminal, `claude --version`; in the Desktop app, type `/status` in a local Code session and read the **Claude Code** row. Mods arrived on [October 1](/timelines/claude-and-chatgpt) and are on by default.

## What a mod is

A **mod** is a small program, in JavaScript or TypeScript, that runs inside Claude Code. Claude Code calls it whenever something happens (Claude is about to use a tool, you submit a prompt, part of the screen is drawn), and the mod can watch it, change it, or answer it itself.

That's the difference from everything else you can add to Claude:

| | Mod | Skill | Connector (MCP server) | Settings hook |
|---|---|---|---|---|
| What it is | Code that runs inside Claude Code | Instructions Claude reads | A service that gives Claude tools | A script Claude Code runs on an event |
| What it changes | What Claude Code does and shows | What Claude knows and how it works | What Claude can reach | Whether an action goes ahead |
| Can it draw on screen | **Yes**: panes, bands, buttons | No | No | No |
| Pick it when | You want something on screen, a command of your own, or a check on what Claude does | You keep pasting the same instructions | Claude needs to reach a system | You already have the script |

A plugin can hold all four, so one install can give a team a skill, a connector and the mod that goes with them. Skills teach Claude how your fund works ([the skill pack](/guides/vc-agent-skill-pack/)); a mod changes the room Claude works in.

## Why a fund would want one

Everything below is something a mod can do; the specifics are ideas to adapt, not products to install.

- **A check before anything leaves the building.** Hold every tool call that sends an email, posts to Slack or writes to the CRM, show exactly what it will send, and wait for **Proceed**. Anthropic's sample [`blast-radius`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/blast-radius) does this for risky shell commands; the same pattern covers a partner's inbox.
- **A pane beside the chat.** The deal you're working on, this week's pipeline from [[tools/twenty|Twenty]] or [[tools/affinity|Affinity]], the open items from the last partner meeting: kept on screen and updated while Claude works.
- **A command that runs at once.** `/log-call` or `/pipeline` runs your code immediately, with no Claude turn and no waiting, even while Claude is busy with something else.
- **A band above the prompt.** A reminder of which fund, deal or data room this session is for, or Anthropic's sample [`token-weather`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather), a forecast of how full Claude's working memory is.
- **The same rules for everyone.** A firm's administrators can install their own mods for the whole team and stop people's personal ones from loading, through Claude Code's managed settings.

## How to make one

1. **Describe it** in a Claude Code session, as in the prompt above. Claude writes the mod with its built-in mod-writing skill. Be specific about what you see and when: "a pane on the right", "only for calls that write".
2. **Turn it on** when Claude asks. It loads when the turn ends.
3. **Change it by asking.** Each change reloads the mod when Claude's turn ends.
4. **Keep it.** A mod Claude writes in a session lives in that session's mods folder. Ask Claude to copy it to a folder you keep, and to make it a plugin you can install.

Under the hood a mod is three files: a manifest (`.claude-plugin/plugin.json`), a pointer to the code (`hooks/hooks.json`), and the code (`hooks/register.ts`). You never need to open them, but anyone technical on the team can read the whole thing in a few minutes.

## Share it with the team

A mod installs like any plugin, from a **marketplace**: a GitHub repository with a small `marketplace.json` file listing it. Ask Claude to set one up; it checks the folder for keys and tokens before anything is pushed. Then each person installs it:

- **In a terminal:** `/plugin install <mod>@<marketplace>`, or `claude plugin install <mod>@<marketplace>` from the shell.
- **In Claude Desktop's Code tab**, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace**, and **Add plugin**.

A private repository works too, for teammates who can read it on GitHub and have GitHub set up on their computer.

## Trust it like software, because it is

A mod runs **with your permissions**. Once loaded it can read and write your files, read your keys and settings, see every prompt and tool call, start programs, call the internet and spend your Claude usage. Mods aren't sandboxed ([Anthropic's own warning](https://code.claude.com/docs/en/plugins/mods/overview#decide-whether-to-trust-a-mod)).

- **Install only from people you trust.** For a mod from anyone else, have a technical colleague run `claude plugin validate <its folder>` first: it lists every event the mod watches and everything it asks Claude Code to do, without running it.
- **Turn them off when you need to.** Disable one mod in `/plugin`; start a session with `--safe-mode` to skip them all; or set `"disableAllHooks": true` in your settings to stop every mod you installed.
- **Know what they can't do.** A mod can restyle most of Claude Code, but not the permission prompt: it can't change what Claude asks you to approve.

To see what's possible before building, try Anthropic's [sample mods](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods), read the [source of the mods built into Claude Code](https://github.com/anthropics/claude-code/tree/main/mods) (`/diff` is one), or browse the community's [awesome-claude-code-mods](https://github.com/karanb192/awesome-claude-code-mods).

