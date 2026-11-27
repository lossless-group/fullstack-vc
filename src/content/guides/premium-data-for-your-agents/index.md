---
title: "Connect PitchBook, CB Insights and Your Data Subscriptions to Your Agents"
lede: "Perplexity now puts licensed data, including PitchBook, CB Insights, Statista, and the Crunchbase or FactSet seat you already pay for, behind one search box. Here's how to turn it on, plug it into Claude, and use it without tripping over your licenses."
kind: how-to
use_cases:
  - automate-dealflow
tools:
  - perplexity
  - claude-code
  - claude-desktop
  - memopop-ai
prerequisites:
  - "A Perplexity account. Included sources work on any plan; licensed connectors need Pro, Max or Enterprise"
  - "For a licensed connector: your own login with the data partner (Crunchbase, FactSet, Guidepoint and so on)"
  - "Claude Code or Claude Desktop, if you want your agent to use the data and not just you"
estimated_minutes: 20
difficulty: beginner
video: ""
order: 30
status: Draft
publish: false
date_created: 2026-11-26
date_modified: 2026-11-26
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Premium-Data
  - Perplexity
  - PitchBook
  - Crunchbase
  - Model-Context-Protocol
  - Due-Diligence
  - Dealflow
---

> [!info] The short version
> The data you actually trust (PitchBook, Crunchbase, CB Insights, Statista, expert-call libraries) has always lived behind logins your agents couldn't reach. [[tools/perplexity|Perplexity]] now offers some of it with every plan and connects the rest to subscriptions you already hold. A Perplexity MCP server then puts all of it inside Claude. Three steps: try it in Perplexity, connect your own subscriptions, then plug Perplexity into your agent.

> [!warning] Draft: verify against a real run before publishing
> Everything here comes from Perplexity's [help center](https://www.perplexity.ai/help-center/en/articles/12870803-premium-data-sources) and [Computer MCP docs](https://docs.perplexity.ai/docs/getting-started/integrations/computer-mcp-server), read on 2026-11-26. Nobody in the Dojo has run the full path yet. Keep `publish: false` until someone has, and update the `[!todo]` blocks with what they find.

## What you get

**Included with every Perplexity plan.** There's no partner account to set up. Each plan gets a limited number of premium queries a month.

| Source | What it holds | Where it helps a VC |
|---|---|---|
| **PitchBook Essentials** | Company profiles: firmographics, funding history, key investors, leadership | First look at a company, who's on the cap table, the investor syndicate |
| **CB Insights** | Market trends, market maps, company activity | Mapping a category, finding competitors |
| **Statista** | Statistics, market data, forecasts | Market sizing for a memo or IC deck |
| **Wiley** | Business, STEM, psychology and medical books and journals | Technical diligence, especially in health and life sciences |
| **Midpage** | U.S. court opinions, statutes and regulations | Regulatory and legal risk |

"Essentials" means the basics (firmographics, funding history, investors and leadership), not your full PitchBook seat.

**Licensed connectors: bring your own subscription.** These link a subscription you already pay for, so Perplexity can answer from data you're entitled to:

- **Private markets:** Crunchbase, Grata, D&B, Chronograph, AngelList, Papermark, Octus
- **Expert calls:** Guidepoint transcripts
- **Public markets and research:** FactSet, Morningstar, Daloopa, Quartr, IBISWorld, MT Newswires, SEC filings tools
- **Crypto:** Coinbase, OpenSea, Allium and others

## Step 1: Try it in Perplexity

Start a search in Perplexity, type **@**, and pick a source. You can also just ask: when a question matches what a source holds, Perplexity picks it on its own.

Questions worth trying on a company you already know well, so you can judge the answers:

- `@PitchBook Who led each of Acme Robotics' rounds, and how much did they raise?`
- `@CB Insights Who are the main competitors to Acme Robotics, and how are they funded?`
- `@Statista How big is the warehouse automation market, and how fast is it growing?`

> [!tip] Calibrate before you trust it
> Run one company you've already done diligence on. Compare PitchBook Essentials with what's in your CRM and the company's own data room. Now you know how far to trust it on a company you don't know.

## Step 2: Connect a subscription you already pay for

1. Open Perplexity in your browser and sign in.
2. Open **Plugins** in the sidebar, then **Discover**, or search for the partner.
3. Open the partner's page and select **Connect**.
4. Sign in with **your account at that partner** and approve the authorization.
5. Check that it shows as connected. It's now a source you can pick with **@**.

