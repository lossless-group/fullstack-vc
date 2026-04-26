// ============================================================================
// generate-changelog-banners.ts
//
// Walks every changelog/*.md, reads its `image_prompt` from frontmatter,
// runs Ideogram's Generate → Layerize pipeline (creates a banner, then strips
// any incidental text from it), saves the clean base PNG to public/changelog/.
//
// Title text is NOT baked into the image — it gets composited by the Astro
// component <BannerWithOverlay> at render time using `image_text` and the
// site's brand fonts. See:
//   src/components/changelog/BannerWithOverlay.astro
//   context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md
//
// Run:
//   pnpm --filter fullstack-vc gen:banners
//
// Idempotent on filename: the prompt is hashed into the filename, so editing
// `image_prompt` triggers regeneration but unchanged entries are skipped.
//
// Costs: ~$0.12–0.18 per generated banner (QUALITY tier + Layerize). With the
// current 2 entries: ~$0.24–0.36.
// ============================================================================

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { generateAndLayerize, IdeogramApiError } from '../src/utils/api-connectors/ideogram.ts';
import { readNamedColors, getNamedColor } from '../src/lib/theme-tokens.ts';

const CHANGELOG_DIR = new URL('../changelog/', import.meta.url).pathname;
const OUT_DIR = new URL('../public/changelog/', import.meta.url).pathname;

// Which Tier 1 named tokens get surfaced to the image model, and what role
// label each plays in the prompt. The hex values are NOT here — they're read
// from theme.css at runtime so the prompt always tracks the live brand palette.
//
// To add a brand color to AI prompts: add the named token in theme.css, then
// add an entry to this list. Order is preserved in the rendered prompt.
const PROMPT_PALETTE: Array<{ token: string; label: string; role: string }> = [
  { token: 'violet-electric', label: 'violet',   role: 'primary'    },
  { token: 'lime-terminal',   label: 'lime',     role: 'accent'     },
  { token: 'cyan-vapor',      label: 'cyan',     role: 'secondary'  },
  { token: 'obsidian',        label: 'obsidian', role: 'background' },
  { token: 'bone',            label: 'bone',     role: 'highlights' },
];

// Style template — brand-consistency lever. Wraps every prompt so successive
// generations share a feel. Crucially, instructs the model NOT to render text;
// title text is composited as HTML overlay later.
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

// ---------- frontmatter parsing (minimal, no deps) --------------------------

interface Frontmatter {
  image_prompt?: string;
  [key: string]: unknown;
}

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

// ---------- main loop -------------------------------------------------------

function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

/**
 * Write (or update) the `image:` field in a changelog .md frontmatter.
 * Inserts right after `image_prompt:` if present, otherwise appends to the
 * frontmatter block. Returns true if the file was actually changed.
 *
 * No external YAML deps — relies on the line-oriented frontmatter format
 * already in use across changelog files.
 */
function writeImagePathToFrontmatter(mdPath: string, imageUrl: string): boolean {
  const md = readFileSync(mdPath, 'utf8');
  const fmMatch = md.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!fmMatch) return false;
  const [, opener, fmBody, closer, body] = fmMatch;

  let newFmBody: string;
  if (/^image:\s/m.test(fmBody)) {
    newFmBody = fmBody.replace(/^image:\s.*$/m, `image: "${imageUrl}"`);
  } else if (/^image_prompt:/m.test(fmBody)) {
    newFmBody = fmBody.replace(/^(image_prompt:.*)$/m, `$1\nimage: "${imageUrl}"`);
  } else {
    newFmBody = fmBody + `\nimage: "${imageUrl}"`;
  }

  if (newFmBody === fmBody) return false;
  writeFileSync(mdPath, opener + newFmBody + closer + body);
  return true;
}

async function main() {
  if (!process.env.IDEOGRAM_API_KEY) {
    console.error('✗ IDEOGRAM_API_KEY is not set. Add it to sites/fullstack-vc/.env');
    process.exit(1);
  }

  // Read the live brand palette once per run. Failures here mean theme.css
  // is missing a token that PROMPT_PALETTE references — surface immediately.
  const palette = readNamedColors();
  console.log(`Loaded ${Object.keys(palette).length} brand colors from theme.css`);

  const entries = readdirSync(CHANGELOG_DIR).filter(f => f.endsWith('.md'));
  if (entries.length === 0) {
    console.log('No changelog entries found.');
    return;
  }

  let generated = 0, skipped = 0, missingPrompt = 0, failed = 0;

  for (const entry of entries) {
    const slug = basename(entry, '.md');
    const md = readFileSync(join(CHANGELOG_DIR, entry), 'utf8');
    const fm = parseFrontmatter(md);

    if (!fm.image_prompt) {
      console.log(`⊘ ${slug}: no image_prompt in frontmatter — skipped`);
      missingPrompt++;
      continue;
    }

    const fullPrompt = buildStylePrompt(fm.image_prompt, palette);
    const hash = shortHash(fullPrompt);
    const fileName = `${slug}__${hash}.png`;
    const outFile = join(OUT_DIR, fileName);
    const publicUrl = `/changelog/${fileName}`;
    const mdPath = join(CHANGELOG_DIR, entry);

    if (existsSync(outFile)) {
      console.log(`✓ ${slug}: cached (${hash}) — skipped`);
      // Still backfill the frontmatter — handles the case where the .md
      // is missing the `image:` field but the PNG already exists.
      if (writeImagePathToFrontmatter(mdPath, publicUrl)) {
        console.log(`  ↳ frontmatter image: ${publicUrl}`);
      }
      skipped++;
      continue;
    }

    process.stdout.write(`→ ${slug}: generating + layerizing (${hash})... `);
    try {
      const { image, generate: g } = await generateAndLayerize({
        prompt: fullPrompt,
        aspectRatio: '3x1',
        renderingSpeed: 'QUALITY',
        styleType: 'DESIGN',
        magicPrompt: 'OFF',
      });
      writeFileSync(outFile, image);
      console.log(`done (seed ${g.seed})`);
      if (writeImagePathToFrontmatter(mdPath, publicUrl)) {
        console.log(`  ↳ frontmatter image: ${publicUrl}`);
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
  console.log(`Generated: ${generated}  Cached: ${skipped}  No prompt: ${missingPrompt}  Failed: ${failed}`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
