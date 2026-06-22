---
title: "Put Hermes Agent on Your Dealflow"
lede: "Hermes Agent is a persistent personal agent that grows with you — connect your messaging accounts and it captures, remembers, and surfaces every inbound deal so your funnel stops living in your inbox."
kind: how-to
use_cases:
  - automate-dealflow
tools:
  - hermes-agent
prerequisites:
  - "A machine you control to run it (a laptop, or a dedicated box / Mac mini for always-on)"
  - "One or more messaging accounts you're willing to connect (email, Telegram, etc.)"
  - "Comfort running an open-source agent locally — or a colleague who'll help you stand it up"
estimated_minutes: 30
difficulty: intermediate
video: ""
order: 10
status: Draft
publish: false
date_created: 2026-06-22
date_modified: 2026-06-22
authors:
  - Michael Staton
augmented_with: "Claude Code on Opus 4.8"
tags:
  - Hermes-Agent
  - Dealflow
  - Persistent-Agent
  - Nous-Research
---

# Put Hermes Agent on Your Dealflow

> [!info] Two doors, one room
> You can read this as a **use-case** ([[use-cases/automate-dealflow/index|Automate Dealflow]]) or as a **tool** ([[tools/hermes-agent|Hermes Agent]]). Same guide, surfaced from both.

## What Hermes Agent is

[[tools/hermes-agent|Hermes Agent]] (from Nous Research) is an **open-source agent that grows with you**: you install it, give it your messaging accounts, and it becomes a persistent personal agent with real memory across conversations. That persistence is the whole point for dealflow — it doesn't just answer a one-off prompt, it *remembers the deal you mentioned three weeks ago* and can surface it when the founder follows up.

## When to reach for it (vs. something else)

> [!tip] Right tool for the job
> - **Hermes Agent** shines when your dealflow arrives through **messaging** (email, Telegram, DMs) and you want one agent that builds durable memory over time.
> - For pulling structured records into a CRM on a schedule, pair it with [[tools/n8n|n8n]] or [[tools/composio|Composio]].
> - For a heavier capture-and-route pipeline, see [[tools/openclaw|OpenClaw]] (the path [[davidrolf|David Rolf]] and [[tobyrush|Toby Rush]] are on).

## Prerequisites

- A machine you control (laptop to start; a dedicated box / Mac mini for always-on).
- At least one messaging account you'll connect.
- Willingness to run an open-source agent locally — or a colleague to pair with on setup.

## Steps

> [!warning] Draft — verify against a real run before publishing
> The framing below is grounded in what Hermes Agent *is*; the exact install commands, account-connection flow, and config are placeholders until someone runs the current build end-to-end and fills them in. Don't publish (`publish: false`) until the `[!todo]` blocks are resolved.

1. **Install Hermes Agent.** Grab it from the project (`hermes-agent.nousresearch.com`) and stand up an instance on your machine.
   > [!todo] Capture the actual install path (package / repo / container) and the minimum specs for an always-on box.

2. **Connect a messaging account.** Point Hermes at the inbox or channel where your dealflow actually lands.
   > [!todo] Document the supported connectors and the auth steps for at least email + Telegram.

3. **Give it the dealflow job.** Tell the agent, in plain language, what a "deal" looks like for you and what to capture — company, stage, check size, source, one-line thesis — and where it should remember them.
   > [!todo] Paste the working system-prompt / instruction set once tuned. This is the high-value, copy-pasteable artifact other Fellows will want.

4. **Let it run and build memory.** As inbound arrives, the agent extracts and remembers each opportunity. Ask it things like *"what came in this week?"* or *"remind me about the fintech intro from the Kauffman thread."*

## Verify it's working

- Forward a test deal into a connected account; confirm the agent captures it in the structure you defined.
- Ask the agent to recall a deal from a prior day — persistence is the feature, so prove the memory survives a restart.

## Troubleshooting

> [!todo] Fill from real usage — common connection failures, memory/persistence gotchas, and how to secure an always-on instance (the security setup is its own sub-topic worth linking out to).

## Related

- Use-case: [[use-cases/automate-dealflow/index|Automate Dealflow]]
- Tool: [[tools/hermes-agent|Hermes Agent]]
- Adjacent paths: [[tools/openclaw|OpenClaw]], [[tools/composio|Composio]], [[tools/n8n|n8n]]
