/**
 * Site-level SEO registry — minimal, single source of truth for the values
 * the llms.txt endpoints (and any future SEO util) need to read at build
 * time. Today the BoilerPlateHTML.astro layout still hardcodes title/desc
 * defaults; this file is intentionally narrow so it can grow into the full
 * SITE_SEO shape (defaultTitle, defaultDescription, defaultImage, etc.) on
 * demand without forcing a sweep of layouts.
 */

export interface SiteSEO {
  siteName: string;
  baseUrl?: string;
}

export const SITE_SEO: SiteSEO = {
  siteName: 'FullStack VC',
  baseUrl: import.meta.env.SITE ?? 'https://fullstack-vc.com',
};
