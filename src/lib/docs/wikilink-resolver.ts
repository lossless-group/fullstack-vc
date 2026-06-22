/**
 * Minimal wikilink resolver for the two-perspective how-to engine (preview).
 * Maps the prefixes the docs content actually uses:
 *   [[use-cases/<slug>/index|Display]] → /use-cases/<slug>
 *   [[guides/<slug>/index|Display]]    → /guides/<slug>
 *   [[tools/<handle>|Display]]         → /tools/<handle> (INTERNAL, first preference);
 *                                        falls back to the tool's external url only
 *                                        for handles not in our registry.
 *   [[people/<handle>]] or [[<handle>]]→ /people/<handle>
 * Anything else returns null → LFM renders the display text as plain text (graceful).
 *
 * This is a deliberately small stand-in; the real resolver is a spec deliverable
 * (see context-v/specs/Two-Perspective-How-To-Docs-Engine-on-LFM.md).
 */

export type ToolUrlMap = Record<string, string | undefined>;

export interface DocsResolverOptions {
  /** Handles that have an internal /tools/<handle> page (the registry). */
  toolHandles?: Set<string>;
  /** Fallback external urls for tool handles NOT in the registry. */
  toolUrls?: ToolUrlMap;
}

interface WikilinkResolverInput {
  path: string;
  anchor: string | null;
  display: string | null;
  raw: string;
}

interface WikilinkResolution {
  url: string;
  isLocal: boolean;
  display: string;
  classes?: string[];
}

function deslug(path: string): string {
  const last = path.split('/').filter(Boolean).pop() ?? path;
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function makeDocsWikilinkResolver(opts: DocsResolverOptions = {}) {
  const toolHandles = opts.toolHandles ?? new Set<string>();
  const toolUrls = opts.toolUrls ?? {};

  return (input: WikilinkResolverInput): WikilinkResolution | null => {
    const p = input.path.replace(/\/index$/, '').trim();
    const display = input.display ?? deslug(p);

    if (p.startsWith('use-cases/') || p.startsWith('guides/')) {
      return { url: `/${p}`, isLocal: true, display };
    }
    if (p.startsWith('people/')) {
      return { url: `/${p}`, isLocal: true, display };
    }
    if (p.startsWith('tools/')) {
      const handle = p.slice('tools/'.length);
      // First preference: an internal page on our site.
      if (toolHandles.has(handle)) {
        return { url: `/tools/${handle}`, isLocal: true, display };
      }
      // Fallback: the tool's own site, only if we don't host a page for it.
      const url = toolUrls[handle];
      return url ? { url, isLocal: false, display } : null;
    }
    if (!p.includes('/')) {
      // bare token — treat as a participant handle
      return { url: `/people/${p}`, isLocal: true, display };
    }
    return null;
  };
}
