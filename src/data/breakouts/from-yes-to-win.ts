// Breakout content for the 2026-05-27 Monthly All-Hands.
// One source of truth: each track page imports the slice it needs, the
// index page lists all three. Edit here, both views stay in sync.

export interface BreakoutQuestion {
  n: number;
  prompt: string;
  lens: string;
}

export interface ArtifactField {
  label: string;
  placeholder: string;
}

export interface BreakoutTrack {
  slug: string;
  shortName: string;
  title: string;
  hook: string;
  reality: string;
  starterExample: string;
  agentHints: string[];
}

export interface BreakoutSession {
  parent: string;
  title: string;
  lede: string;
  framing: string;
  entryState: string;
  tracks: BreakoutTrack[];
  questions: BreakoutQuestion[];
  artifactFields: ArtifactField[];
}

export const FROM_YES_TO_WIN: BreakoutSession = {
  parent: 'from-yes-to-win',
  title: 'From Yes to Win',
  lede: "You know you want to do this deal. Full body yes. What's between you and the wire transfer?",
  framing:
    "Three breakout tracks. Each starts at the same place — personal conviction — and forks by which wall you actually hit next. Pick the track closest to your operating reality.",
  entryState:
    "Whatever sourcing, triage, and personal due diligence you did, it's done. You're a full-body yes. Now what?",
  tracks: [
    {
      slug: 'internal-to-ic',
      shortName: 'Internal → IC',
      title: 'Internal Conviction → IC',
      hook: "I have to get others on my team on board.",
      reality:
        "You have to prepare, socialize, get on the IC agenda, present your take, and prove this is 'our' kind of deal. The work between your yes and the firm's yes.",
      starterExample:
        "Drafting the IC memo from your call notes + the data room — keeping the partner pattern-match objections pre-answered.",
      agentHints: [
        "IC memo first-draft from call notes + materials",
        "Counter-objection pre-mortem against partner pattern history",
        "Reference call summarizer + theme extractor",
        "'Why this is our kind of deal' framing assistant",
      ],
    },
    {
      slug: 'syndicate-to-vcs',
      shortName: 'Syndicate → VCs',
      title: 'Syndicate to VCs',
      hook: "I'm a smaller check that needs to come in alongside a powerful syndicate.",
      reality:
        "The founder has the round half-circled. You need to make sure the company will have value-add investors alongside you — and you need to do it without burning your relationships or your time.",
      starterExample:
        "Mapping which funds at which stages would actually add value to this company — and drafting the warm-intro asks to the partners you trust.",
      agentHints: [
        "Co-investor fit-scoring against company stage / sector / geography",
        "Warm-intro draft generator per target fund + partner",
        "Round-build status tracker (who's in, who's looking, who passed)",
        "Talking-points generator for each fund's known thesis",
      ],
    },
    {
      slug: 'offer-to-lps',
      shortName: 'Offer → LPs',
      title: 'Offer to LPs',
      hook: "I'm a good size check, the syndicate solves itself. But my LPs want co-invest opportunities.",
      reality:
        "You have to get this to them in a way they can digest, and keep them primed for opportunities that move faster than they're used to deciding on. SPV mechanics, comms cadence, soft pre-circling.",
      starterExample:
        "A 'co-invest one-pager' generator that lands in LP inboxes within 24 hours of your decision, with the right level of detail per LP segment.",
      agentHints: [
        "Per-LP one-pager generator (segmented by check size / sector preference)",
        "Pre-circling tracker — who's leaned in, who's silent, who's a soft yes",
        "SPV doc-set assembly + status comms",
        "LP-curiosity feeder: light updates between deals to keep the muscle warm",
      ],
    },
  ],
  questions: [
    {
      n: 1,
      prompt:
        "What would you do if you had all the time and help you needed — and what do you actually do today, given constraints?",
      lens: "Current state vs. ideal state. The honest gap at the workflow level.",
    },
    {
      n: 2,
      prompt:
        "What could AI tools / agents do to move you from status quo toward ideal? What's the agent's job description? What are the musts vs. the wants?",
      lens: "Designing the agent. 'Musts' force ranking — wants are nice-to-haves that surface only if musts are met.",
    },
    {
      n: 3,
      prompt:
        "Has anyone here — or anyone you know — had a real breakthrough? What is it? What known tools might do this well?",
      lens: "Evidence and prior art. Surface what the room already knows so the dojo doesn't reinvent it.",
    },
    {
      n: 4,
      prompt:
        "Where's the gap between effective and what's possible with your current toolkit and setup?",
      lens: "Personal honest audit. What you have vs. what you'd need to take the next step.",
    },
    {
      n: 5,
      prompt:
        "Between now and the last Wednesday in June (June 24), are you willing AND able to dig into this deeper — or do you just want to hear back?",
      lens: "Self-sort, not group discussion. Captured in the closing live poll — splits the room into a doer cohort and an audience cohort, both legitimate.",
    },
  ],
  artifactFields: [
    {
      label: "The workflow we focused on",
      placeholder: "\"When X happens, agent does Y, human does Z.\"",
    },
    {
      label: "The one tool we'd reach for first",
      placeholder: "Tool name + the reason it's the first one",
    },
    {
      label: "The metric that says it's working",
      placeholder: "What you'd watch to know it's earning its keep",
    },
    {
      label: "The thing we'd need from the dojo to actually build it",
      placeholder: "Tutorial, setupathon, intro, demo, decision-set...",
    },
  ],
};

export function getTrack(slug: string): BreakoutTrack | undefined {
  return FROM_YES_TO_WIN.tracks.find((t) => t.slug === slug);
}
