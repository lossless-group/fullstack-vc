---
title: "Takeaways from Using Personal Agents"
lede: "Distilled from the Dojo's group chat: how fellows put Instinct, Town, Muse, Grok Bot and OpenClaw to work, and how to choose one."
kind: field-notes
tools:
  - town
  - openclaw
estimated_minutes: 8
difficulty: beginner
status: Published
publish: true
date_created: 2026-11-15
date_modified: 2026-11-18
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Personal-Agents
  - Proactive-Agents
  - Agent-Security
  - Community-Field-Notes
---

In October, the Dojo's group chat turned into a running review of personal agents. These are AI assistants that do more than answer questions: they read your email and calendar, take actions on websites, and remind you of things before you ask. Fellows had tried five or six of them, on their real lives. This is what they found.

## The moments that sold people

**An agent that noticed something nobody asked about.** [[georgebabu|George Babu]] had a family trip booked, and their son had a camp trip the morning after the flight home. A couple of days before leaving, Instinct sent a ping:

> "Your son's camp kit - packed before you fly? You're back 10:36 PM Monday, bus leaves 8:50 AM Tuesday."

No one had asked it to connect the flight to the camp schedule. "After that, I was sold on making the time investment into setting up proactive agents for my personal and professional life," [[georgebabu|George]] wrote.

**An agent that did a whole errand, end to end.** [[caroline-lewis|Caroline Lewis]] asked [[tools/town|Town]] to sign up two kids, ages 3 and 6, for activities. It logged into four different activity websites, found class times that worked across three calendars ([[caroline-lewis|Caroline]]'s, their spouse's and the family's), and registered both kids. Where classes were full, it emailed the waitlist. It sent calendar holds to the family and the nanny, and set a reminder to log in the moment the next registration window opens, since those classes usually fill faster than a person can click. "I felt like magic," [[caroline-lewis|Caroline]] wrote, "and I prob only have like six more months before other parents on the agent game."

[[caroline-lewis|Caroline]] also has it send a weekly summary of every school email (the events, the times, "the insanity that is school communication") as a prep doc for the week, texted to the family and the nanny.

**An agent as an executive assistant.** [[jehanchu|Jehan Chu]] uses Instinct as an all-around EA: booking travel, scheduling meetings, life admin, light research, the to-do list, and short- and long-term reminders. It's proactive about what needs a reply in email and on the calendar. "Literally the best EA I've ever had," [[jehanchu|Jehan]] wrote, after going through three human ones that year.

**An agent with its own inbox.** [[tobyrush|Toby Rush]] gave their agent an email address. [[tobyrush|Toby]] forwards things to it ("add this to my contacts," "file this in that project"), captures to-dos and to-reads from wherever they are, sets reminders, and has it loop through email on a schedule. It's the simplest pattern in the thread, and you can copy it with almost any agent.

## What people are using

:::tool-showcase
- [[tools/instinct|Instinct]]
- [[tools/town|Town]]
- [[tools/muse|Muse]]
- [[tools/grok-bot|Grok Bot]]
- [[tools/openclaw|OpenClaw]]
- [[tools/hermes-agent|Hermes Agent]]
- [[tools/claude-cowork|Claude Cowork]]
- [[tools/chatgpt|ChatGPT]]
:::

- **[[tools/instinct|Instinct]].** The most-discussed agent. Fans love its proactivity and its voice. The limits: it's single-threaded, so long conversations scroll away and you have to ask it for recaps ([[jehanchu|Jehan]]'s complaint, from its biggest fan). And [[punit24-lab|Punit Chiniwalla]] found that after the first wow, it felt "little better than a skin on my Claude work."
- **[[tools/town|Town]].** [[caroline-lewis|Caroline]]'s choice, paired with Claude Cowork: "pretty dialed for me now." [[caroline-lewis|Caroline]] also called it "very good at responsive email and as a headless CRM." The complaint is speed: [[pocketcreates|Pocket Sun]] pays for the top tier but uses Instinct and ChatGPT more because Town is slow. [[georgebabu|George]] was trialing it and liked the onboarding and its security pitch.
- **[[tools/muse|Muse]].** [[chang-xu|Chang Xu]] sent the same requests to Instinct and Muse for weeks, and Muse consistently gave better replies. [[jehanchu|Jehan]] tried Muse two days after Instinct and preferred Instinct's voice, but admits to having been "already too embedded."
- **[[tools/grok-bot|Grok Bot]].** [[jehanchu|Jehan]] runs a small team of Grok Bot agents for ongoing projects (a home renovation, nonprofit work), plus a Grok Bot "chief of staff" that can't yet manage the others. A two-day experiment to get it to make money from "make money with AI" posts failed, because the posts were all engagement bait.
- **[[tools/openclaw|OpenClaw]].** [[tobyrush|Toby]] has it wired into so many things that switching is painful, but it doesn't do the proactive nudges, so [[tobyrush|Toby]] is eyeing Grok Bot.

