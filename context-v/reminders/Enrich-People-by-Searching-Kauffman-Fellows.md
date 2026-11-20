---
title: "Enrich People by Searching Kauffman Fellows"
lede: "When a Dojo person is missing a firm, role, LinkedIn or headshot, search their name with \"Kauffman Fellows\" and fill it in. Never report the gap."
date_authored_initial_draft: 2026-11-19
date_authored_current_draft: 2026-11-19
date_authored_final_draft:
date_first_published:
date_last_updated: 2026-11-19
at_semantic_version: 0.0.1.0
status: Active
augmented_with:
  - Claude Code on Claude Opus 5.5
category: Reminder
tags:
  - People
  - Enrichment
  - Kauffman-Fellows
  - Participants
authors:
  - Michael Staton
date_created: 2026-11-19
date_modified: 2026-11-19
publish: false
site_uuid: 59dea727-09dc-4f27-8298-3f2444320be1
hex_code: 07ozcp
---

# Enrich People by Searching Kauffman Fellows

Almost everyone in the Dojo is a Kauffman Fellow, and every Fellow has a public directory page. So a person with no firm, role, links or photo is a search away from a full profile. **Look it up yourself; don't hand the gap back to a human.**

## The steps

1. **Search** `"<Full Name>" Kauffman Fellows` (Firecrawl search, web source). The first results are usually the directory page and their LinkedIn.
2. **Scrape** `https://www.kauffmanfellows.org/fellows/<slug>`. It gives:
   - **Class** (`KF 24`) → `kauffman_class`
   - **Current Firm** → `firm`
   - **Professional** bio → `role` (their title at that firm)
   - the headshot URL (Webflow CDN, `.jpeg` or `.avif`)
3. **LinkedIn** from the same search results → `linkedin`. Normalize country subdomains (`pr.linkedin.com`, `il.linkedin.com`) to `www.linkedin.com`.
4. **Headshot**: download, convert with `sips -s format jpeg -Z 600` to `public/images/participant-headshots/headshot__First-Last.jpeg`, set `headshot:`.
5. **Fill the profile** in `src/content/participants/<handle>.md` (add `directory_profile_kauffman:` too), then run `pnpm db:link-participants` so the person's role and socials cards pick it up, and `pnpm db:audit-people` to confirm.

## Watch for

- **Search, don't guess the slug.** Our spelling can be wrong: "Shirly Schoenfeld" is `shirley-schoenfeld` in the directory. Fix the profile's `name`; the linker keeps the old spelling in `People.called`.
- **The directory can lag.** If the bio and the LinkedIn headline disagree on someone's current role, prefer LinkedIn and say which you chose.
- **Leave `publish` alone.** Filling a profile is not publishing it.
- **No emails from the web into the repo.** Addresses live only in Turso and `context-v/extra/`.

## Related

- [[People-and-Contact-Cards-for-Session-Registrations]]: the tables these profiles feed