> [!warning] Your subscription may not include this
> Several partners sell agent access separately. FactSet MCP access isn't included with FactSet Workstation, Guidepoint has to switch MCP access on for you, and Morningstar needs an MCP server license or Morningstar Direct. If sign-in fails or the data you expect doesn't show up, ask your rep at the partner. On Enterprise plans, an admin may have to enable the connector for your organization first.

## Step 3: Plug it into your agent

Perplexity's **Computer MCP server** lets Claude ask Perplexity to do the work, including the premium sources you just set up. Its connector list includes PitchBook, CB Insights, Statista and SEC EDGAR. It signs in as you, over OAuth, so there's no API key, and it spends your Perplexity account's credits.

**In [[tools/claude-code|Claude Code]]:**

```bash
claude mcp add --transport http perplexity-computer https://www.perplexity.ai/rest/computer/mcp
```

Then run `/mcp` inside Claude Code and follow the sign-in prompt for `perplexity-computer`. A newly added server shows up in your **next** session.

**In [[tools/claude-desktop|Claude Desktop]] or claude.ai:**

1. Open **Customize > Connectors**.
2. Select **+ Add**, then **Add custom connector**.
3. Name it `Perplexity Computer` and enter `https://www.perplexity.ai/rest/computer/mcp` as the URL. Select **Continue**.
4. Review the detected authentication settings and select **Continue**.
5. Set **Authentication** to **Sign in now**, select **Add**, and finish the Perplexity sign-in in your browser.

On Claude Team or Enterprise, an owner adds it once under **Organization settings > Connectors**, and then everyone connects to it.

**Then ask Claude for what you need:**

> Use Perplexity Computer to pull Acme Robotics' funding history and investors from PitchBook, and its competitors from CB Insights. Run it incognito. Give me a table with the source for each row.

> [!tip] Things that save you grief
> - **Ask for incognito.** An incognito Computer conversation isn't saved to your Perplexity history or memory, and it expires after 24 hours. That's worth it for deal questions.
> - **Be patient.** Computer tasks take minutes, not seconds.
> - **Watch for sign-in links.** If a task needs a source you haven't connected yet, Computer hands back a sign-in link. Open it, sign in, and the task carries on.

> [!todo] Capture a real run
> Paste a working prompt and what came back, with the time it took and the credits it used, from at least one PitchBook and one Crunchbase lookup.

## Optional: run it unattended

The Computer MCP route always runs as a person. For a scheduled job with nobody signed in, such as a nightly sourcing scan, use a data partner that publishes its **own** MCP server (FactSet and Morningstar do, for licensed users). Register it as a custom connector in a Perplexity API project, and the Agent API can call it with your API key and the partner's license.

The regular Perplexity API can't reach the premium sources itself. Its built-in data tools are `finance_search`, for public markets only, and `people_search`.

## Use it well

- **Data room first.** For terms, the cap table and financials, the company's own documents are the answer. Premium data is context.
- **Then licensed data, then the open web.** For funding rounds, investors and leadership, PitchBook or Crunchbase beats a blog post.
- **Name the source.** Write "Statista estimates the market at …", not "the market is …". An estimate is somebody's estimate.
- **Show disagreements.** If PitchBook and a press release disagree on a round, say so in the memo instead of picking one quietly.

## Mind the license

> [!warning] Licensed data isn't yours to publish
> Licensed connectors run "under your existing agreement with that partner", and the included sources carry their publishers' terms.
> - **Usually fine:** your own memo, your IC deck, notes for your partners.
> - **Check your agreement first:** anything that leaves the firm, such as an LP letter, a co-investor memo, a public post or a newsletter.
> - **Citations may not open for the reader.** A PitchBook link only works for someone with PitchBook. A reader outside your firm can't check it.

**Quotas and credits.** Included sources have a monthly premium-query limit that depends on your plan. Licensed connectors draw on your partner account's own quota. Computer spends your Perplexity credits. A big batch, such as "enrich all 200 companies in my pipeline", can use up a month's allowance in an afternoon, so try ten first.

## Verify it's working

- In Perplexity, `@PitchBook` returns a funding history for a company you know, with citations.
- A connected subscription shows as **connected** on its Plugins page and answers a question only it could answer.
- In Claude, a request that names Perplexity Computer comes back with a sourced answer, and an incognito run doesn't appear in your Perplexity history.

## Where this goes next

[[tools/memopop-ai|MemoPop]] is building this in, so a memo can cite PitchBook and Statista with full provenance. Licensed facts are marked internal-only, and anything that leaves the firm is checked before it goes out. The design is in MemoPop's spec, *Premium Data Sources Integrations into MemoPop*.
