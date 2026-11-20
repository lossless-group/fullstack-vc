---
title: "How to Use Claude & GPT like an Agent-Native VC Going into 2027"
lede: "Eight habits that separate VCs getting real work out of Claude and ChatGPT from those still chatting with them."
kind: how-to
tools:
  - claude-code
  - openai-codex
  - context-vigilance
estimated_minutes: 8
difficulty: intermediate
order: 3
status: Published
publish: true
date_created: 2026-11-18
date_modified: 2026-11-18
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Agentic-AI
  - Venture-Capital
  - Claude-Code
  - Codex
  - Specs-and-Plans
---

Claude and ChatGPT changed more in the last six months than in the two years before. Agents now work for hours, make documents and decks, and run in the background after you close the laptop. (Every release is on **[the timeline](/claude-gpt-release-timeline)**, side by side and sourced.)

Most VCs still use them as a chat box: type a question, read the answer, copy it somewhere else. That leaves most of the value on the table. These are the eight habits we'd start with.

## 1. Bite the bullet: use Claude Code and Codex

The chat window is the weakest way to use these models. [[tools/claude-code|Claude Code]] and [[tools/openai-codex|Codex]] were built for developers, but they're really **agents that work on files**, and that makes them better for most fund work too.

**Why it matters:**

- **They work on your files directly.** They read a whole folder (a data room export, last quarter's portfolio updates, your memo archive), write new files, and edit existing ones in place. No uploading, no copy-paste, no "here's the text, now paste it into Word."
- **They come with a harness.** The model is the same one you chat with; what's around it is what makes it powerful:
  - **Project instructions** (`CLAUDE.md` or `AGENTS.md`) it reads at the start of every session: your firm, your thesis, your standards.
  - **Skills:** saved playbooks it loads when the task calls for one, like "how we write an IC memo".
  - **Connectors** to your CRM, drive, email and calendar.
  - **Subagents and parallel sessions** that split a big job into pieces and work them at once.
  - **Plan mode,** which shows you its plan before it touches anything.
  - **Permissions and approvals,** so it asks before sending, deleting or spending.
  - **Checkpoints,** so you can rewind a session when it goes the wrong way.
  - **Scheduled and background work** that runs while you're in meetings.
  - **Git,** so every change is saved and reversible.
  - And many more: hooks, slash commands, worktrees, browser control, computer use.
- **No terminal required anymore.** Claude Code is the Code tab in the Claude desktop app; Codex is a view in the ChatGPT desktop app, on every plan including Free (since July 9). You pick a folder and talk.

**Start here:** make a folder for one deal, drop in everything you have, and ask Claude Code or Codex for a first-pass diligence summary. Watch what it does with a folder instead of a paste.

## 2. Write specs, plans and briefs, not prompts

The models can now do complex, multi-hour work: Codex's goal mode works toward an objective for hours or days, Claude Code can run hundreds of subagents on one job, and ChatGPT Work and Claude's Cowork keep going after you close the laptop. A one-line prompt wastes that. It's like handing an associate a sticky note and expecting a finished IC memo.

**Write it down first, then drop it in.** A good brief is a short document that says:

- **The goal:** what done looks like, and who it's for (the IC, an LP, a founder).
- **The inputs:** which files, folders and sources to use, and which to ignore.
- **The standards:** your firm's memo structure, how you cite, what you never say to an LP.
- **The steps:** the order of work, and where to stop and check with you.

Save it as a file in the deal folder, then say: *"Read `brief.md` and do it."* The model works from the brief, you review the result against it, and next time you reuse the brief instead of re-explaining.

This is the habit behind [[tools/context-vigilance|Context Vigilance]]: specs, plans, prompts and reminders kept as versioned files in a `context-v/` folder, so people and agents work from the same written context. Keep your best briefs, and they become your firm's playbooks.

## 3. Put routine work on a schedule

A fund runs on recurring chores: triaging the pipeline, nudging founders for updates, rounding up portfolio materials before a board meeting or LP report, sorting the week's event invites. Both companies now let an agent do these on a schedule, in the cloud, while you're doing something else.

| | ChatGPT | Claude |
|---|---|---|
| **The routine agent** | **Workspace agents** (generally available since May 21): describe the workflow once and ChatGPT builds the agent; share it with the team, run it on a schedule or from Slack | **Cowork**, now part of every Claude conversation (since Sep 16): hand it a task and set it to repeat; scheduled tasks run in the cloud with no device online (since Jul 7) |
| **Always on** | [Dots](/tools/dots) (since Sep 29): agents with their own computer that act on new information without being asked | [Claude Duet](/tools/claude-duet) (since Oct 21, US research preview): a morning brief, eyes on your inbox and calendar, and background work, with approval before anything goes out |
| **Simple reminders** | **Scheduled tasks** (since Jun 17) | Recurring tasks in Cowork |

**Routines worth handing over first:**

- **Pipeline triage:** every morning, score new inbound decks against your thesis and post a short list.
- **Founder status emails:** draft monthly check-ins to each portfolio founder, with what you last heard from them.
- **Portfolio roundup:** before a board meeting or LP report, collect every company's latest update, metrics and news into one document.
- **Event triage:** each week, sort conference and dinner invites into yes, maybe and no, against the people and themes you care about.

Write each one as a brief first (habit 2), then put it on a schedule. And keep a person in the loop for anything that leaves the building: have the agent **draft** founder emails for you to send, and require approval before it sends, deletes or edits anything shared.

## 4. Ditch the legacy formats: let models use HTML, CSS and JavaScript

**You don't need to know any of these.** HTML, CSS and JavaScript are just a file format, like `.pptx` or `.docx`, but one every agent fully understands and works with easily. You describe what you want; the model writes the files.

PowerPoint, Word and Excel files are hard for agents to work with: binary, proprietary, and built for a person clicking. HTML, CSS and JavaScript are plain text, which models read and write fluently, and they make better work product:

- **Designs, pages, decks, dashboards, one-pagers, memos, data rooms:** all of it can be a web page.
- **Shared by link,** opened on any device, no attachment. Claude's shared artifacts open without an account (since August 19).
- **Live:** a portfolio dashboard can pull current numbers instead of going stale in an attachment.
- **Your brand as code,** applied the same way every time, instead of a template someone breaks. Write it down once in a `DESIGN.md` file, following the [open DESIGN.md specification](https://github.com/google-labs-code/design.md) from Google's Stitch team: your colors, fonts, spacing and components in a format any agent reads. Drop it in the folder, and every deck, page and dashboard comes out on brand.
- **Versioned:** every change saved, and nothing lost to "final_v7_REAL.pptx".

The tools are there: Claude makes designs, decks, docs, sheets and dashboards in any chat (Claude Design, Slides, Docs and Data), and ChatGPT and Codex publish web pages and apps with Sites. When an LP needs a PDF or a `.pptx`, export one at the end. Don't start there.

**Start with artifacts.** You don't have to set anything up to work this way. Both apps now make web-native work product right in the chat (Claude calls them artifacts):

| The job | Claude | ChatGPT |
|---|---|---|
| A deck or pitch | **Claude Design** or **Claude Slides** | **ChatGPT Slides** (in Space, on Pro, Business and Enterprise) |
| A video presentation or explainer | **Claude Motion**: animated, editable, exports MP4 (Team and Enterprise beta) | No direct equivalent yet |
| A custom CRM or portfolio view | **Claude Data** (launched as Dashboards): live views on your CRM or warehouse, with certified metrics | **ChatGPT Sites**: a small web app or live dashboard on its own URL |
| A memo or shared doc | **Claude Docs** | **Pages** in ChatGPT Space |
| A model or tracker | **Claude Sheets** (beta) | ChatGPT inside Excel |
| A brainstorm | **Claude Whiteboards** (beta) | No direct equivalent yet |

**Sharing is built in.** A Claude artifact starts private; one Share menu lets you share it with your team, with view, comment or edit access, or with anyone who has the link, no Claude account needed (on Team and Enterprise, an owner has to allow sharing outside the org). ChatGPT's Sites get their own URL, and Space lets a team co-edit Pages and Slides.

**This session's deck is the example:** it's a web page, built with Claude Code.

## 5. Experiment with enterprise context

Every chat starts from zero unless something gives the model your firm's context: the thesis, the portfolio, past memos, who said what in last month's partner meeting. A wave of tools now does exactly that, and it's worth trying a few on a corner of your work.

**Memory and context startups.** They sit between your agents and your knowledge, decide what's worth remembering, and feed the right context back in:

- [[tools/glen|Glen]] records your and your team's agent sessions and feeds the right context back into Claude Code, Codex or Cursor.
- [Supermemory](https://supermemory.ai), [Mem0](https://mem0.ai), [Zep](https://www.getzep.com), [Letta](https://www.letta.com) and [Cognee](https://www.cognee.ai) give agents long-term memory across sessions and apps.

**Enterprise search.** [Glean](https://www.glean.com), and open-source [Onyx](https://onyx.app), which we self-host for a client, index the firm's drives, email and wikis so an agent can search all of it at once.

**Vector databases,** the storage most of these are built on, which you can also use directly: [Chroma](https://www.trychroma.com) (we run it locally over our own docs and past agent sessions), [Pinecone](https://www.pinecone.io), [Weaviate](https://weaviate.io), [Qdrant](https://qdrant.tech) and [pgvector](https://github.com/pgvector/pgvector) for Postgres.

**Open-source tools that make sense of what you have.** These run inside Claude Code or Codex:

- [Graphify](https://github.com/Graphify-Labs/graphify) turns a folder of code, docs, papers or transcripts into a knowledge graph you can query.
- [Archify](https://github.com/tt-a1i/archify) turns an idea, plan or codebase into an interactive diagram.
- [GraphRAG](https://github.com/microsoft/graphrag) from Microsoft, and [LightRAG](https://github.com/HKUDS/LightRAG), answer questions across a whole document set by building a graph of it first.

None of these is the answer yet, and several will merge or disappear. Pick one problem, like "what have we said about this company before?", and try two tools against it.

## 6. Give your AI direct access: APIs and your browser

Most services your firm uses have an **API**: a documented way for software to read and write their data. Most non-developers have never needed to look up the API docs or use the API, and for good reason: it's complicated. But for your AI, it's as easy as riding a bicycle.

A **connector** (an MCP server the vendor publishes) is usually a limited subset of what the API can do: the handful of actions most people use most often, picked by whoever built it. That's why connectors can feel limited. With direct API access, the possibilities expand dramatically.

Give the model the **API documentation** and **authorized access** (a key that lives in the connector, never pasted into the chat), and it can do anything the API allows: bulk-update records, build custom views, move data between tools, answer questions no connector anticipated. Models read API docs fluently and write the calls themselves.

Good places to start:

- [[tools/twenty|Twenty]], the open-source CRM, has a full REST and GraphQL API.
- [[tools/affinity|Affinity]], the relationship CRM many funds use, has an API for lists, organizations, people and notes.
- [[tools/linear|Linear]] has a GraphQL API for projects and issues.

Start with a **read-only key**, so the model can look but not change anything. Add write access once you trust what it does, and require approval for anything that deletes or sends.

**And give it your browser.** Plenty of what a fund uses has no API at all: the data room, the fund admin portal, LinkedIn, a founder's investor-update page. For those, let the model use the browser the way you do. **Claude in Chrome** (generally available on all paid plans since Aug 26) is an extension that reads pages, clicks, fills in forms and navigates sites in your own logged-in Chrome, with a safety check on each action; Claude Code can drive it too. ChatGPT Work has a built-in browser in its desktop app.

**What that unlocks for a fund:** if you can log in to it, the model can use it.

- **Sourcing lists:** run a LinkedIn search (say, senior engineers who left a portfolio competitor this year) and turn the results into a sheet. Keep it modest and on your own account: LinkedIn's terms bar automated scraping, and heavy use can get an account restricted.
- **Portfolio updates:** log in to each company's investor-update page or portal, export the latest update and metrics, and drop them in one folder before the board meeting or LP report.
- **Fund admin and cap tables:** pull the latest capital account statements or cap tables from your fund administrator's or Carta's portal.
- **Data rooms:** walk a founder's data room, download what's there, and summarize it against your diligence checklist.
- **Forms:** fill in LP due-diligence questionnaires, conference registrations and expense reports from what's already in your files.
- **Research behind a login:** company profiles in the databases you already pay for, competitor pricing pages, regulatory filings.

Between the API and the browser, there's very little a model can't reach. Watch what it does the first few times, and keep approvals on for anything it submits or sends.

A home connector (habit 8) is the natural place to keep those keys and docs, so the whole team gets the access without anyone handling a key.

## 7. Automate your personal life, minimize drag

The hours a VC loses aren't all at work: travel, scheduling, the kids' activities, school emails, renewals, receipts. A new class of **personal agents** reads your email and calendar, acts on websites, and reminds you of things before you ask. Every errand one takes off your plate is attention back for founders.

Fellows in the Dojo have been testing them on their real lives for weeks:

:::tool-showcase
- [[tools/instinct|Instinct]]
- [[tools/town|Town]]
- [[tools/grok-bot|Grok Bot]]
- [[tools/dots|Dots]]
- [[tools/claude-duet|Claude Duet]]
- [[tools/muse|Muse]]
- [[tools/openclaw|OpenClaw]]
- [[tools/hermes-agent|Hermes Agent]]
:::

Both big labs now ship their own: ChatGPT's [[tools/dots|Dots]] (since Sep 29) and [[tools/claude-duet|Claude Duet]] (since Oct 21, a US research preview by waitlist). Each is an agent with its own computer that keeps working on your goals between conversations and checks with you before it sends, pays or signs. Start with one errand you dread every week, give the agent only the accounts that errand needs, and widen from there.

**[Takeaways from Using Personal Agents →](/guides/personal-agents-in-the-dojo/)**: what fellows actually use them for, what worked, and how to choose one.

## 8. Create your firm's home connector

Today every tool is its own connector, every person keeps their own skills, and every app keeps its own memory. A **home connector** is one connector your whole team adds, once. Behind it sit the firm's shared skills, context, memory and tools, each with permissions, kept as files with full history. We run one for three firms today, and you can ask Claude Code or Codex to build yours.

**[One Home Connector for Your Whole Team →](/guides/one-home-connector/)**: the full recipe, with a prompt you can paste.

