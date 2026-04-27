// ============================================================================
// generate-og-image.ts
//
// One-shot site-wide OpenGraph banner generator. Mirrors the changelog banner
// script (same style template, same Generate → Layerize pipeline, same brand
// palette pulled live from theme.css) but produces a single 16:9 image at
// public/og-default.png — referenced by BoilerPlateHTML.astro for og:image and
// twitter:image.
//
// Run:
//   pnpm --filter fullstack-vc gen:og
//   pnpm --filter fullstack-vc gen:og "an isometric scene of a vault crossed with a dojo, glowing terminal monitors orbiting"
//
// Idempotency: the prompt is hashed and stored alongside the PNG. Re-running
// with the same prompt is a no-op; changing the prompt regenerates the image.
//
// Cost: ~$0.12–0.18 per generation (QUALITY tier + Layerize). Run only when
// you actually want a new banner — this is not a per-build step.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateAndLayerize, IdeogramApiError } from '../src/utils/api-connectors/ideogram.ts';
import { readNamedColors, getNamedColor } from '../src/lib/theme-tokens.ts';

const OUT_PNG  = new URL('../public/og-default.png',      import.meta.url).pathname;
const OUT_HASH = new URL('../public/og-default.hash.txt', import.meta.url).pathname;
const OUT_DIR  = new URL('../public/',                    import.meta.url).pathname;

// Default subject if no CLI arg supplied. Edit this — or pass an override on
// the command line — to evolve the site-wide social card.
const DEFAULT_SUBJECT =
  'A high-tech dojo for venture capitalists: floating glass dashboards, ' +
  'isometric circuitry, quiet zen geometry, a deal flow visualized as ' +
  'concentric rings of light';

// Same palette contract as the changelog generator — kept in sync intentionally
// so OG and changelog banners share a visual signature.
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

function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

async function main() {
  if (!process.env.IDEOGRAM_API_KEY) {
    console.error('✗ IDEOGRAM_API_KEY is not set. Add it to sites/fullstack-vc/.env');
    process.exit(1);
  }

  const subject = process.argv.slice(2).join(' ').trim() || DEFAULT_SUBJECT;
  const palette = readNamedColors();
  const fullPrompt = buildStylePrompt(subject, palette);
  const hash = shortHash(fullPrompt);

  const cachedHash = existsSync(OUT_HASH) ? readFileSync(OUT_HASH, 'utf8').trim() : null;
  if (cachedHash === hash && existsSync(OUT_PNG)) {
    console.log(`✓ public/og-default.png is already up to date (${hash}). Nothing to do.`);
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`→ Generating OG image (${hash})...`);
  console.log(`  Subject: ${subject}`);

  try {
    const { image, generate: g } = await generateAndLayerize({
      prompt: fullPrompt,
      aspectRatio: '16x9',
      renderingSpeed: 'QUALITY',
      styleType: 'DESIGN',
      magicPrompt: 'OFF',
    });
    writeFileSync(OUT_PNG, image);
    writeFileSync(OUT_HASH, hash + '\n');
    console.log(`✓ Wrote public/og-default.png (seed ${g.seed})`);
    console.log(`  Reference it via og:image / twitter:image — already wired in BoilerPlateHTML.astro.`);
  } catch (err) {
    if (err instanceof IdeogramApiError) {
      console.error(`✗ ${err.endpoint} returned ${err.status}: ${err.body.slice(0, 300)}`);
    } else {
      console.error(`✗ ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
