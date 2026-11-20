---
title: "The VC Agent Skill Pack"
lede: "Thirty-six open skills that teach Claude or Codex how a fund does the work, from sizing a market to the memo, the deck and the CRM."
kind: how-to
tools:
  - claude-code
  - openai-codex
  - context-vigilance
prerequisites:
  - "Claude (any paid plan) with Skills turned on, or Claude Code or Codex"
estimated_minutes: 8
difficulty: beginner
order: 5
status: Published
publish: true
date_created: 2026-11-19
date_modified: 2026-11-19
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Agent-Skills
  - Diligence
  - Investment-Memos
  - CRM
  - Events
---

## Skip the reading: paste this

Open [[tools/claude-code|Claude Code]] or [[tools/openai-codex|Codex]] and paste:

```text
Clone https://github.com/lossless-group/lossless-agent-skills to ~/code, then
symlink these skills into my skills folder (~/.claude/skills for Claude Code),
one link per skill folder, never the whole repository as one folder:
market-capture-analysis, timeline-scenario-analysis, competitive-analysis,
crawl-fetch-ingest, event-prep, augment-speakers-panelists,
create-contact-list-from-image-or-spreadsheet, expense-report-generation.
Add decile-hub-connector or hubspot-interface if I use that CRM; ask me.
Then tell me what each one is for, in a sentence.

For the full list and what each skill does, read
https://fullstack-vc.com/guides/vc-agent-skill-pack/
```

In the Claude app, every card below has a **Copy the prompt** button: paste it into any chat and Claude reads that skill and follows it.

## What a skill is

A **skill** is a folder with a `SKILL.md` file: plain-language instructions for one kind of work, written once and reused in every chat. It says when it applies, what to do in what order, and the mistakes to avoid. Claude and Codex load a skill only when the work calls for it, so you can install dozens without crowding the chat.

A prompt you keep in a note is yours. A skill is the firm's: written once, improved by whoever finds the gap, and the same for everyone. That's what makes it the first thing to put behind a [home connector](/guides/one-home-connector/).

These are the skills we use at The Lossless Group with the funds we work with. They're open source, in [lossless-agent-skills](https://github.com/lossless-group/lossless-agent-skills). Ones marked **Draft** work, but haven't been run enough times to call settled.

## Three products that roll skills up

Some skills only make sense together, so they come packaged in a product. **MemoPop** rolls up the research and memo skills: sizing, timing, competitors, sources, citations and edits. **DidiDecks** rolls up the deck skills: remaking a deck, iterating slide by slide, and filling in team and portfolio slides. **event-hog** rolls up the event skills: the attendee list, who to meet, slides from the talks, and the follow-ups. A card marked *Part of* one of them works on its own, and works best inside its product.

### MemoPop: research and memos

The three questions every memo answers come first: how big can it get, how fast, and against whom. Run them in that order: :skill[timeline-scenario-analysis] stress-tests the grid that :skill[market-capture-analysis] produces.

:::skill-pack{suite="memopop-ai"}
- market-capture-analysis
- timeline-scenario-analysis
- competitive-analysis
:::

### DidiDecks: decks

:::skill-pack{suite="dididecks-ai"}
:::

### event-hog: events

Before, during and after a conference: who's there, who to find, what was said on stage, and who to follow up with. Everything lands in the team's shared event workspace.

:::skill-pack{suite="event-hog"}
- event-prep
- conference-attendee-export
- prioritize-attendees
- augment-speakers-panelists
:::

## CRM and contacts

Pick the one for your CRM. Each tells the agent how that system actually behaves, including the parts its own connector leaves out.

:::skill-pack
- decile-hub-connector
- hubspot-interface
- create-contact-list-from-image-or-spreadsheet
:::

## Brand and site

For the fund's own site and look. These go with the habit of letting models work in HTML instead of PowerPoint, from [the agent-native VC recipe](/guides/agent-native-vc-2027/).

:::skill-pack
- write-site-narrative
- build-a-moodboard
- maintain-design-md
- shares-down-to-the-edge
:::

## Back office

:::skill-pack
- expense-report-generation
:::

## Team context

How the team's context and files are kept, so a skill written by one partner reaches everyone.

:::skill-pack
- context-vigilance
- cloudflare-artifacts-interface
:::

## Three ways to use them

1. **Paste the prompt.** Copy it from a card into any Claude or ChatGPT chat with web access. Nothing to install; good for trying one out.
2. **Upload to the Claude app.** Zip the skill's folder (download the repository, or ask Claude Code to zip it for you), then in Claude go to **Customize → Skills → Upload a skill**. It's then available in every chat.
3. **Put it in Claude Code or Codex.** One folder per skill in `~/.claude/skills/` (Claude Code) or your Codex skills folder. The prompt at the top of this page does it for you.

## Skills don't show up on their own

This is true of any skill pack, not just this one. Downloading a pack, or cloning its repository somewhere on your machine, doesn't make your agent aware of it. An agent looks in one place, its own skills folder, and only finds a skill that has **its own folder (or a link to one) directly inside it**. A pack sitting in `~/Downloads`, or one level too deep at `~/.claude/skills/vc-skill-pack/market-capture-analysis/`, is invisible. It doesn't error; the agent just never uses it.

Two ways to fix that:

- **Link each skill into the agent's own folder.** Keep the pack wherever you like, and add a symbolic link (a pointer to the folder) for each skill. Updates to the pack then reach the agent without copying anything. You don't have to type the commands; ask Claude Code: *"Symlink every skill in this folder into ~/.claude/skills, one link per skill folder."* Do it again whenever the pack gains a skill, and start a new session afterwards: agents read their skills folder when a session starts.

  If you know symlinks, it's one `ln -s` per skill:

  ```bash
  ln -s ~/code/lossless-agent-skills/market-capture-analysis ~/.claude/skills/market-capture-analysis
  ```

  Or let [GNU Stow](https://www.gnu.org/software/stow/) (`brew install stow` or `apt install stow`) link the whole pack in one command, and relink it after every pull:

  ```bash
  stow    -d ~/code -t ~/.claude/skills lossless-agent-skills   # link every skill
  stow -R -d ~/code -t ~/.claude/skills lossless-agent-skills   # relink after a pull
  stow -D -d ~/code -t ~/.claude/skills lossless-agent-skills   # unlink
  ```

  Stow links every top-level folder of the pack. Our repository ships a `.stow-local-ignore` that keeps its docs and scripts out of your skills folder; for another pack, add one listing anything that isn't a skill. The same commands work for any agent: point `-t` at its skills folder instead (`~/.agents/skills` is read by several Agent Skills tools).
- **Host the skills somewhere every agent can reach.** Put them in a shared Google Drive folder the agent can read, or, better, behind your [home connector](/guides/one-home-connector/), which serves the firm's skills to every chat for everyone on the team. Nothing to install on each laptop, and nothing for anyone to keep in sync.

## Make one of your own

The fastest way to write a skill is to ask for one at the end of a job that went well: *"Write what we just did as a skill: when to use it, the steps, and the mistakes we hit."* Save it as `<name>/SKILL.md`, try it on the next job, and fix what it got wrong. If it's useful to other funds, send it to us and we'll add it to the pack.
