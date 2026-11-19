---
title: "One Home Connector for Your Whole Team"
lede: "Stop connecting every tool to every chat. Add one connector, and let it hold your team's skills, context, memory and tools."
kind: how-to
tools:
  - claude-code
  - openai-codex
  - cloudflare
  - twenty
  - outline
  - event-hog
  - lossless-at
  - context-vigilance
prerequisites:
  - "A Claude or ChatGPT plan that supports custom connectors"
  - "Claude Code or Codex, or a colleague who's comfortable with them"
  - "Somewhere to keep version-controlled files: GitHub or GitLab works; we recommend Cloudflare Artifacts (Workers Paid plan, $5 a month)"
estimated_minutes: 12
difficulty: intermediate
order: 4
status: Published
publish: true
date_created: 2026-11-18
date_modified: 2026-11-18
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Connectors
  - MCP
  - Agent-Skills
  - Agent-Memory
  - Cloudflare-Artifacts
---

## Skip the reading: paste this

You don't need to code this, or even read the rest of this page first. Open [[tools/claude-code|Claude Code]] or [[tools/openai-codex|Codex]] in an empty folder and paste:

```text
Build me a home connector: a remote MCP server (on Cloudflare Workers unless
I say otherwise) that my team adds once as a connector in Claude and ChatGPT.

Behind it:
- A version-controlled document store as the shared record: a git repo on
  Cloudflare Artifacts by default, or on GitHub or GitLab if I name one.
  Lay it out as:
  context-v/ (thesis, portfolio, people), context-v/agent-skills/ (our
  playbooks as SKILL.md files, served as MCP prompts), docs-v/, changelog-v/,
  and memory-v/ (notes agents add). Keep to these names; each -v folder has a
  README saying what goes in it. Every write is a commit under the person's
  name. Tools only add or append; nothing deletes without approval.
- Proxied tools: our CRM and wiki behind the same connector, each with its own
  stored credential that never reaches the chat.
- Sign-in per person, and a simple permission table: who can read or write each
  folder and each tool, and which actions need a human to approve.

Start with the repo and the read/write tools, deploy it, and walk me through
adding it in Claude. Then add one tool at a time.

For the full context, the reasoning behind each choice and the order to build
in, read https://fullstack-vc.com/guides/one-home-connector/
```

Then let it work, answer its questions, and test as it goes. The rest of this page explains what you just asked for, and why.

## The problem every team has right now

Watch how a team actually uses Claude or ChatGPT today:

- **Every tool is its own connector.** The CRM is one, the wiki another, email a third. Each person adds them separately, logs in separately, and ends up with a different set.
- **Every connector holds one account.** Connect Google Drive and you're connected to one Google Drive. The firm's drive, your personal drive and the fund's shared drive for a co-investor can't all sit behind it. The same goes for email, calendars and the CRM.
- **Connectors lack context.** A firm might keep deal data in a CRM, a spreadsheet and a wiki all at once. Nothing tells the model which one to read for which data, which one to create the work in, or the standards for doing the work the way your firm, and you, do it. So it guesses.
- **Every person keeps their own skills.** One partner has a great memo prompt; the associate has a different one; nobody has the same playbook.
- **Every AI app keeps its own memory.** Claude remembers some things, ChatGPT others, your personal agent a third pile. None of them can see the others', and you can't easily see any of it.

So nothing spans them. No agent can do the obvious job: *"Find this company in our CRM, pull our research note from the wiki, and draft the follow-up."* Each piece sits behind a different door.

## The proposition: one connector, and it manages everything else

A **home connector** is one connector your whole team adds, once. Behind it are four things:

