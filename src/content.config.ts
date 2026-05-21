import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    lede: z.string().optional(),
    last_updated: z.coerce.date().optional(),
  }),
});

// Tools — the canonical registry of apps/services that participants reference
// in their stacks. Schema is a strict superset of the Lossless Obsidian
// Tooling/* frontmatter (Jina + OpenGraph fetch pipeline) so files can be
// copy-pasted in unchanged. Slug = filename (lowercase-dasherized) is the URL.
const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    site_uuid: z.string().optional(),
    site_name: z.string().optional(),
    title: z.string().optional(),
    zinger: z.string().optional(),
    url: z.string().optional(),
    url_aliases: z.array(z.string()).optional(),

    tags: z.array(z.string()).optional(),
    category: z.string().optional(),

    og_screenshot_url: z.string().optional(),
    og_favicon: z.string().optional(),
    og_image: z.string().optional(),
    logo_light: z.string().optional(),
    logo_dark: z.string().optional(),

    // Bare-name aliases — the Lossless Obsidian Tooling frontmatter uses
    // these instead of the `og_*` forms. Both are accepted so paste-import
    // works without renaming; renderers fall back from og_* → bare name.
    image: z.string().optional(),
    favicon: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    hero_image_url: z.string().optional(),

    description_site_cp: z.string().optional(),
    description: z.string().optional(),
    og_title: z.string().optional(),
    og_url: z.string().optional(),

    jina_last_request: z.coerce.date().optional(),
    jina_error: z.string().optional(),
    og_last_fetch: z.coerce.date().optional(),
    date_modified: z.coerce.date().optional(),
    date_created: z.coerce.date().optional(),

    oss: z.boolean().optional(),
    pricing: z.string().optional(),
    publish: z.boolean().optional(),
    product_of: z.string().optional(),
    docs_url: z.string().optional(),
    github_profile_url: z.string().optional(),
    github_repo_url: z.string().optional(),
    youtube_channel_url: z.string().optional(),
  }).passthrough(),
});

// Participants — Dojo community members. Slim schema for the v0.1 vertical
// slice; the OAuth handshake doesn't depend on any of these fields, but the
// `/stack/people/[handle]` and `/stack/people` index pages do.
const participants = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/participants' }),
  schema: z.object({
    handle: z.string(),
    name: z.string(),
    firm: z.string().optional(),
    role: z.string().optional(),
    kauffman_class: z.number().nullable().optional(),
    github: z.string().optional(),
    github_avatar: z.string().optional(),
    // Local headshot path — takes priority over github_avatar when set.
    // Lives under /public/images/participant-headshots/.
    headshot: z.string().optional(),
    linkedin: z.string().optional(),
    // Directory profile URLs follow the `directory_profile_{slug}` convention
    // so we can add new directories (e.g., directory_profile_endeavor,
    // directory_profile_techstars) without inventing one-off field names.
    directory_profile_kauffman: z.string().optional(),
    publish: z.boolean().default(false),
    joined_dojo: z.coerce.date().optional(),

    current_stack: z.array(z.object({
      tool: z.string(),
      added: z.coerce.date().optional(),
      notes: z.string().optional(),
    })).optional(),
    aspirational_stack: z.array(z.object({
      tool: z.string(),
      intent: z.string().optional(),
    })).optional(),
    abandoned_stack: z.array(z.object({
      tool: z.string(),
      abandoned: z.coerce.date().optional(),
      reason: z.string().optional(),
    })).optional(),
  }),
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    title: z.string(),
    lede: z.string().optional(),
    date_scheduled: z.coerce.date(),
    date_posted: z.coerce.date().optional(),
    durationMinutes: z.number().optional(),
    hosts: z.array(z.string()).optional(),
    presenters: z.array(z.string()).optional(),
    // Richer presenter blocks driving the avatar-card section. When present,
    // the page renders these as a card list and suppresses the simple "With"
    // text row. Each entry can carry a topic (the demo they're presenting on).
    presenterDetails: z.array(z.object({
      name: z.string(),
      firm: z.string().optional(),
      role: z.string().optional(),
      headshot: z.string().optional(),
      linkedin: z.string().optional(),
      topic: z.string().optional(),
    })).optional(),
    tags: z.array(z.string()).optional(),
    // High-level session-type classifiers (e.g., "All-Hands", "Setupathons",
    // "Workshop"). Distinct from `tags` (free-form topical) — classifiers are
    // a small, intentional vocabulary the site can render as section headers
    // or filter facets. Train-Case values, same convention as tags.
    classifiers: z.array(z.string()).optional(),
    rsvpUrl: z.string().optional(),
    recordingUrl: z.string().optional(),
    og_image: z.string().optional(),
    // Partner co-branding mark (e.g., Kauffman Fellows). When set, the page
    // renders a mode-aware logo block at the top of the article.
    partnerMark: z.object({
      name: z.string(),
      light: z.string(),
      dark: z.string(),
      vibrant: z.string(),
      url: z.string().optional(),
    }).optional(),
    // When true, the session is excluded from /sessions/ listing pages but
    // remains accessible at its direct URL. Use for QA / dry-run sessions.
    unlisted: z.boolean().optional(),
    // status is NOT in frontmatter — derived at render time from date_scheduled.
    // See: src/lib/webinar-status.ts
  }),
});

