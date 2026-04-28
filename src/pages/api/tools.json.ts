// /api/tools.json — flat JSON of the tools registry for StackBuilder typeahead.
// Static at build time; cheap to serve.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  const tools = await getCollection('tools');
  const compact = tools
    .map(t => ({
      slug: t.id,
      site_name: t.data.site_name,
      title: t.data.title,
      zinger: t.data.zinger,
      og_favicon: t.data.og_favicon ?? t.data.favicon,
      tags: t.data.tags ?? [],
    }))
    .sort((a, b) => (a.site_name ?? a.slug).localeCompare(b.site_name ?? b.slug));

  return new Response(JSON.stringify(compact), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
