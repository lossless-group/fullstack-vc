---
title: "Working Groups collection"
description: "Content collection for FullStack VC working groups — long-lived theme/challenge-based communities of practice."
date_posted: 2026-04-27
---

# `working-groups/` — content collection

Long-lived theme/challenge-based communities of practice. Each working group has 1–3 active projects at any time; over time it shelves projects, idles them, or starts new ones. Working Groups outlast Projects.

## Authoring

The directory (`active/`, `proposed/`, `archived/`) is **for authoring ergonomics only**. The `status` field in frontmatter is the source of truth for filtering.

```yaml
---
title: "Data-Driven Venture"
slug: "data-driven-venture"
lede: "One-sentence pitch."
status: active            # 'active' | 'proposed' | 'archived'
working_group_leads:
  - name: "Lead Name"
cadence: "Bi-weekly · Tuesdays 11:00 PT"
tags: [Train-Case-Tag, Another-Tag]
icon: "📊"
feature_in_popdown: true
popdown_order: 1
---
```

Schema is currently a clone of the `projects` collection (see `src/content.config.ts`). It will diverge as the surface matures — we customize fields as we go.

## Project ↔ Working Group relationship

A project belongs to one or more working groups via the project's frontmatter:

```yaml
# In src/content/projects/active/some-project.md
working_group_slugs:
  - data-driven-venture
  - tech-stack-deep-dives
```

The project file is the **authoritative source of truth** for membership. WG pages query projects whose `working_group_slugs` includes the WG's slug. Many-to-many is supported (a project can be of interest to multiple WGs).

## Render targets

- **Index gallery** — `/working-groups/` renders three sections (active, proposed, archived) via `Section__WorkingGroupGallery.astro`.
- **Detail pages** — `/working-groups/[slug]/` renders one entry plus a rail of its current projects (via `Section__ProjectGallery variant="lite"`) and the LFM-rendered charter body.
- **Header popdown** — `JumboPopdown__WorkingGroups.astro` surfaces working groups from any page, sibling to the existing Projects popdown.
