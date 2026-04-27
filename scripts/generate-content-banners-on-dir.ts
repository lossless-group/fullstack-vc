// ============================================================================
// generate-content-banners-on-dir.ts
//
// Generic per-file OG banner generator. Walks every .md in INPUT_DIR, reads
// `image_prompt` from frontmatter, runs Ideogram's Generate → Layerize Text
// pipeline at OG aspect (16:9 → 1280×720), saves the clean PNG to OUTPUT_DIR,
// and writes the resulting public path back to the file's `og_image:` field.
//
// Title text is NOT baked into the image — pages composite their own title via
// HTML/CSS overlay (see BannerWithOverlay.astro for the pattern).
//
// Run:
//   pnpm --filter fullstack-vc gen:content-banners
//
// Override config without editing the file:
//   INPUT_DIR=src/content/.../some-other-dir/ \
//   OUTPUT_DIR=public/og/some-other-dir/      \
//   OVERRIDE=true                              \
//   pnpm --filter fullstack-vc gen:content-banners
//
// Behavior:
//   - Files lacking `image_prompt:` are skipped with a note.
//   - When OVERRIDE_CURRENT_VALUES=false (default), files whose frontmatter
//     already has `og_image: "..."` are skipped — change a prompt and flip
//     OVERRIDE=true to force a regen.
//   - Output filenames are `{slug}__{hash}.png` where hash is of the full
//     wrapped prompt — so prompt edits change the filename and a stale PNG
//     is left behind (delete OUTPUT_DIR if you want a clean slate).
//
// Cost: ~$0.12–0.18 per generated banner (QUALITY tier + Layerize).
// ============================================================================

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { generateAndLayerize, IdeogramApiError } from '../src/utils/api-connectors/ideogram.ts';
import { readNamedColors, getNamedColor } from '../src/lib/theme-tokens.ts';

// ============================================================================
// CONFIGURATION — edit defaults here, or override per-run via env vars
// ============================================================================

const INPUT_DIR = process.env.INPUT_DIR
  ? resolveCli(process.env.INPUT_DIR)
  : new URL('../src/content/long-form/venture-workflows/', import.meta.url).pathname;

const OUTPUT_DIR = process.env.OUTPUT_DIR
  ? resolveCli(process.env.OUTPUT_DIR)
  : new URL('../public/og/venture-workflows/', import.meta.url).pathname;

// When true, regenerate every file regardless of whether its frontmatter
// already has an `og_image:` value. When false (default), skip files that
// already have one — useful for incrementally backfilling new chapters.
const OVERRIDE_CURRENT_VALUES = process.env.OVERRIDE === 'true';

// All output PNGs must live somewhere under public/ so they're served at a
// stable URL. The public URL written into `og_image:` is derived from this.
const PUBLIC_ROOT = new URL('../public/', import.meta.url).pathname;

// ============================================================================
// PROMPT WRAPPER — same brand contract as changelog + og-default scripts.
// Centralizing here would be nicer, but cross-script imports complicate the
// `node --experimental-strip-types` invocation. Three copies, one source of
// truth (theme.css → readNamedColors).
// ============================================================================

const PROMPT_PALETTE: Array<{ token: string; label: string; role: string }> = [
  { token: 'violet-electric', label: 'violet',   role: 'primary'    },
  { token: 'lime-terminal',   label: 'lime',     role: 'accent'     },
  { token: 'cyan-vapor',      label: 'cyan',     role: 'secondary'  },
  { token: 'obsidian',        label: 'obsidian', role: 'background' },
  { token: 'bone',            label: 'bone',     role: 'highlights' },
];

function buildStylePrompt(subject: string, palette: Record<string, string>): string {
  const colorList = PROMPT_PALETTE
    .map(p => `${p.label} ${getNamedColor(palette, p.token)} (${p.role})`)
    .join(', ');
  return [
    subject + '.',
    'Do not include any text, letterforms, words, captions, signs, or labels.',
    'Style: isometric vector illustration, devtools-meets-dojo aesthetic.',
    `Color palette: ${colorList}.`,
    'Soft gradients, subtle glow, cinematic composition, no people, no faces.',
  ].join(' ');
}

// ============================================================================
// HELPERS
// ============================================================================

// Allow env-var overrides to be either absolute or repo-relative ("public/...")
function resolveCli(value: string): string {
  if (value.startsWith('/')) return value.endsWith('/') ? value : value + '/';
  const base = new URL('../', import.meta.url).pathname;
  const joined = join(base, value);
  return joined.endsWith('/') ? joined : joined + '/';
}

function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

interface Frontmatter {
  image_prompt?: string;
  og_image?: string;
  [key: string]: unknown;
}

// Minimal line-oriented frontmatter parse. Same approach as the changelog
// generator — fine for top-level scalar fields, ignores nested lists.
function parseFrontmatter(md: string): Frontmatter {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Frontmatter = {};
  for (const line of m[1].split('\n')) {
    if (/^\s+-\s/.test(line)) continue;
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value: string | undefined = kv[2].trim();
    if (value === '') continue;
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fm[kv[1]] = value;
  }
  return fm;
}

