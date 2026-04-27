import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date_posted: z.coerce.date().optional(),
  }),
});

const webinars = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/webinars' }),
  schema: z.object({
    title: z.string(),
    lede: z.string().optional(),
    date_scheduled: z.coerce.date(),
    date_posted: z.coerce.date().optional(),
    durationMinutes: z.number().optional(),
    presenters: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    rsvpUrl: z.string().url().optional(),
    recordingUrl: z.string().url().optional(),
    // status is NOT in frontmatter — derived at render time from date_scheduled.
    // See: src/lib/webinar-status.ts
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './changelog' }),
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
  }),
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
      profile: z.string().url().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    working_group_members: z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().url().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    members_count:         z.number().optional(),
    cadence:               z.string().optional(),
    rsvp_url:              z.string().url().optional(),

    // Cross-collection back-reference — slug(s) into the working-groups
    // collection. Many-to-many: a project can be of interest to multiple WGs.
    // Optional; projects without this field are not associated with any WG.
    working_group_slugs:   z.array(z.string()).optional(),

    // External surfaces
    links: z.object({
      repo:   z.string().url().optional(),
      site:   z.string().url().optional(),
      demo:   z.string().url().optional(),
      figma:  z.string().url().optional(),
      spec:   z.string().url().optional(),
      notes:  z.string().url().optional(),
      videos: z.array(z.string().url()).optional(),
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
      profile: z.string().url().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    working_group_members: z.array(z.object({
      uuid:    z.string().optional(),
      name:    z.string(),
      role:    z.string().optional(),
      profile: z.string().url().optional(),
      avatar:  z.string().optional(),
    })).optional(),
    members_count:         z.number().optional(),
    cadence:               z.string().optional(),
    rsvp_url:              z.string().url().optional(),

    // External surfaces
    links: z.object({
      repo:   z.string().url().optional(),
      site:   z.string().url().optional(),
      demo:   z.string().url().optional(),
      figma:  z.string().url().optional(),
      spec:   z.string().url().optional(),
      notes:  z.string().url().optional(),
      videos: z.array(z.string().url()).optional(),
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
  webinars,
  changelog,
  ventureWorkflows,
  projects,
  workingGroups,
};
