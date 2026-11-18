// Build the Pagefind index from the records `astro build` prerendered at
// /search-records.json, and write it where the palette looks for it (/pagefind/).
// Runs after `astro build`; see src/pages/search-records.json.ts for why the
// records are not crawled from HTML. Ported from sites/lossless-toolkit-site.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as pagefind from 'pagefind';

//
// Dev mode (`pnpm search:dev`, with `pnpm dev` running): pass the dev server's
// records URL as SEARCH_RECORDS_URL and the index lands in public/pagefind/
// (gitignored), so the palette works without a production build.
const DEV_URL = process.env.SEARCH_RECORDS_URL;

// The Vercel adapter copies static output to .vercel/output/static; dist/client
// is the pre-adapter copy. Write the index to whichever the deploy serves.
const STATIC = DEV_URL
  ? ['public']
  : ['.vercel/output/static', 'dist/client'].filter((d) => existsSync(`${d}/search-records.json`));
if (!STATIC.length) throw new Error('no search-records.json — run `astro build` first');

const records = DEV_URL
  ? await (await fetch(DEV_URL)).json()
  : JSON.parse(await readFile(`${STATIC[0]}/search-records.json`, 'utf8'));
const { index } = await pagefind.createIndex();
for (const r of records) {
  const { errors } = await index.addCustomRecord({ ...r, language: 'en' });
  if (errors.length) throw new Error(`${r.url}: ${errors.join('; ')}`);
}
for (const dir of STATIC) await index.writeFiles({ outputPath: `${dir}/pagefind` });
await pagefind.close();
console.log(`pagefind: ${records.length} records → ${STATIC.map((d) => `${d}/pagefind`).join(', ')}`);