const changelog = defineCollection({
  // Per-ship notes. Excludes releases/** — those have richer semantics
  // (versions, prior-release cross-refs, multi-date lifecycle) and live in
  // their own `releases` collection below.
  loader: glob({ pattern: ['**/*.md', '!releases/**'], base: './changelog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    authors: z.array(z.string()).optional(),
    augmented_with: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    files_modified: z.array(z.string()).optional(),
    image: z.string().optional(),         // populated by scripts/generate-changelog-banners.ts
    image_prompt: z.string().optional(),  // input to the banner generator
    image_text: z.string().optional(),    // composited as HTML overlay by BannerWithOverlay
  }).passthrough(),
});

// Tagged-release narratives. Shape differs from changelog: identified by
// semantic version (not date), cross-referenced to a prior release + the
// GitHub release URL, with a four-date authoring lifecycle (initial draft →
// current draft → first published → last updated). Bodies are long narratives
// with diff tables and key-feature sections, written once per tagged release.
//
// Soft validation throughout per the no-hard-validation principle — title is
// the only required field. Everything else is optional + .passthrough() so
// authors can add new metadata without schema churn. Date fields use coerce
// + nullable + optional so missing / null / typo'd dates warn but don't break
// the build.
const releases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './changelog/releases' }),
  schema: z.object({
    title: z.string(),
    lede: z.string().optional(),
    // Authoring lifecycle — cite-wide convention. All optional + nullable
    // so a draft with only an initial-draft date validates the same as a
    // published release with all four set.
    date_authored_initial_draft: z.coerce.date().nullable().optional(),
    date_authored_current_draft: z.coerce.date().nullable().optional(),
    date_first_published: z.coerce.date().nullable().optional(),
    date_last_updated: z.coerce.date().nullable().optional(),
    // Identity / cross-references — strings so a release_tag like "v0.0.8"
    // and a semver-shaped "0.0.8" both validate, no .url() on release_url
    // (we stripped those earlier per the no-hard-validation sweep).
    at_semantic_version: z.string().optional(),
    release_tag: z.string().optional(),
    release_url: z.string().optional(),
    prior_release_tag: z.string().optional(),
    // Display + filtering
    status: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
    augmented_with: z.string().optional(),
    // Display imagery — optional, follows the same shape as changelog/.
    image: z.string().optional(),
    image_prompt: z.string().optional(),
    image_text: z.string().optional(),
  }).passthrough(),
});

const ventureWorkflows = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/long-form/venture-workflows' }),
  schema: z.object({
    chapter_number:                z.number(),
    title:                         z.string(),
    lede:                          z.string(),
    tags:                          z.array(z.string()).optional(),
    subsection_outline:            z.array(z.string()).optional(),
    published:                     z.boolean().default(false),
    date_authored:                 z.coerce.date().optional(),
    date_published:                z.coerce.date().nullable().optional(),
    date_modified:                 z.coerce.date().nullable().optional(),
    source_publication:            z.string().optional(),
    source_organization:           z.string().optional(),
    source_chapter_number:         z.number().optional(),
    source_chapter_title_original: z.string().optional(),
    chapter_eyebrow:               z.string().optional(),
    hero_image:                    z.string().optional(),
    hero_image_prompt:             z.string().optional(),
    og_image:                      z.string().optional(),
    summary:                       z.string().optional(),
    contributors:                  z.array(z.string()).optional(),
    language:                      z.string().default('en'),
  }).passthrough(),
});

