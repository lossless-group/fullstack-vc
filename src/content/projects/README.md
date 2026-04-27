---
title: "Projects collection"
description: "Content collection for FullStack VC working-group projects (active, proposed, archived)."
date_posted: 2026-04-27
---

# `projects/` — content collection

Working-group projects in the FullStack VC peer learning community.

## Authoring

The directory (`active/`, `proposed/`, `archived/`) is **for authoring ergonomics only**. The `status` field in frontmatter is the source of truth for filtering and rendering.

```yaml
---
title: "My Project"
slug: "my-project"        # optional; auto from filename if omitted
lede: "One-sentence pitch."
status: active            # 'active' | 'proposed' | 'archived'
working_group_leads:
  - name: "Lead Name"
cadence: "Bi-weekly · Tuesdays 11:00 PT"
tags: [Train-Case-Tag, Another-Tag]
icon: "🌾"                # emoji or icon path
feature_in_popdown: true  # show in header JumboPopdown__Projects
popdown_order: 1          # sort order within the popdown
---
```

See `src/content.config.ts` for the full Zod schema.

## Render targets

- **Index gallery** — `/projects/` renders three sections (active, proposed, archived) via `Section__ProjectGallery.astro`.
- **Detail pages** — `/projects/[slug]/` renders one entry via `projects/[slug].astro` using the LFM markdown pipeline.
- **Header popdown** — `JumboPopdown__Projects.astro` surfaces the most recent active (and optionally proposed) projects from any page.