// Insert/update an `og_image:` field in the frontmatter block. Inserts right
// after `image_prompt:` if present, otherwise appends. Returns true if the
// file actually changed.
function writeOgImageToFrontmatter(mdPath: string, imageUrl: string): boolean {
  const md = readFileSync(mdPath, 'utf8');
  const fmMatch = md.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!fmMatch) return false;
  const [, opener, fmBody, closer, body] = fmMatch;

  let newFmBody: string;
  if (/^og_image:\s/m.test(fmBody)) {
    newFmBody = fmBody.replace(/^og_image:\s.*$/m, `og_image: "${imageUrl}"`);
  } else if (/^image_prompt:/m.test(fmBody)) {
    newFmBody = fmBody.replace(/^(image_prompt:.*)$/m, `$1\nog_image: "${imageUrl}"`);
  } else {
    newFmBody = fmBody + `\nog_image: "${imageUrl}"`;
  }

  if (newFmBody === fmBody) return false;
  writeFileSync(mdPath, opener + newFmBody + closer + body);
  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!process.env.IDEOGRAM_API_KEY) {
    console.error('✗ IDEOGRAM_API_KEY is not set. Add it to sites/fullstack-vc/.env');
    process.exit(1);
  }

  // Sanity: OUTPUT_DIR must live under public/ so we can derive a public URL.
  const outRelToPublic = relative(PUBLIC_ROOT, OUTPUT_DIR);
  if (outRelToPublic.startsWith('..') || outRelToPublic === '') {
    if (outRelToPublic !== '') {
      console.error(`✗ OUTPUT_DIR must be inside public/. Got: ${OUTPUT_DIR}`);
      process.exit(1);
    }
  }
  const publicUrlBase = '/' + outRelToPublic.replace(/\\/g, '/').replace(/\/$/, '') +
    (outRelToPublic === '' ? '' : '/');

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const palette = readNamedColors();
  console.log(`Loaded ${Object.keys(palette).length} brand colors from theme.css`);
  console.log(`Input:  ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Override existing og_image values: ${OVERRIDE_CURRENT_VALUES}`);
  console.log('');

  const entries = readdirSync(INPUT_DIR).filter(f => f.endsWith('.md'));
  if (entries.length === 0) {
    console.log('No markdown files found.');
    return;
  }

  let generated = 0, skippedHasOg = 0, skippedCached = 0, missingPrompt = 0, failed = 0;

  for (const entry of entries) {
    const slug = basename(entry, '.md');
    const mdPath = join(INPUT_DIR, entry);
    const md = readFileSync(mdPath, 'utf8');
    const fm = parseFrontmatter(md);

    if (!fm.image_prompt) {
      console.log(`⊘ ${slug}: no image_prompt in frontmatter — skipped`);
      missingPrompt++;
      continue;
    }

    if (!OVERRIDE_CURRENT_VALUES && fm.og_image) {
      console.log(`⊘ ${slug}: already has og_image — skipped (set OVERRIDE=true to regenerate)`);
      skippedHasOg++;
      continue;
    }

    const fullPrompt = buildStylePrompt(fm.image_prompt, palette);
    const hash = shortHash(fullPrompt);
    const fileName = `${slug}__${hash}.png`;
    const outFile = join(OUTPUT_DIR, fileName);
    const publicUrl = publicUrlBase + fileName;

    if (existsSync(outFile) && !OVERRIDE_CURRENT_VALUES) {
      console.log(`✓ ${slug}: cached PNG (${hash}) — skipped, backfilling frontmatter`);
      if (writeOgImageToFrontmatter(mdPath, publicUrl)) {
        console.log(`  ↳ frontmatter og_image: ${publicUrl}`);
      }
      skippedCached++;
      continue;
    }

    process.stdout.write(`→ ${slug}: generating + layerizing (${hash})... `);
    try {
      const { image, generate: g } = await generateAndLayerize({
        prompt: fullPrompt,
        aspectRatio: '16x9',
        renderingSpeed: 'QUALITY',
        styleType: 'DESIGN',
        magicPrompt: 'OFF',
      });
      writeFileSync(outFile, image);
      console.log(`done (seed ${g.seed})`);
      if (writeOgImageToFrontmatter(mdPath, publicUrl)) {
        console.log(`  ↳ frontmatter og_image: ${publicUrl}`);
      }
      generated++;
    } catch (err) {
      console.log('FAILED');
      if (err instanceof IdeogramApiError) {
        console.error(`  ${err.endpoint} returned ${err.status}: ${err.body.slice(0, 200)}`);
      } else {
        console.error(`  ${(err as Error).message}`);
      }
      failed++;
    }
  }

  console.log('');
  console.log(
    `Generated: ${generated}  ` +
    `Skipped (had og_image): ${skippedHasOg}  ` +
    `Skipped (cached PNG): ${skippedCached}  ` +
    `No prompt: ${missingPrompt}  ` +
    `Failed: ${failed}`
  );
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
