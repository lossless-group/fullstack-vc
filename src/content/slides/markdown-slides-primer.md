---
title: "Markdown slides, a primer"
description: "How to author slides in plain markdown — separators, nested slides, fragments, and notes."
date: "2026-04-29"
---

# Markdown slides, a primer

How to author Reveal.js decks in plain markdown.

A horizontal rule separates slides. Two dashes (`--`) make a vertical /
nested slide. `Note:` blocks become speaker notes.

---

## Separators

A line with three dashes (`---`) splits two slides horizontally.

A line with two dashes (`--`) creates a *nested* slide — useful for
"deep dives" you can navigate down into.

---

## Lists work the way you'd expect

- Plain bullets are unsurprising.
- **Bold**, *italic*, and `inline code` all render.
- You can include [links](https://fullstack-vc.com).

--

### Nested slide

You arrived here by pressing the *down* arrow on the previous slide.

Press *down* again to see the next nested slide, or *right* to skip
this branch.

--

### Another nested slide

This is the third nested slide under "Lists work the way you'd expect."

---

## Code blocks

```ts
import { parseMarkdown } from '@lossless-group/lfm';

const tree = await parseMarkdown(content);
console.log(tree);
```

Highlight.js takes care of syntax coloring.

---

## Quotes

> The best slide deck is one you can edit in a plain text editor on a
> plane with no internet.

— probably someone

---

## Speaker notes

Press `S` to open the speaker-notes window. Anything after a `Note:`
marker is hidden from the audience and shown only on the speaker view.

Note:
This block is the speaker note for the previous slide. Use it to remind
yourself of the punchline, the data point you almost forgot, or the
anecdote that lands the section.

---

## That's the whole spec

Drop a markdown file in `src/content/slides/<slug>.md`. Visit
`/slides/<slug>`. Done.
