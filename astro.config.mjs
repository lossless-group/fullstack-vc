import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
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
