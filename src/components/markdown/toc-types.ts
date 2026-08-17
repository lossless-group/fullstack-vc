/**
 * toc-types.ts — outline shaping for TableOfContents.astro.
 *
 * `tree.data.headings` from LFM's `remarkHeadingIds` is a FLAT array carrying
 * `depth`. Every consumer that renders a ToC writes the same flat-to-tree fold,
 * which is why it's proposed for the package itself — see
 * `lfm/context-v/issues/Heading-Outline-Cannot-Distinguish-Container-Headings.md`.
 * Until that lands, it lives here. Keep it pure so the move is a deletion.
 */

/** Mirrors LfmHeading from @lossless-group/lfm ≥0.4.0. */
export interface TocHeading {
  id: string;
  text: string;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  duplicateOf?: string;
  synthetic?: boolean;
}

export interface TocNode extends TocHeading {
  children: TocNode[];
}

/**
 * Fold a flat outline into a tree.
 *
 * Handles the cases a naive implementation gets wrong:
 *   - a document that opens at h3 rather than h2
 *   - a jump from h2 straight to h4 (no phantom h3 is invented; the h4
 *     attaches to the nearest shallower ancestor)
 *   - a trailing deep heading with nothing after it
 */
export function nestHeadings(headings: TocHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const h of headings) {
    const node: TocNode = { ...h, children: [] };
    // Unwind to the nearest strictly-shallower heading.
    while (stack.length && stack[stack.length - 1].depth >= node.depth) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

/**
 * Trim the outline to a usable depth band before nesting.
 *
 * `synthetic` entries are dropped: their text slugified to nothing, so there is
 * no useful label to show. Their anchor still exists in the document — this
 * only decides what appears in the ToC.
 */
export function filterHeadings(
  headings: TocHeading[],
  minDepth = 2,
  maxDepth = 3
): TocHeading[] {
  return headings.filter(
    (h) => !h.synthetic && h.depth >= minDepth && h.depth <= maxDepth
  );
}

/** Flatten a nested outline back to document order — the scrollspy's watch list. */
export function flattenIds(nodes: TocNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    acc.push(n.id);
    flattenIds(n.children, acc);
  }
  return acc;
}
