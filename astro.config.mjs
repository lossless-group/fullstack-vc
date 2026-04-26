import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  site: 'https://fullstack-vc.com',
  base: '/',
  trailingSlash: 'ignore',

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