const projects = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/README.md'], base: './src/content/projects' }),
  schema: z.object({
    // Identity
    title:                 z.string(),
    slug:                  z.string().optional(),
    lede:                  z.string(),
    summary:               z.string().optional(),
    scope:                 z.string().optional(),

    // Lifecycle
    status:                z.enum(['active', 'proposed', 'archived']),
    date_initiated:        z.coerce.date().optional(),
    date_archived:         z.coerce.date().optional(),
    date_last_activity:    z.coerce.date().optional(),

    // Working group
    working_group_name:    z.string().optional(),
    working_group_leads:   z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    working_group_members: z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    members_count:         z.number().optional(),
    cadence:               z.string().optional(),
    rsvp_url:              z.string().optional(),

    // Cross-collection back-reference — slug(s) into the working-groups
    // collection. Many-to-many: a project can be of interest to multiple WGs.
    // Optional; projects without this field are not associated with any WG.
    working_group_slugs:   z.array(z.string()).optional(),

    // External surfaces
    links: z.object({
      repo:   z.string().optional(),
      site:   z.string().optional(),
      demo:   z.string().optional(),
      figma:  z.string().optional(),
      spec:   z.string().optional(),
      notes:  z.string().optional(),
      videos: z.array(z.string()).optional(),
    }).optional(),

    // Discovery
    tags:                  z.array(z.string()).optional(),
    category:              z.string().optional(),
    origin:                z.string().optional(),

    // Display
    // - image_prompt: input to scripts/generate-content-banners-on-dir.ts
    //   (Ideogram → text-stripped 1280×720 PNG); the generator writes the
    //   resulting public path back to og_image. Edit the prompt to regenerate.
    // - og_image: generated banner path; used as the OG/Twitter share image.
    // - hero_image: a hand-set per-project banner override (rare; takes
    //   priority over og_image only when explicitly set).
    // - thumbnail: square card thumbnail (gallery uses banner aspect; thumbnail
    //   reserved for the future popdown thumbnail variant).
    image_prompt:          z.string().optional(),
    og_image:              z.string().optional(),
    hero_image:            z.string().optional(),
    thumbnail:             z.string().optional(),
    icon:                  z.string().optional(),
    banner_overlay:        z.enum(['gradient', 'scrim', 'none']).default('gradient'),
    card_accent:           z.string().optional(),

    // Behavior
    publish:               z.boolean().default(true),
    feature_in_popdown:    z.boolean().default(true),
    popdown_order:         z.number().optional(),

    // Authorship
    authors:               z.array(z.string()).optional(),
    augmented_with:        z.string().optional(),

    // Versioning
    at_semantic_version:   z.string().optional(),
    date_created:          z.coerce.date().optional(),
    date_modified:         z.coerce.date().optional(),
  }).passthrough(),
});

// Working Groups — long-lived theme/challenge-based communities of practice.
// Schema is cloned from `projects` so we can iterate the surface fast and
// customize fields as the surface matures (per the plan: "fix as we go").
// Fields like `working_group_leads`/`working_group_members` carry naturally
// — on a WG entry they're literally the WG's own roster.
const workingGroups = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/README.md'], base: './src/content/working-groups' }),
  schema: z.object({
    // Identity
    title:                 z.string(),
    slug:                  z.string().optional(),
    lede:                  z.string(),
    summary:               z.string().optional(),
    scope:                 z.string().optional(),

    // Lifecycle
    status:                z.enum(['active', 'proposed', 'archived']),
    date_initiated:        z.coerce.date().optional(),
    date_archived:         z.coerce.date().optional(),
    date_last_activity:    z.coerce.date().optional(),

    // Roster
    working_group_name:    z.string().optional(),
    working_group_leads:   z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    working_group_members: z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    members_count:         z.number().optional(),
    cadence:               z.string().optional(),
    rsvp_url:              z.string().optional(),

    // External surfaces
    links: z.object({
      repo:   z.string().optional(),
      site:   z.string().optional(),
      demo:   z.string().optional(),
      figma:  z.string().optional(),
      spec:   z.string().optional(),
      notes:  z.string().optional(),
      videos: z.array(z.string()).optional(),
    }).optional(),

    // Discovery
    tags:                  z.array(z.string()).optional(),
    category:              z.string().optional(),
    origin:                z.string().optional(),

    // Display
    image_prompt:          z.string().optional(),
    og_image:              z.string().optional(),
    hero_image:            z.string().optional(),
    thumbnail:             z.string().optional(),
    icon:                  z.string().optional(),
    banner_overlay:        z.enum(['gradient', 'scrim', 'none']).default('gradient'),
    card_accent:           z.string().optional(),

    // Behavior
    publish:               z.boolean().default(true),
    feature_in_popdown:    z.boolean().default(true),
    popdown_order:         z.number().optional(),

    // Authorship
    authors:               z.array(z.string()).optional(),
    augmented_with:        z.string().optional(),

    // Versioning
    at_semantic_version:   z.string().optional(),
    date_created:          z.coerce.date().optional(),
    date_modified:         z.coerce.date().optional(),
  }).passthrough(),
});

export const collections = {
  pages,
  sessions,
  changelog,
  releases,
  ventureWorkflows,
  projects,
  workingGroups,
  tools,
  participants,
};
