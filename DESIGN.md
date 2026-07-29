---
version: "alpha"
name: "FullStack VC — Devtools-Meets-Dojo"
description: "Design system for fullstack-vc.com, the Agentic VC Dojo's home. A code-editor aesthetic pointed at a venture audience: electric violet + terminal lime on obsidian, three runtime modes (light / dark / vibrant), Space Grotesk display over Inter body with JetBrains Mono as the system's connective tissue."
colors:
  # Tier 1 named tokens (verbatim from src/styles/theme.css :root)
  violet-electric: "#7c5cff"
  violet-deep: "#4b2fc9"
  lime-terminal: "#b6ff5c"
  cyan-vapor: "#5cf2ff"
  magenta-fuse: "#ff5cd6"
  obsidian: "#0b0d12"
  graphite-950: "#11141c"
  graphite-800: "#1c2030"
  graphite-600: "#3a4055"
  graphite-400: "#6b7390"
  graphite-200: "#c1c5d4"
  bone: "#f6f3ec"
  pampas: "#f6f1ef"
  bone-warm: "#ece8de"
  ink: "#0a0c12"
  amber-flare: "#ffb84d"
  # Semantic aliases (Tier 2, theme-default mapping)
  primary: "{colors.violet-electric}"
  primary-deep: "{colors.violet-deep}"
  secondary: "{colors.cyan-vapor}"
  accent: "{colors.lime-terminal}"
  status-active: "{colors.lime-terminal}"
  status-proposed: "{colors.amber-flare}"
  status-archived: "{colors.graphite-400}"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 400
  eyebrow:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.18em"
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  xl: "0.875rem"
  full: "999px"
spacing:
  card-pad: "1.25rem"
  card-pad-lg: "1.5rem"
  section-gap: "3rem"
  grid-gap: "1rem"
components:
  card:
    backgroundColor: "var(--fx-card-bg)"
    borderColor: "var(--fx-card-border)"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-pad}"
    hoverBorderColor: "{colors.primary}"
  eyebrow-label:
    typography: "{typography.eyebrow}"
    textColor: "var(--color-text-muted)"
    textTransform: "uppercase"
  chip:
    backgroundColor: "color-mix(in srgb, {colors.lime-terminal} 8%, transparent)"
    borderColor: "color-mix(in srgb, {colors.lime-terminal} 30%, transparent)"
    rounded: "{rounded.md}"
    typography: "{typography.code}"
  poll-embed:
    backgroundColor: "var(--fx-card-bg)"
    borderColor: "var(--fx-card-border)"
    rounded: "{rounded.sm}"
    openBorderColor: "color-mix(in srgb, {colors.primary} 35%, var(--color-border))"
  code-block:
    backgroundColor: "#0f172a"
    textColor: "#e2e8f0"
    rounded: "{rounded.sm}"
    typography: "{typography.code}"
modes:
  default: dark
  light:
    background: "{colors.bone}"
    surface: "{colors.bone-warm}"
    text: "{colors.ink}"
    text-muted: "{colors.graphite-600}"
    border: "{colors.graphite-200}"
  dark:
    background: "{colors.obsidian}"
    surface: "{colors.graphite-950}"
    text: "{colors.bone}"
    text-muted: "{colors.graphite-400}"
    border: "{colors.graphite-800}"
  vibrant:
    background: "{colors.ink}"
    surface: "color-mix(in srgb, {colors.violet-deep} 20%, {colors.obsidian})"
    text: "{colors.bone}"
    text-muted: "color-mix(in srgb, {colors.cyan-vapor} 60%, {colors.bone})"
    border: "{colors.violet-electric}"
---

# FullStack VC — Design System

> The runtime source of truth is `src/styles/theme.css` (two-tier tokens + three
> mode blocks) with fonts emitted by the Astro Fonts API in `astro.config.mjs`.
> This document is the human- and agent-readable contract that explains intent.
> Keep the two in sync when either changes.

## Brand & Style

**Devtools-meets-dojo.** FullStack VC is where venture capitalists learn to work
like engineers, and the visual system says so: a code-editor color world
(obsidian backgrounds, graphite surfaces, syntax-highlight accents) worn with
enough polish to present to LPs. The register is confident, slightly playful,
never corporate. Monospace type is used the way an editor uses it — for labels,
eyebrows, metadata, and anything that smells like machinery.

Three runtime modes, switchable live via `data-mode` on the root element:

- **dark** (default for new visitors) — the code-editor feel. Moderate glows,
  violet→cyan headline gradients.
- **light** — clean dev-doc feel. Effects nearly off; the headline "gradient"
  is a near-solid ink→deep-violet so the same `background-clip: text` technique
  works in all modes.
- **vibrant** — neon dojo energy for live-event surfaces. Loud four-stop
  headline gradient (lime → cyan → violet → magenta), heavy glows, lime hover
  accents.

The `--fx-*` effect tokens (glow opacity/spread, card shadows, headline
gradient, flare color) are how the modes express intensity — components read
the same token names and get mode-appropriate drama for free.

## Colors

Two-tier system (blueprint: `Maintain-Themes-Mode-Across-CSS-Tailwind.md` §2.1):

- **Tier 1 — named tokens** (`--color__violet-electric`), raw hex, private to
  `theme.css`. The visual rule: see `__` → raw named token.
