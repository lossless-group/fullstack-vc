// ============================================================================
// theme-tokens.ts
//
// Build-time reader for the site's named theme tokens. Tools that need the
// brand's actual hex values (without round-tripping through CSS resolution)
// import from here — most notably AI image-generation prompt builders that
// want their color palette to track the live theme.
//
// Parses src/styles/theme.css for the Tier 1 "named token" convention from
// the Themes blueprint §2.1:
//
//   --color__violet-electric: #7c5cff;        ← extracted (Tier 1)
//   --color__bone-warm: #ece8de;               ← extracted (Tier 1)
//   --color-primary: var(--color__...);        ← skipped (Tier 2 semantic)
//   --fx-card-shadow: 0 1px 3px rgba(...);     ← skipped (effect token)
//
// Only literal hex values on `--color__*` properties are returned. Semantic
// tokens (Tier 2, kebab-case) and effect tokens (--fx-*) are deliberately
// ignored — they resolve through the CSS cascade at render time, not here.
// ============================================================================

import { readFileSync } from 'node:fs';

const DEFAULT_THEME_PATH = new URL('../styles/theme.css', import.meta.url).pathname;

// Matches lines like:  --color__violet-electric: #7c5cff;
// Anchored to start of line (with optional indent) so it doesn't match
// hex values appearing inside var() calls or color-mix() arguments.
const NAMED_COLOR_RE = /^\s*--color__([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/gm;

/**
 * Read all named brand colors (Tier 1 tokens) from theme.css.
 * Returns a flat map: `{ 'violet-electric': '#7c5cff', 'lime-terminal': '#b6ff5c', ... }`
 *
 * @param themeCssPath  Override the default theme.css location. Useful for tests.
 */
export function readNamedColors(themeCssPath: string = DEFAULT_THEME_PATH): Record<string, string> {
  const css = readFileSync(themeCssPath, 'utf8');
  const palette: Record<string, string> = {};
  NAMED_COLOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAMED_COLOR_RE.exec(css)) !== null) {
    palette[m[1]] = m[2];
  }
  return palette;
}

/**
 * Throwing variant of palette lookup — fails loudly if a token is missing
 * instead of silently returning undefined. Use this in build scripts where a
 * missing token means a stale prompt palette that should be fixed at the source.
 */
export function getNamedColor(palette: Record<string, string>, token: string): string {
  const value = palette[token];
  if (!value) {
    throw new Error(
      `Brand color "${token}" not found in theme.css. Either add it as ` +
      `--color__${token}: #...;  or remove the reference from your prompt palette.`
    );
  }
  return value;
}
