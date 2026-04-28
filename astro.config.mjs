import { defineConfig, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import svelte from '@astrojs/svelte';
import db from '@astrojs/db';
import path from 'path';

// Load .env into process.env so server endpoints can read non-PUBLIC_ vars
// (OAuth secrets, JWT signing key) the same way in dev and production.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

export default defineConfig({
  site: 'https://fullstack-vc.com',
  base: '/',
  trailingSlash: 'ignore',

  // Server output with the Vercel adapter — required for the OAuth callback +
  // /api/* server endpoints. All marketing/content pages opt back into static
  // generation via `export const prerender = true;` at the top of each page.
  output: 'server',
  adapter: vercel(),

  // Svelte islands for the interactive bits — StackBuilder is the first one.
  // Astro DB powers the live polling layer (see context-v/blueprints/
  // Maintain-an-Interactive-Polling-System--v2.md §8). Local dev uses a
  // libSQL file in .astro/content.db; production wires to Turso via
  // ASTRO_DB_REMOTE_URL + ASTRO_DB_APP_TOKEN env vars.
  integrations: [db(), svelte()],

  // Astro 6 stable Fonts API. Emits @font-face + the named CSS variables that
  // theme.css's Tier 2 semantic tokens (--font-display/-body/-code) reference.
  // Don't redeclare these `--font__*` names anywhere else — Astro owns them.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font__inter',
      weights: [400, 600, 700],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Space Grotesk',
      cssVariable: '--font__space-grotesk',
      weights: [600, 700],
      subsets: ['latin'],
      fallbacks: ['Inter', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font__jetbrains-mono',
      weights: [400, 600],
      subsets: ['latin'],
      fallbacks: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
  ],

  server: {
    port: 4324,
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@layouts': path.resolve('./src/layouts'),
        '@components': path.resolve('./src/components'),
        '@utils': path.resolve('./src/utils'),
        '@styles': path.resolve('./src/styles'),
      },
    },
    server: {
      fs: {
        allow: ['../..'],
      },
    },
  },
});