| Behind the door | What it is |
|---|---|
| **Skills** | The firm's playbooks: how we write a memo, how we log a founder call, how we prep for IC. The same for everyone, served to every chat. |
| **Context** | The thesis, the portfolio, who's who, how the firm works, and which tool holds what: where to read deal data, where to create the memo, which account to use. Written once instead of re-explained in every chat. |
| **Memory** | What the team's agents learn, kept as plain files with full history. Nothing is lost, and any mistake can be undone. |
| **Tools** | The CRM, the wiki, project tracker, email and calendar, reached through the one door, with as many accounts as you need (the firm's drive and your own). Each has its own permissions: who can read, who can write, what needs a person to approve. |

The connector does the managing. Logins to the other tools live inside it and never reach the chat. Permissions are set once, for everyone. When the firm improves a skill, everyone gets the better version the next time they ask.

## This isn't a someday idea

We run this today. We're [The Lossless Group](https://lossless.group), and [Michael Staton](https://mpstaton.com) builds and runs these connectors for the firms we work with.

- **Three firms, one connector each.** Palmer AI, The Water Foundation and Lossless each add a single connector in Claude. Behind it are the firm's self-hosted, open-source tools ([[tools/twenty|Twenty]] for CRM, [[tools/outline|Outline]] for the wiki, Plane for projects) and shared skills. From that one connector, Claude makes tool calls into all of them.
- **A team's shared files.** [[tools/event-hog|event-hog]] gives a team working a conference one shared workspace. In October, three people ran an event from Claude: every contact, note and slide they logged became a saved change under their own name, and the whole team saw it.

What we're adding next is the team's context and memory as shared files behind the same connector, which is the part that has just become easy.

:::tool-showcase
- [[tools/lossless-at|lossless.at]]
- [[tools/event-hog|event-hog]]
- [[tools/context-vigilance|Context Vigilance]]
:::

## Give it direct API access, not just connectors

Most services your firm uses have an **API**: a documented way for software to read and write their data. Most non-developers have never needed to look up the API docs or use the API, and for good reason: it's complicated. But for your AI, it's as easy as riding a bicycle.

A **connector** (an MCP server the vendor publishes) is usually a limited subset of what the API can do: the handful of actions most people use most often, picked by whoever built it. That's why connectors can feel limited. With direct API access, the possibilities expand dramatically.

Give the model the **API documentation** and **authorized access** (a key that lives in the connector, never pasted into the chat), and it can do anything the API allows: bulk-update records, build custom views, move data between tools, answer questions no connector anticipated. Models read API docs fluently and write the calls themselves.

Good places to start:

- [[tools/twenty|Twenty]], the open-source CRM, has a full REST and GraphQL API.
- [[tools/affinity|Affinity]], the relationship CRM many funds use, has an API for lists, organizations, people and notes.
- [[tools/linear|Linear]] has a GraphQL API for projects and issues.

Start with a **read-only key**, so the model can look but not change anything. Add write access once you trust what it does, and require approval for anything that deletes or sends.

This is where a home connector earns its keep: the API keys and docs for every tool live behind the one door, and each person gets the access their permissions allow.

## What it needs: a version-controlled document store

Skills, context and memory only work as shared files with full history: who changed what, when, and the ability to undo it. That means a **version-controlled document store**, which in practice means git. Any git host will do:

| Option | Good for |
|---|---|
| **Cloudflare Artifacts** | Our recommendation. Easy, cheap and invisible to the team (see below). |
| **GitHub** | Teams that already use it; private repos are free, and developers can work in the same files. |
| **GitLab** | Teams on GitLab already, or that want to self-host it. |
| **Bitbucket, Azure Repos** | Firms whose IT already standardized on Atlassian or Microsoft. |
| **Gitea or Forgejo** | A small git server you run yourself, if the files must stay on your own machines. |

The connector talks to whichever you pick. Your team never needs to know which it is.

## Why now: Cloudflare Artifacts makes it easy, cheap and invisible

The catch with GitHub or GitLab has always been that they're developer tools: accounts, logins and a website business users never open and shouldn't have to. [[tools/cloudflare|Cloudflare]] Artifacts, in open beta since October 1, 2026, is git hosting built for agents instead:

- **Easy.** No accounts for your team. Each repository lives behind its own address with its own access tokens, and the connector holds them.
- **Cheap.** It comes with Cloudflare's $5-a-month Workers Paid plan.
- **Invisible.** Claude or ChatGPT reads and writes the team's files through the connector, every change is recorded under the person who made it, and nobody ever sees a repository.
- **Best with Workers.** Run the connector itself on Cloudflare Workers and the server and the files sit side by side on one account, with no other hosting to manage.

You can still mirror the repository to GitHub if your developers want to work in it.

## Use our folder names

You don't have to, but we recommend it, and it's how we work. Inside the home repository:

| Folder | Holds |
|---|---|
| `context-v/` | The thesis, portfolio, people, specs and plans |
| `context-v/agent-skills/` | The shared skills, one folder each with a `SKILL.md` |
| `docs-v/` | Documentation for people and agents |
| `changelog-v/` | Dated notes on what changed and why |
| `memory-v/` | What the agents learn and save |

**Why the odd names?** Words like "context", "docs" and "memory" appear in millions of repositories, each organized a different way. A model that finds a plain `memory/` folder can guess any of a hundred layouts. The `-v` suffix is ours. It marks the folder as following a specific convention, and it tells the model there's a pattern here to find and keep to. Put a short README in each `-v` folder saying what goes in it, and even a model that has never seen the convention learns it from the repository.

## Build it in this order

1. **The files first.** Get the repository and the read and write tools working, and add the connector in Claude. Ask it to save a note, then ask a fresh chat to find it.
2. **Then your skills.** Move the firm's best prompts into `context-v/agent-skills/`. Try one from a teammate's chat.
3. **Then context.** Write the thesis and the portfolio list once, in `context-v/`.
4. **Then tools, one at a time.** Start with the one your team uses most, usually the CRM. Give it read access first; add writing once you trust it.
5. **Then people.** Add teammates, set who can write where, and decide which actions need someone to approve them.

## The rules that keep it safe

- **The files are the record.** If the CRM and the files disagree, the files win, and you can see why from their history.
- **Tools only add.** Agents append and commit; nothing deletes without a person approving it.
- **Logins stay in the connector.** No password or API key is ever pasted into a chat.
- **Every change has a name on it.** Each write is saved under the person whose chat made it, so you always know who changed what.
