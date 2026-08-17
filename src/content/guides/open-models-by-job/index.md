---
title: "Orientation: Which Open Model for Which Job (Summer 2026)"
lede: "Three months, a dozen serious open-weight releases, and a clear answer for only one of the five jobs people keep asking about. Coding is spectacularly well served — Ornith-1.0 beats Claude Opus 4.7 on two headline benchmarks under an MIT license. Extraction, analysis, and on-brand imagery are murkier. And the two questions with the most counterintuitive answers are SVG (don't use an image model) and meeting transcription (the transcript is solved; knowing who spoke is not)."
kind: orientation
tools:
  - claude-code
  - granola
prerequisites: []
estimated_minutes: 14
difficulty: intermediate
video: ""
order: 19
status: Draft
publish: true
date_created: 2026-08-17
date_modified: 2026-08-17
authors:
  - Michael Staton
augmented_with: "Claude Code on Opus 5"
tags:
  - Open-Source
  - Models
  - Orientation
  - Evaluation
  - Self-Hosting
  - Speech-to-Text
  - Diarization
---

> [!info] The one-sentence verdict
> **Coding is solved and cheap** — several open-weight models now beat frontier closed models on agentic coding benchmarks under permissive licenses. **Structured extraction is the one to be careful with**, because "valid JSON" and "correct JSON" are not the same number and the gap is bigger than anyone advertises. **On-brand SVG isn't an image-model problem** — it's a coding problem. And **the meeting-transcript question is really two questions**: transcription is at ~5% word error and effectively done; knowing *who was speaking* is at 11–19% error and is why you're still paying for Granola.

## The window, and why the question got hard

This covers open-weight models released between mid-May and mid-August 2026. That's a deliberately short window, and it still contains roughly a dozen consequential releases — which is the actual reason you're asking. The field moves faster than the "best open model" blog posts that rank it, and most of those posts are quietly a generation behind.

A note on what "open" means here, because it's doing real work: every model below ships **downloadable weights**, most under MIT. That matters less because you'll run GPUs — you probably won't — and more because it decides whether you can put a portfolio company's confidential data through it under terms you control, and whether the model can be taken away from you.

**What actually landed:**

| Model | Shipped | Shape | License |
|---|---|---|---|
| **Ornith-1.0** (DeepReinforce) | Jun 25 | 9B / 31B dense, 35B / 397B MoE | MIT, no regional restrictions |
| **Kimi K2.7 Code** (Moonshot) | Jun 12 | Coding-specialised, 256K context | Modified MIT |
| **GLM-5.2** (Z.ai) | Jun 13 | 744B MoE, 1M context | MIT |
| **MiniMax M3** | June | Sparse-attention MoE, 1M context | Open weights |
| **Kimi K3** (Moonshot) | Jul 16 | 2.8T MoE, 1M context, native vision | Modified MIT |
| **DeepSeek V4-Flash-0731** | Jul 31 | 284B total / 13B active, 1M context | MIT |
| **DeepSeek V4-Pro** (GA) | Aug 13 | 1.6T total / 49B active, 1M context | MIT |

Kimi K3 is the largest open-weight model released to date. That sentence would have been remarkable a year ago; it's now a Thursday.

## Job 1 — Coding

**This is the job the open ecosystem has decisively won, and it isn't close.**