- **Tier 2 — semantic tokens** (`--color-primary`), kebab-case, what components
  and Tailwind utilities read. Tailwind v4 only generates utilities for this tier.

The palette's roles:

- **Violet electric `#7c5cff`** — the primary. Actions, hover borders, focus,
  the brand's default "look here."
- **Lime terminal `#b6ff5c`** — the accent. Live/active states (open polls,
  active working groups), vibrant-mode hovers. Reads as "terminal green" energy.
- **Cyan vapor `#5cf2ff`** — the secondary. Gradient partner to violet.
- **Magenta fuse `#ff5cd6`** — gradient endpoint only; used sparingly.
- **Amber flare `#ffb84d`** — status: proposed/pending.
- **Graphite ramp** (950→200) — surfaces, borders, muted text across modes.
- **Bone / bone-warm / ink** — light-mode world plus dark-mode text.

Status colors are mode-invariant (`--color-status-active|proposed|archived`);
their perceived intensity shifts naturally with the card surface behind them.

## Typography

Three families, each with one job (loaded via Astro Fonts API — do not add
`@font-face` by hand):

- **Space Grotesk** (`--font-display`) — headlines, card titles, anything with
  personality. Bold (700) at display sizes.
- **Inter** (`--font-body`) — body copy. Legible, neutral, stays out of the way.
- **JetBrains Mono** (`--font-code`) — the system's signature: eyebrows
  (uppercase, `0.18em` tracking), metadata rows, chips, code, timestamps,
  status badges. If a string is machinery rather than prose, it's mono.

## Layout & Spacing

- Content pages: centered `max-w-5xl` container with `px-6 py-12`
  (`containerClass` on `BaseThemeLayout`).
- Long-form/prose blocks cap at `48rem` (~65ch); scripts and narrow reading
  columns at `44rem`.
- Card grids: 1-column mobile → 2–3 columns ≥640/1000px, `1rem` gap.
- Vertical rhythm: `3rem` between page sections; section headings carry a
  bottom border + `0.5rem` padding as a visual rule.
- Decks (`PageAsDeckWrapper`) are scroll-snap full-viewport sections — deck
  slides use `clamp()` type scales, never `vw`-only sizing.

## Elevation & Depth

Elevation is mode-relative, expressed through `--fx-card-shadow` /
`--fx-card-shadow-hover`:

- **light** — conventional soft shadows (near-flat).
- **dark** — a 1px graphite ring plus deep shadow; hover swaps the ring to
  violet with a violet-tinted glow.
- **vibrant** — glow *is* elevation: violet halos at rest, lime halos on hover.

Hover motion across all cards: `translateY(-2px)` + border/glow change, 150ms
ease. Nothing scales; nothing rotates.

## Shapes

Rounded scale in active use: `0.5rem` (code blocks, list rows, polls),
`0.625rem` (cards, chips), `0.75rem` (feature cards, poll stages), `0.875rem`
(recipe cards), `999px` (pills/badges). Corners are always rounded — sharp
corners read as unstyled here.

## Components

The component vocabulary (all read Tier 2 + `--fx-*` tokens only — never
`--color__*` directly):

- **Card** — the workhorse: `--fx-card-bg`, `--fx-card-border`, hover to
  primary. Variants across recipe cards, track/arc cards, demo cards, vp-cards.
- **Eyebrow label** — mono, uppercase, letter-spaced, muted. Opens nearly every
  page, section, and slide.
- **Chip / fomo-chip** — accent-tinted pill for short emphatic phrases.
- **Agenda row** — numbered grid row (mono number in accent, display-font body,
  mono minutes), `agenda-accent` variant tints the border.
- **PollEmbed** (Svelte) — live poll card; variants `inline | card | present |
  archive`; open state ring in primary; status badge with pulse dot.
- **CodeBlock** — slate-dark surface regardless of mode, language label +
  copy-to-clipboard chip in the top-right chrome (added 2026-07-29).
- **Callout** — LFM directive-driven (`> [!type]`), per-type accent borders.
- **Section__\*** — page-section components (WebinarReflection, SurveyVoices,
  FirmsRepresented, LPSyndicationPulse, BreakoutsTeaser…) composed into both
  session pages and deck slides.
- **Deck slide** — full-viewport section with `slide-eyebrow` / `slide-headline`
  / `slide-subhead` scale and `data-reveal` staggered entrances.

Catalog: `/design-system` (developers) and `/brand-kit` (stakeholders) — update
`/design-system` in the same change as any component change.

## Do's and Don'ts

- **Do** put every new raw value in Tier 1 and wire components through Tier 2.
  **Don't** reference `--color__*` from a component — that's the tier boundary.
- **Do** verify every surface in all three modes before shipping — vibrant is
  the one that breaks first.
- **Don't** hand-declare fonts; the Astro Fonts API in `astro.config.mjs` owns
  `--font__*` emission.
- **Don't** use `vw` units inside deck slides (letterboxed-canvas lesson from
  the deck-iteration work); use `clamp()` with rem bounds.
- **Do** keep mono type for machinery (labels, stats, timestamps) and Inter for
  prose — mixing them is what makes surfaces feel unstructured.
- **Don't** add new glow effects outside the `--fx-*` token set; per-component
  glows drift out of mode contract.
- **Do** keep code blocks slate-dark in every mode — they're a deliberate
  constant, the one surface that always looks like an editor.