## What to weigh when you choose

The thread kept coming back to the same few questions:

1. **Does it act before you ask?** Proactivity is what converted [[georgebabu|George]] and what tempts [[tobyrush|Toby]] to switch. It's the difference between an assistant and a chatbot.
2. **Does it remember?** [[jehanchu|Jehan]]'s recap problem shows that even good agents lose the thread of long conversations.
3. **Is it fast enough to use?** [[pocketcreates|Pocket]] is paying for Town's top tier and still reaching for faster tools.
4. **Is it more than a wrapper on the model you already use?** If you already work in Claude all day, judge the agent against that, the way [[punit24-lab|Punit]] did.
5. **Can it really connect across your tools, accounts, email and calendars?** Most agents handle one inbox and one calendar well. Check whether it can work across several accounts (personal and work Gmail, two calendars) and the apps your week actually runs on, or whether you end up copying things in by hand.
6. **What can it do out of the box, and what can you add?** Look at which actions are built in (send an email, book a meeting, fill a form, buy something) and how easily you can add your own: a connector to your CRM, a skill, a custom tool. Open agents like [[tools/openclaw|OpenClaw]] and [[tools/hermes-agent|Hermes Agent]] let you add almost anything, at the cost of setup. Polished ones like Instinct and Town do more on day one but are harder to extend.
7. **How much will it cost to switch later?** The more you wire an agent in, the harder it is to leave. [[georgebabu|George]] paused just thinking about how a new agent would conflict with the existing ones.
8. **Is it for your personal life or your firm?** See below.

[[chang-xu|Chang]]'s method is the best way to decide: **send the same requests to two agents for a few weeks and compare.** One person's demo doesn't tell you much.

## Personal agents at work: be careful

[[tobyrush|Toby]] drew the sharpest line in the thread. Instinct and Muse "feel like personal agents, not work agents." Town claims to be both, but:

> "There is going to be strong resistance (and rightly so) to allow personal agents into the work environments. Agents never forget. They capture context and memory. The IP leakage from personal agents in an enterprise is massive."

Security is already how fellows choose between products. Varun asked about Town because it "seems to have better security than Instinct," and [[pocketcreates|Pocket]] was "hearing security concerns" about Instinct back in August. Before you connect a personal agent to work email, ask what it stores, where, and who at the vendor can see it. Most firms will have rules here, and Microsoft shops in particular may already have a managed option.

Even the most ambitious setups keep a person in the loop. [[georgebabu|George]]'s team runs agents for prospect research, call prep, call debriefs and suggested emails, but [[georgebabu|George]] is "not ready to let them go send emails on our behalf."

## Not for everyone (yet)

Not everyone in the group is convinced. "What do people use town / muse / instinct for? I feel the use is not as much for me," Yao asked. [[tobyrush|Toby]]'s answer is a good test: these agents pay off most for **repetitive tasks you can describe once**, like booking, scheduling, summarizing, reminding and filing. If your week is mostly judgment calls, start smaller. Give an agent one job and its own inbox, and see whether it earns more.

## Bring your story

Personal agents get their own discussion at the **[Nov 19 session](/sessions/2026-11-19_monthly-all-hands)**: use cases and best practices, pooled from the group. [[jehanchu|Jehan]] asked to hear everyone's "best thing I've done with my agent (so far)." Bring yours.
