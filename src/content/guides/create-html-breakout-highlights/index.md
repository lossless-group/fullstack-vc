---
title: "Skill Download: Capture Breakout Highlights into a Branded Page"
lede: "A downloadable Claude Code agent-skill that turns you into your breakout group's note-taker's note-taker: jot fragments while you talk, let Claude track who said what, then get a theme-clustered markdown summary and a shareable FullStack-branded HTML page — with every mentioned company and tool auto-linked."
kind: how-to
tools:
  - claude-code
prerequisites:
  - "Claude Code installed and logged in (see the terminal guide if you're not there yet)"
  - "Two minutes to install the skill before your session starts"
estimated_minutes: 5
difficulty: beginner
video: ""
order: 25
status: Draft
publish: true
date_created: 2026-07-29
date_modified: 2026-07-29
authors:
  - Michael Staton
augmented_with: "Claude Code on Fable 5"
tags:
  - Agent-Skills
  - Claude-Code
  - Breakouts
  - Note-Taking
  - Downloads
---

> [!info] What an agent-skill is
> A skill is a folder of instructions that [[tools/claude-code|Claude Code]] loads when a matching task comes up — a packaged workflow you install once and invoke by name. This one packages the Dojo's breakout note-taking motion, including our DESIGN.md so the output page comes out on-brand.

## What it does

`create-html-breakout-highlights` runs in four phases:

1. **Roster** — asks once who's in your group (names + firms), then tracks aliases silently ("JS", "the Sequoia guy" → same person).
2. **Live capture** — you fire off fragments mid-discussion; Claude cleans each into one clear sentence, echoes it back numbered, and gently nudges `(who said that?)` when a note lacks a speaker — without ever blocking your flow. Start a fragment with `!` to star it, `TODO` to mark an action item. Company, tool, and media mentions get tracked silently as you go.
3. **Theme-clustered summary** — the discussion wound and interleaved; the summary doesn't. Claude sorts every note under 2–5 emergent themes named in your group's own vocabulary, merges near-duplicate points across speakers, **reconstructs the session dialog from your fragments** (clearly labeled as a reconstruction, never inventing content), and **resolves every mentioned company, service, and piece of media to its canonical link** via web search — plus LinkedIn profiles for the participants where confidently findable. You approve or edit before anything is written; then it lands as a markdown file.
4. **Branded HTML** — a single self-contained page styled from the bundled FullStack VC `DESIGN.md`: participants as chips linked to their LinkedIn profiles, theme summaries with highlight bullets, a themes-by-participant section (each person's through-line), starred moments and action items, the reconstructed session dialog, and the linked "Mentioned" ledger. Obsidian background, violet→cyan gradient headings, mono speaker labels — ready to share with your group or project on a screen.

## Install (once, ~2 minutes)

**[⬇ Download create-html-breakout-highlights.zip](/downloads/skills/create-html-breakout-highlights.zip)**

```bash
cd ~/Downloads
unzip create-html-breakout-highlights.zip -d ~/.claude/skills/
```

That's it. Skills load at session start, so open a **new** Claude Code session after installing. (You can also [browse the skill's source](/downloads/skills/create-html-breakout-highlights/SKILL.md) before installing — it's three files: the instructions, our DESIGN.md, and an HTML template.)

## Use it in a breakout

Start Claude Code in any folder where you'd like the notes to land, then:

```text
We're starting a breakout — use the create-html-breakout-highlights skill.
```

Claude asks who's in the group, and from there you just type fragments as the conversation moves:

```text
jess - compliance blocks anything storing docs offsite
! tom: the IC memo draft agent saved him 4 hrs last week
someone mentioned granola for meeting notes
TODO priya shares her n8n workflow
```

When the group wraps: *"okay, summarize."* Approve the proposed summary, and you walk out with `2026-07-29_group-3.md` and a branded `2026-07-29_group-3.html` — themes, speakers, starred moments, action items, and every mention linked.

## Why this shape

The hard part of breakout notes isn't typing — it's that discussions interleave (the group returns to a topic three times with other threads between) and attribution evaporates within the hour. The skill attacks exactly those two failure modes: relentless-but-polite speaker nudges during capture, and theme clustering at synthesis so the record reads coherently instead of chronologically. The linked-mentions ledger is the bonus: "what was that tool someone mentioned?" is answered permanently.

## Related

- Tool: [[tools/claude-code|Claude Code]]
- Not terminal-comfortable yet: [[guides/terminal-setup-ghostty-oh-my-posh/index|Getting Unafraid and Setting Up Your Terminal]]
- Orientation: [[guides/claude-desktop-vs-claude-code/index|Claude Desktop vs Claude Code]]
- The breakout format it was built for: [/breakouts/set-the-agenda](/breakouts/set-the-agenda)
