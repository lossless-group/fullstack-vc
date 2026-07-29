// Breakout content for the 2026-07-29 Agentic VC Dojo — "Set the Agenda".
// This session is discussion-first: random small groups look back at the
// arc so far and co-author what the dojo covers next. One shared page,
// same rail for every group. Edit here, the page stays in sync.

export interface BreakoutQuestion {
  n: number;
  prompt: string;
  lens: string;
}

export interface ArtifactField {
  label: string;
  placeholder: string;
}

export interface ArcSession {
  date: string;
  shortName: string;
  title: string;
  gist: string;
  href: string;
}

export interface AgendaBreakoutSession {
  parent: string;
  title: string;
  lede: string;
  framing: string;
  entryState: string;
  groupMechanics: string;
  arc: ArcSession[];
  questions: BreakoutQuestion[];
  artifactFields: ArtifactField[];
}

export const SET_THE_AGENDA: AgendaBreakoutSession = {
  parent: 'set-the-agenda',
  title: 'Set the Agenda',
  lede: "Three sessions in, the dojo's next arc gets written by the room. Look back at what stuck, name what's missing, and co-author what comes next.",
  framing:
    "No tracks this time. Four to five random groups, same five questions, same one-pager. Random on purpose — the agenda should be shaped by people who don't already talk to each other.",
  entryState:
    "You've seen the arc: the launch, the deal-close workflows, the second brains. Some of it you tried. Some of it you meant to try. All of that is data.",
  groupMechanics:
    "Zoom will auto-assign groups of 4–5. First name alphabetically is the scribe — they keep this page open and fill the one-pager in the last 90 seconds. 12 minutes total. The questions are a rail, not a march.",
  arc: [
    {
      date: '2026-04-29',
      shortName: 'April · Launch',
      title: 'Agentic VC Dojo Launch',
      gist: 'Why a dojo, who was in the room, and the first read on where agents meet venture workflows.',
      href: '/sessions/2026-04-29_agentic-vc-dojo-launch',
    },
    {
      date: '2026-05-27',
      shortName: 'May · From Yes to Win',
      title: 'From Yes to Win',
      gist: 'Three breakout tracks on the work between your yes and the wire: IC memos, syndicate building, LP co-invest.',
      href: '/breakouts/from-yes-to-win',
    },
    {
      date: '2026-06-24',
      shortName: 'June · Second Brains',
      title: 'Dealflow into Second Brains',
      gist: 'Live demos — intake forms into Notion, a whole personal operation through OpenClaw into Obsidian, and a markdown-notebook primer from zero.',
      href: '/sessions/2026-06-24_dealflow-into-second-brains',
    },
  ],
  questions: [
    {
      n: 1,
      prompt:
        'Since the dojo launched in April, what have you actually changed about how you work? What did you try that stuck — and what died on the vine?',
      lens: 'Honest inventory. Adoption vs. aspiration — both answers are data.',
    },
    {
      n: 2,
      prompt:
        "Where are you stuck right now? What's the wall between you and the agentic workflow you actually want?",
      lens: 'Name the blocker: tooling, time, security/compliance, know-how, or something else.',
    },
    {
      n: 3,
      prompt:
        "Look at the arc so far — launch, deal-close workflows, second brains. What's missing? What should the dojo have covered by now that it hasn't?",
      lens: 'Gap-spotting against the arc. The absent session is the interesting one.',
    },
    {
      n: 4,
      prompt:
        'Design the next three sessions. What topics, in what order, would make you show up without thinking twice?',
      lens: 'The forward agenda. Concrete titles beat themes — pitch the session, not the category.',
    },
    {
      n: 5,
      prompt:
        'What would you personally demo, teach, or convene if asked? Everyone answers before the group closes.',
      lens: "Self-sort. This is how the fall arc's presenters and conveners surface — captured in the one-pager, not left in the air.",
    },
  ],
  artifactFields: [
    {
      label: "The session we'd most want to attend",
      placeholder: 'A title + one sentence on what it covers and who leads it',
    },
    {
      label: 'Our shared blocker',
      placeholder: 'The wall more than one of us hit — be specific',
    },
    {
      label: 'Who in this group could present something',
      placeholder: "Name + what they'd demo, teach, or convene",
    },
    {
      label: "One format change we'd make",
      placeholder: 'Cadence, hands-on vs. demos, breakout size, async between sessions…',
    },
  ],
};