[**Ornith-1.0**](https://ornith.ai/ornith_1_0.html) is the interesting one, and not only for its scores. Most coding models learn to produce solutions. Ornith learns to produce **its own scaffolding** — the tool structure around a task — as part of the same self-improving loop. Hence the name: Greek for bird, as in one that builds its own nest.

The flagship 397B posts **82.4 on SWE-Bench Verified and 77.5 on Terminal-Bench 2.1**, beating Claude Opus 4.7 on both, and outscoring DeepSeek-V4-Pro and MiniMax M3. The number that should actually interest you is the small one: the **9B** variant hits 69.4 on SWE-Bench Verified. That runs on a laptop. A private, offline, no-data-leaves-the-building coding assistant is now a 9-billion-parameter download.

The rest of the field sorts cleanly:

- **Kimi K3** — strongest all-round: raw reasoning, native vision, long-context fidelity. Tops the Frontend Code Arena, 76.8% SWE-Bench Verified. Also the most expensive of the group at roughly $3.00 / $15.00 per million tokens in/out.
- **GLM-5.2** — the value pick, and it isn't a compromise. Strong on coding benchmarks and agent reliability at about **$1.40 / $4.40** — output roughly a third of K3's. Plain MIT, the most permissive license in the group.
- **MiniMax M3** — sparse attention built for cheap long-context decoding; posted the top open-weight **SWE-bench Pro** score at 59.0%.
- **Kimi K2.7 Code** — narrower and coding-specialised, +21.8% over K2.6 on Moonshot's own code bench.

> [!tip] The practical read
> Start with **GLM-5.2** for cost, reach for **Kimi K3** when a task genuinely needs the reasoning or the vision, and keep **Ornith-1.0-9B** in your back pocket for anything that must not leave your machine. You don't need to host any of them — they're all available through the usual routers.

## Job 2 — Data formatting, reformatting, ETL

Here is where I'd slow you down, because the marketing and the measurement disagree.

Turning unstructured input into structured records — parsing a deck into fields, a data room into a table, an email thread into CRM rows — is the single most common serious use of these models in a firm. The [Structured Output Benchmark](https://arxiv.org/abs/2604.25359) evaluated 21 frontier and open-weight models on exactly this, and the result is a two-part number you need to hold in your head at once:

- **Schema compliance: near-perfect.** The models reliably emit JSON that validates.
- **Value accuracy: 83.0% on text, 67.2% on images, 23.7% on audio.**

**Those are different things, and the gap is the whole risk.** A model that returns perfectly-shaped JSON with a wrong number in it fails *silently* — it passes your validator, lands in your spreadsheet, and nothing anywhere goes red. One field in six is wrong on text. Two in three on scanned documents. On audio, three quarters.

That doesn't mean don't do it. It means the extraction step needs a verification step, and the verification step is the actual engineering. Sample and hand-check. Extract twice with different models and diff. Have the model cite the source span for every field so a human can spot-check in seconds rather than re-reading the document.

On model choice: **MiniMax M2.5** scored 98.6% with a 100% pass rate on structured extraction in independent testing, and **GLM-5** landed around 77.8% — the two strongest self-hosted picks. **DeepSeek V4** supports JSON output and tool calls natively across a 1M-token context, which matters when the source document is a 200-page data room PDF rather than an email.

For tool-calling accuracy specifically — right function, right parameters, right types — the **Berkeley Function Calling Leaderboard** is the one to watch; V4 added web search and memory categories.

## Job 3 — Data analysis

**This is the worst-*measured* job of the five, and the weakness is in the evaluation rather than the models.**

Search for "best open model for data analysis" today and you'll get Qwen2.5-VL-72B, DeepSeek-V3, GLM-4.5V — recommendations one to two generations behind the releases in the table above. That's not because the new models are worse at analysis. It's because nobody has built the benchmark culture around analysis that exists around coding, so the guidance calcifies.

What we can say with confidence: the reasoning scores are real. GLM-4.7 hit 95.7% on AIME 2025, DeepSeek V3.2 93.1%. Frontier-adjacent arithmetic and reasoning is not the bottleneck.

**The bottleneck is that "data analysis" isn't one job.** Reading a chart is a vision task. Computing over a spreadsheet is a code-execution task. Reasoning about what the numbers mean is a reasoning task. Models that top one are routinely mediocre at another.

The practical consequence: for anything numerical, **do not ask a model to compute — ask it to write code that computes**, then run the code. That converts a task where models hallucinate confidently into one where they're excellent and the answer is reproducible. It's also why this job collapses back into Job 1 for most real work, and why the [Claude Code](/guides/claude-desktop-vs-claude-code) pattern — agent in a folder, writing and running scripts — beats a chat window for portfolio analysis regardless of which model sits underneath.

## Job 4 — On-brand images, and the SVG question

Two separate problems that get asked as one.

**For raster images**, the open-weight field barely moved inside our window — the incumbents were already set. FLUX.2 (November 2025) and Qwen-Image-2.0 (February 2026) both predate it, and Qwen-Image-2.0 still holds #1 on AI Arena for text-to-image and editing. What did land in-window: Krea 2 (Jun 22, first foundation model built from scratch), a 9.3B Stability release with open weights (Jun 18), Microsoft's Mage-Flow (Jul 21), and NVIDIA's **Cosmos3-Super-Text2Image**, which currently leads open weights on the Artificial Analysis arena at 1,219 against a 1,150–1,185 cluster.

**For "on-brand" specifically**, the feature that matters isn't the score — it's **reference-image conditioning**. FLUX.2 accepts up to 10 reference images in a single generation with strong preservation of style and product appearance. That's the mechanism that makes output look like *your* brand rather than like a good image. Judge on that, not on arena rank.

**For SVG — don't use an image model.** This is the reframe worth the price of admission.

Native text-to-SVG is still a research area, not a shipped product. Chat2SVG, SVGFusion, Reason-SVG, DiffSketcher — all real work, none of it something you'd put in a brand pipeline this quarter. Meanwhile SVG is *text*: a structured, well-documented markup language with a strict grammar.

Which means **the best open model for SVG generation is a coding model.** Ask GLM-5.2 or Ornith for an SVG and you get editable paths, real `<text>` elements with your actual font stack, and a gradient defined by your actual brand tokens — not a raster approximation that has to be traced. It's version-controllable, diffable, and it renders identically at every size.

That's exactly how the house share-imagery pipeline already works: SVG is *authored* against brand tokens and composited, never generated by an image model. The image models earn their keep on photographic and illustrative backgrounds; the type, the marks, and the geometry are code.

## Job 5 — Speech to text, and knowing who said it

This one has a paid incumbent in most firms — [[tools/granola|Granola]] or an equivalent — which makes it the most actionable section here. It also contains the sharpest misconception.

**Transcription and diarization are two different models, and only one of them is solved.**

"Transcribe this meeting" is automatic speech recognition. "Which of those sentences was the founder and which was my partner" is **speaker diarization**, and it runs as a separate stage with its own models, its own benchmark, and its own — much worse — error rate. Products like Granola are a *pipeline*, not a model, and diarization is the stage that makes them hard to replace.

The two numbers side by side:

| | Metric | State of the art | Read |
|---|---|---|---|
| **Transcription** | Word Error Rate | **~5.4%** | Effectively solved |
| **Diarization** | Diarization Error Rate | **~11–19%** | Very much not |

DER decomposes into three failures — speech detected that wasn't there, real speech missed, and speech attributed to **the wrong speaker**. That third one is the one that hurts you, because it produces a transcript that is fluent, confident, and wrong about who made the commitment.

For a VC that's not a rounding error, it's the whole value. "Who said we'd be at $2M ARR by Q3" is a diarization question. So is every attribution in a partner meeting, every "the founder conceded that…", and every quote you might later put in an IC memo. A transcript with a 15% DER reads perfectly and misattributes roughly one speech segment in seven.

It also compounds with the extraction problem from Job 2: **value accuracy on audio was 23.7%** in the Structured Output Benchmark, the worst of the three modalities by a wide margin. Audio → structured records is currently the least reliable pipeline in this entire piece.

**The transcription tier** (all comfortably good enough):

- **Cohere Transcribe** — 2B, **Apache 2.0**, 5.42% average WER across eight English test sets; took the top of the HuggingFace Open ASR Leaderboard. 14 languages. The most permissive license of the leaders. (March 2026, so just outside our window, but it's the accuracy benchmark everything else is measured against.)
- **NVIDIA Canary-Qwen 2.5B** — currently #1 on that leaderboard at 5.63% WER.
- **Nemotron 3.5 ASR** *(Jun 4, in-window)* — 600M streaming model covering 40 language-locales with automatic language detection, OpenMDW license. The one to look at if you want real-time rather than batch.
- **Parakeet TDT / Canary 1B** — sub-3% WER on Common Voice English, if English-only is acceptable.

**The diarization tier** (where the actual work is):

- **pyannote** — the default, and **4.0 community-1 superseded 3.1 in 2026** for most self-hosted pipelines. Best balance of accuracy, ease, and community support.
- **NVIDIA NeMo Sortformer** — end-to-end 18-layer transformer that treats diarization as one problem rather than a multi-stage cluster-then-assign pipeline. **Sortformer v2-streaming** and **DiariZen** benchmark best overall in the June 2026 sweep across DIHARD III, AMI, VoxConverse and CallHome.

> [!tip] The honest recommendation
> **Keep paying for Granola.** Not because the open models can't do it — they can — but because what you'd be rebuilding is a five-stage pipeline (voice activity detection → ASR → diarization → alignment → summarisation), and the two stages that make it *feel* good are the two that aren't a model download.
>
> The case for building it yourself is **not cost, it's confidentiality.** A recorded partner meeting or a founder call is exactly the material where "where does this audio go, and who trains on it" has a real answer you may need to give an LP. That's the same question the [Agent-Native Browsers](/guides/agent-native-browsers) piece raises about page content, and it has the same shape: the local option is less capable and sometimes that's the point.

If you do build it: name your speakers rather than trusting the model to separate them. Diarization gives you "Speaker 1 / Speaker 2"; a short enrolment sample per regular attendee turns that into names and cuts the confusion component of DER substantially. For recurring internal meetings that's a one-time setup with an outsized payoff.

## How to actually decide

Benchmarks are directional, not dispositive. Four questions that beat any leaderboard:

1. **Does the license let you put confidential material through it?** MIT with no regional restrictions (Ornith, GLM-5.2, DeepSeek V4) is a different legal object from "modified MIT" (the Kimi family). Read it before the portco data goes in, not after.
2. **Run your own five-example eval.** Take five real tasks you actually do — a real deck, a real data room page, a real spreadsheet — and run them through three models. Half a day, and it will disagree with the leaderboards.
3. **Cost per outcome, not per token.** A model at a third the price that needs two attempts is not cheaper. GLM-5.2's advantage over K3 is real *and* it only holds if the first answer lands.
4. **Are you actually self-hosting?** Usually the answer is no, and open weights are still the right choice — for the license, the portability, and the guarantee the model can't be deprecated out from under a workflow you built.

> [!warning] This ages in weeks, not years
> Every date here is between mid-May and mid-August 2026, and half of these models didn't exist when the previous version of this question was answered. Treat the *shape* of the guidance — coding solved, extraction risky, analysis under-measured, SVG-is-code, diarization-is-the-hard-half — as the durable part, and re-check the specific names before betting on one.

## Related

- Orientation: [Claude Desktop vs Claude Code](/guides/claude-desktop-vs-claude-code) — why the agent-in-a-folder pattern beats a chat window for analysis, whichever model is underneath
- Orientation: [Agent-Native Browsers](/guides/agent-native-browsers) — the other half of the stack, for work that lives behind a login
