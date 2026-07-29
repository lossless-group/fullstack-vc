// scripts/db-execute.mjs — shim for `astro db execute` under Astro 7.
//
// Astro 7 dropped the CLI delegation that routed `astro db <cmd>` to
// @astrojs/db, so every `astro db execute ...` script in package.json broke
// after the Astro 7 upgrade. @astrojs/db still ships its full CLI internally;
// this shim calls it directly with a synthesized flags/config pair.
//
// Usage:
//   node --env-file=.env scripts/db-execute.mjs <script.ts> [--remote]
//
// Notes:
//   - The executed script must `export default async function () { ... }`
//     (top-level-await scripts error with EXEC_DEFAULT_EXPORT_ERROR).
//   - --remote needs ASTRO_DB_REMOTE_URL + ASTRO_DB_APP_TOKEN in the env,
//     hence `--env-file=.env` in the package.json invocations.

import { pathToFileURL } from 'node:url';

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: node scripts/db-execute.mjs <script.ts> [--remote]');
  process.exit(1);
}
const remote = process.argv.includes('--remote');

const cliUrl = new URL(
  '../node_modules/@astrojs/db/dist/core/cli/index.js',
  import.meta.url,
);
const { cli } = await import(cliUrl.href);

// Mimic the argv shape the real `astro db execute <file>` produced:
// flags._ = [node, astro, 'db', 'execute', <file>]
const flags = {
  _: ['node', 'astro', 'db', 'execute', fileArg],
  remote,
};

// resolveDbConfig() only reads `root` and `integrations` off the Astro
// config; none of this repo's integrations register astro:db:setup hooks.
const astroConfig = {
  root: pathToFileURL(process.cwd() + '/'),
  integrations: [],
};

await cli({ flags, config: astroConfig });
