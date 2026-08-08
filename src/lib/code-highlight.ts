// src/lib/code-highlight.ts — server-side syntax highlighting for LFM content.
//
// Why this exists: Astro's built-in Shiki only touches markdown that Astro's
// own pipeline renders to HTML. Our content goes LFM -> MDAST ->
// AstroMarkdown.astro -> CodeBlock.astro, a custom renderer, so Astro's
// highlighter never sees it. Before this module every code block on every
// guide rendered as unstyled plain text.
//
// The theme below colors tokens with `var(--code-*)` CSS variables rather
// than literal hex. Shiki passes those straight through into the inline
// styles it emits, so ONE highlighter serves all three modes and the actual
// palette lives in theme.css next to everything else — the same two-tier
// discipline the rest of the site follows (see CLAUDE.md "CSS Token
// Convention"). Re-theming code blocks means editing tokens, not this file.

import { createHighlighter, type Highlighter } from 'shiki';

/** Languages preloaded at build. Anything else falls back to plaintext. */
const LANGS = [
  'bash', 'shell', 'console',
  'ts', 'tsx', 'js', 'jsx',
  'json', 'jsonc', 'yaml', 'toml', 'ini',
  'css', 'html', 'astro', 'svelte',
  'python', 'sql', 'diff', 'markdown',
] as const;

/** Fence aliases we accept and normalize onto a loaded grammar. */
const ALIASES: Record<string, string> = {
  sh: 'bash', zsh: 'bash', shellscript: 'bash', terminal: 'bash',
  javascript: 'js', typescript: 'ts',
  yml: 'yaml', md: 'markdown', py: 'python',
  text: 'plaintext', txt: 'plaintext', plain: 'plaintext', '': 'plaintext',
};

const CSS_VAR_THEME = {
  name: 'fsv-tokens',
  type: 'dark' as const,
  fg: 'var(--code-fg)',
  bg: 'var(--code-bg)',
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: 'var(--code-comment)', fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string', 'meta.attribute-selector'], settings: { foreground: 'var(--code-string)' } },
    { scope: ['keyword', 'keyword.control', 'keyword.operator.new', 'storage', 'storage.type', 'storage.modifier'], settings: { foreground: 'var(--code-keyword)' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'variable.function'], settings: { foreground: 'var(--code-function)' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'keyword.other.unit'], settings: { foreground: 'var(--code-number)' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: 'var(--code-type)' } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.definition.variable'], settings: { foreground: 'var(--code-variable)' } },
    { scope: ['entity.name.tag', 'punctuation.definition.tag'], settings: { foreground: 'var(--code-tag)' } },
    { scope: ['entity.other.attribute-name', 'support.type.property-name'], settings: { foreground: 'var(--code-attr)' } },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator', 'punctuation.terminator'], settings: { foreground: 'var(--code-punctuation)' } },
    { scope: ['markup.inserted', 'meta.diff.header.to-file'], settings: { foreground: 'var(--code-added)' } },
    { scope: ['markup.deleted', 'meta.diff.header.from-file'], settings: { foreground: 'var(--code-removed)' } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: 'var(--code-invalid)' } },
  ],
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  // Module-level singleton — createHighlighter loads every grammar in LANGS,
  // which is expensive. One instance serves the whole build.
  highlighterPromise ??= createHighlighter({
    themes: [CSS_VAR_THEME],
    langs: [...LANGS],
  });
  return highlighterPromise;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Normalize a fence language onto a grammar we actually loaded. */
export function resolveLang(raw?: string | null): string {
  const key = (raw ?? '').trim().toLowerCase();
  const mapped = ALIASES[key] ?? key;
  return (LANGS as readonly string[]).includes(mapped) ? mapped : 'plaintext';
}

/**
 * Highlight `code` and return Shiki's `<pre>` markup.
 *
 * Never throws — an unknown grammar or a Shiki failure degrades to escaped
 * plain text in the same wrapper, so one bad fence can't fail a build.
 */
export async function highlightCode(code: string, lang?: string | null): Promise<string> {
  const resolved = resolveLang(lang);
  const plain = () =>
    `<pre class="shiki fsv-tokens" style="background-color:var(--code-bg);color:var(--code-fg)" tabindex="0"><code>${escapeHtml(code)}</code></pre>`;

  if (resolved === 'plaintext') return plain();

  try {
    const hl = await getHighlighter();
    return hl.codeToHtml(code, { lang: resolved, theme: 'fsv-tokens' });
  } catch (err) {
    console.warn(`[code-highlight] fell back to plain text for lang="${lang}":`, err);
    return plain();
  }
}
