---
title: "Agents at Work"
lede: "What's new in Claude and ChatGPT for VCs, what fellows have learned from personal agents, and how to build a home connector of your own."
date_scheduled: 2026-11-19T09:00:00-08:00
date_posted: 2026-11-15
durationMinutes: 60
hosts:
  - Michael Staton
rsvpUrl: https://kf.events/4BX40HK
recordingUrl: https://kauffmanfellows.zoom.us/rec/share/lyn3Mml_azLdzfJbm2sldLcnLZhFv8EhR6unFZzJEyjF8zxarcZTRNH9fC6mPkHq.CKgNmEqTmqAinrk8
partnerMark:
  name: Kauffman Fellows
  light: /trademark__Kauffman-Fellows--Light-Mode.svg
  dark: /trademark__Kauffman-Fellows--Dark-Mode--Lightest.png
  vibrant: /trademark__Kauffman-Fellows--Vibrant.svg
  url: https://www.kauffmanfellows.org/
classifiers:
  - All-Hands
tags:
  - Agentic-AI
  - Venture-Capital
  - Claude
  - ChatGPT
  - Personal-Agents
  - Connectors
og_image: /og-default.png
---

🎬 **[Watch the recording on Zoom →](https://kauffmanfellows.zoom.us/rec/share/lyn3Mml_azLdzfJbm2sldLcnLZhFv8EhR6unFZzJEyjF8zxarcZTRNH9fC6mPkHq.CKgNmEqTmqAinrk8)** (hosted by Kauffman Fellows)

📊 **[Open the session deck →](/slides/2026-11-19_monthly-all-hands)**

## Summary

A small, talkative group. [Michael](/people/mpstaton/) ran through six months of Claude and ChatGPT releases in ten minutes, and the conversation went straight to personal agents and the question underneath them: how much of your life do you hand an agent? Some fellows are all in, with agents kept read-only; one had just been phished on the road and is rebuilding carefully; others keep firm and LP data well out of reach. From there: what AI does to M&A diligence, how to tell a deck nobody thought through, why the deliverable should be HTML and not PowerPoint, self-hosted tools with no seat fees, and the home connector. [Jules](/people/julesmiller/) closed on the big one: what is an agent, and how much should each one do? We meet again in December.

## Highlights

- **"Any CLI, in my agent."** [Toby](/people/tobyrush/) found he can install any command-line tool into Grok Bot's VM, including his Claude, Codex and Gemini accounts, and every bot he runs shares them. His other hack: he runs all his email accounts through Superhuman, and Superhuman has an MCP connector. No personal agent product connects to more than one Gmail account, but through Superhuman every one of his agents can triage and do support work across all of them.
- **Trust comes from tight limits, not blind faith.** Keep agents read-only (no sending email), opt into zero data retention everywhere, and think twice before handing your data to a company whose business is advertising. "The benefit is sufficiently high for the risk."
- **A phishing story.** While traveling, one fellow clicked a convincing Google sign-in link from their phone and approved the 2FA. Ninety minutes of fighting to keep control of the accounts, then days rotating credentials and wiping a laptop. Not an AI attack, but it easily could have been, and an agent with access to everything is one more door. Watch out for authenticator codes synced to the same Google account they protect.
- **Separate inbox, curated feed.** Rather than open years of unknown email to an agent, one fellow started a fresh inbox, forwards new mail there, and gives agents access only to that.
- **Microsoft may win on trust.** Toby is watching the new Copilot, whose autopilot wraps OpenClaw in a secure container with an Entra ID. Most firms will never run open-source OpenClaw themselves, but they already run Microsoft. [Anderson](/people/amthees/) lost two hours happily exploring his Fund I schedule of investments in Gemini, which also pulled answers from his email.
- **No LP data in an LLM.** [Patrick](/people/psagisi/)'s two-person firm uses AI for research only. [Ariel](/people/amuslera/) asked whether any LPA now covers LLM data sharing; [Punit](/people/punit24-lab/), with two funds raising, hasn't seen one.
- **Diligence as extraction.** [Patrick](/people/psagisi/) raised what happens when a large acquirer runs technical diligence on a portfolio company whose value *is* its agents and code: with AI, they can rebuild it and walk away. [Punit](/people/punit24-lab/): it's a staging and contract problem (reveal late, back it with breakup fees and a 3–5 year liability tail), and at the low end you have no leverage. [Michael](/people/mpstaton/) added that a "reverse engineer anything" skill rebuilt every major fantasy football app overnight, from the UI alone.
- **You can tell when nobody did the thinking.** One fellow has watched polished thematic decks, written overnight by Claude with a PitchBook plugin, presented by people who were effectively reading off a teleprompter. [Michael](/people/mpstaton/)'s guard: write the narrative in markdown first, agree on it, then generate slides. And the models default to private-equity thinking, not venture.
- **Work in HTML, not PowerPoint.** Let agents write HTML, SVG and markdown, their native formats, and ask for 3–5 variants instead of iterating on one: a couple are duds, a couple beat expectations. [Punit](/people/punit24-lab/) hasn't made a PowerPoint deck in a year.
- **Use the API, not just the connector.** Connectors are new and thin; most SaaS APIs are complete. Point Claude at the API docs and let it authenticate.
- **Self-host, and lose the seat fees.** [Ariel](/people/amuslera/) pointed to Kevin Rose's [SignuDoc](https://github.com/NYLLON-SOFTWARE/signudoc), an open-source DocuSign replacement he built [after being quoted $8,100 a year](https://x.com/kevinrose/status/2122394902168473975) for a 15-person team, and said small firms could replace a lot of monthly software the same way, if someone collected the options. That list exists: [Michael](/people/mpstaton/)'s **[lossless.at](https://lossless.at)**, 99 open-source tools for VC firms, each mapped to the paid product it replaces, such as [Papermark](/tools/papermark/) for data rooms and [Twenty](/tools/twenty/) for CRM. It's the most complete list of its kind we know of. The bigger win isn't cost: interns and advisors cost nothing to add, and with the database in reach Claude builds dashboards straight from it.
- **One home connector.** Event Hog, used at four conferences, runs entirely through one MCP: it logs everyone you meet, profiles speakers and suggests who to find, with every change committed under the person who made it. The same shape works as a firm's shared skills and tools, "an app marketplace for the firm," as [Ariel](/people/amuslera/) put it. Recipe: [One Home Connector for Your Whole Team](/guides/one-home-connector/).
- **WTF is an agent?** [Jules](/people/julesmiller/) is getting more ambitious, moving from single agents to multi-agent systems across everything she's working on, and that raises the broad scoping questions: what cluster of tasks can a single agent handle? Many narrowly scoped agents, or a few broadly scoped ones? Underneath them sits the real one: what even counts as an agent? [Michael](/people/mpstaton/)'s read is that the public conversation has shifted away from many small agents and toward giving more powerful models large scopes of work and large tasks, steered by full specs, briefs and plans rather than prompts. A model with a role and a set of skills will farm work out to sub-agents on its own. Jules wants to dig into this at a future session. In the meantime, the clearest worked example we have is MemoPop: its first version was a LangGraph orchestration of specialized agents, and the open-source code shows how the work was split up.

  ::link-card{url="https://lossless-group.github.io/memopop-ai/" site="MemoPop AI" title="MemoPop AI: a multi-agent investment memo orchestrator" description="Turn a company name into an institutional-quality investment memo, researched and fact-checked by 33 specialized AI agents." image="/images/tool-banners/banner__memopop-ai.jpg"}

  ::github-repo{repo="lossless-group/investment-memo-orchestrator"}

**From the session:** [lossless.at](https://lossless.at) · [How to Use Claude & GPT like an Agent-Native VC Going into 2027](/guides/agent-native-vc-2027/) · [The VC Agent Skill Pack](/guides/vc-agent-skill-pack/)

## An open question: can you stop an acquirer's agents from taking everything?

[Patrick](/people/psagisi/) raised it, from a conversation with a colleague: when a portfolio company's value *is* its agents, harness, code and industry know-how, a big acquirer's technical diligence can pull all of it out. Pre-AI, big companies sometimes walked away from a deal knowing everything the startup knew. With agents in the data room, rebuilding what you saw is far cheaper. So how do companies, investors, and their lawyers and bankers stop a buyer from extracting as much intelligence as possible, and then walking?

Nobody in the room had a full answer, and as far as we can find, nobody else does yet either.

**What the group said**
- **Stage what you show.** [Punit](/people/punit24-lab/): reveal the crown jewels only at the last stage, and back them with breakup fees and a liability tail (a 3–5 year look-back with defined penalties if anything leaks).
- **But protection depends on leverage.** [Punit](/people/punit24-lab/)'s sharper point: those protections are only as strong as the company's bargaining position. A hot company with several bidders can demand them. A small company facing a low-end exit or an acquihire, playing for its liquidation preferences, usually can't. That explains who gets protected, but it doesn't solve the problem: most acquisitions are at the low end, which is where the protection is weakest.
- **The UI is enough.** [Michael](/people/mpstaton/) noted that a "reverse engineer anything" skill rebuilt every major fantasy football app overnight from the UI alone, with no code access.

**What lawyers have started recommending** ([Pillsbury, Nov 2026](https://www.pillsburylaw.com/en/news-and-insights/ai-mergers-acquisitions-confidential-information.html); [Kohrman Jackson & Krantz, Mar 2026](https://www.jdsupra.com/legalnews/ai-and-m-a-ndas-managing-artificial-7475576/))
- **NDAs that name AI.** Uploading to an AI tool counts as a disclosure. Only approved enterprise tools are allowed, with no retention and no training on the data, or no AI at all for the most sensitive material.
- **AI output stays confidential.** Summaries and analyses an AI produces from your data are confidential information too, and deletion at the end of a deal covers prompt histories, chat logs and vector indexes.
- **Close the residuals loophole.** Anything stored in or retrieved from an AI tool is not the "unaided memory" a residuals clause lets the buyer keep.
- **Clean teams and third-party review.** A small walled-off team, or an independent firm, reviews the code and reports findings without handing over the code.
- **Bind the advisors too.** The same limits apply to the buyer's bankers, accountants and lawyers. No AI notetakers on calls without written consent.

**What seems to be missing:** an agent-proof data room. Today's data rooms were built to stop people from downloading and forwarding files, with view-only access, watermarks and access logs. They weren't built for an agent that reads every page and keeps what it learns. [Michael](/people/mpstaton/)'s take: there's a need for data rooms that can tell an agent or crawler apart from a person reading, and stop it from ingesting the whole room. At the very least, they should keep a record that it happened, so the seller has evidence if the IP turns up somewhere later. We haven't seen anyone build this yet.

**Why it stays open:** all of this governs what a buyer may do with your *documents*. None of it stops their people, or their agents, from learning what's possible and building it themselves, and that know-how is exactly what an AI-native company is selling. If you've seen a term sheet, NDA or process that handles this well, bring it to the December session.

## The agenda

### 1. What's new in Claude and ChatGPT, and how to use it in VC

Both apps changed a lot since our July session. These are the updates that matter most for venture work, with a fund use for each.

📅 **[See the full six-month timeline →](/timelines/claude-and-chatgpt)**: every Claude, ChatGPT, Claude Code, Codex and model release since May, side by side, each linked to its source.

**Claude**
- **Chat and Cowork became one Claude.** Ask a quick question or hand over a long job, and get back a finished doc, spreadsheet or deck, even after you close the laptop. *Use it for:* a first-draft IC memo and summary deck from a data-room export.
- **Claude Meetings (beta).** Claude joins a Google Meet, takes notes and builds docs live. *Use it for:* a running list of every deal discussed in the partner meeting, with owners and next steps.
- **Claude Data, Sheets and Whiteboards.** Live dashboards with agreed metric definitions, spreadsheets that export to Excel, and apps like Carta and HubSpot that open inside Claude. *Use it for:* a portfolio KPI dashboard the whole partnership trusts.
- **Security tools for IT.** A downloadable security report, checks against your data-loss tools, and a block on personal Claude accounts on firm laptops. *Use it for:* the operational due-diligence questionnaire from your LPs.

**ChatGPT**
- **Dots, agents that keep working.** A dot has its own computer and works between conversations, under rules you set for what it may do without asking. *Use it for:* a morning triage of inbound decks against your thesis. Note: dots are on by default for Enterprise workspaces from Nov 18 unless an admin opts out.
- **ChatGPT inside Microsoft 365.** A Word add-in, SharePoint folders inside ChatGPT, and @ChatGPT in Teams. *Use it for:* comparing term sheets straight from the SharePoint deal folder.
- **GPT-6.** Answers can include charts, comparisons and small interactive tools. It no longer switches to deeper thinking on its own, so pick a higher reasoning level for hard questions.

If your firm built custom GPTs, they're being retired and moved to plugins. We'll cover what that means.

### 2. Personal agents: use cases and shared best practices

The group chat has been comparing personal agents for weeks: Instinct, Town, Muse, Grok Bot, OpenClaw and others. We'll talk through what fellows actually use them for, what's worked, what hasn't, and the practices worth sharing. Bring your "best thing I've done with my agent" story.

Background reading: **[Takeaways from Using Personal Agents](/guides/personal-agents-in-the-dojo/)**.

### 3. Creating a home connector

Today every tool is its own connector, every person keeps their own skills, and every AI app keeps its own memory. The fix: **create one home connector, and let it manage everything else.** Your whole team adds it once, and behind it sit the firm's shared skills, context, memory and tools, each with permissions. All it needs is a version-controlled document store. We already run this for three firms, and Cloudflare Artifacts now makes that store easy, cheap and invisible, so you can ask Claude Code or Codex to build the whole thing.

📘 **[One Home Connector for Your Whole Team →](/guides/one-home-connector/)**: the full recipe, with the folder layout we use and a prompt you can paste.

## When

Thursday, November 19, 2026 · 12:00 PM Eastern / 9:00 AM Pacific

## Who this is for

VCs from analyst to partner, at any level of AI comfort.

The recording is linked at the top of this page.
