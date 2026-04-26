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

export const collections = {
  pages,
  webinars,
  changelog,
};
