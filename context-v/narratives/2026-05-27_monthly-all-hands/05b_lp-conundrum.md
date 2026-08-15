---
title: "The LPs as Co-Investors Conundrum"
eyebrow: "Pulse · before the breakouts"
headline: "LPs want it. Most firms aren't running the process."
subhead: "Where do you actually land?"
compose: "Section__LPSyndicationPulse (live) — or static four-tile dashboard"
data_source: "src/data — or Turso PollResult snapshot"
data_snapshot:
  engagement:
    prompt: "Engage LPs as co-investors?"
    seeded: { yes: 3, no: 3 }
  frequency:
    prompt: "LP syndication frequency"
    scale: "1 (We don't do it) → 4 (Built into our practice)"
    median_after_seed: 2
  spv_process:
    prompt: "Run SPV / campaign-style process?"
    seeded: { yes: 1, no: 5 }
  direct_demand:
    prompt: "LPs want more direct opportunities?"
    seeded: { yes: 4, no: 1 }
date_created: 2026-05-27
date_modified: 2026-05-27
publish: true
---

## What this slide is

The four-question LP-syndication pulse, surfaced as a dashboard. Either composes `Section__LPSyndicationPulse` directly (live), or renders as a static four-tile grid with the seeded baseline.

## Why it's here

Frames the "shared tension" the breakouts dig into. Showing the data BEFORE the breakouts makes the *why* of Track 2 ("Syndicate to VCs") and Track 3 ("Offer to LPs") obvious.

## What to surface

- The headline tension: LPs want more direct co-invest, most firms aren't running SPV/campaign processes
- The four data points side-by-side (engagement / frequency / SPV / direct demand)
- That the data is live on the session page

## Visual hierarchy suggestion

Two columns: left = framing prose, right = four mini-charts (one per question). For the three Booleans: small Yes/No bars. For the sliding-scale: a 1-4 histogram with median marker. Heavy use of `--color-accent` for the Yes/strong-frequency bars. Could compose `Section__LPSyndicationPulse` directly if it renders OK at deck scale — verify in all three modes.
