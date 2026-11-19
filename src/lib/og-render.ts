// Renders a ShareCard to a JPEG at build time: satori (layout to SVG), resvg
// (SVG to PNG), sharp (PNG to JPEG). JPEG, not WebP or PNG: unfurlers handle it
// everywhere and it's the smallest of the three for photo-backed cards.
//
// Tall (1080x1440, 3:4) is the og:image chat apps show; wide (1200x630) is the
// twitter:image only. One og:image per page.
// Pattern source: sites/cathode-site/src/lib/og-render.ts
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { ShareCard } from './share-cards';

// Bump when the card design changes (layout, colors, sizes). Every card then
// re-renders once; until then an unchanged card is never rendered twice.
const RENDER_VERSION = 1;

export const OG_SIZES = {
  tall: { width: 1080, height: 1440 },
  wide: { width: 1200, height: 630 },
} as const;
export type OgVariant = keyof typeof OG_SIZES;

// Raw brand values (theme.css Tier 1). Images can't read CSS custom properties.
const C = {
  obsidian: '#0b0d12',
  bone: '#f6f3ec',
  graphite: '#6b7390',
  line: '#1c2030',
  violet: '#7c5cff',
  lavender: '#b8a8ff',
  lime: '#b6ff5c',
};

const FONT_DIR = join(process.cwd(), 'src/assets/fonts');
type Font = { name: string; data: Buffer; weight: 500 | 700; style: 'normal' };
let fonts: Font[] | null = null;
const loadFonts = () =>
  (fonts ??= [
    { name: 'Space Grotesk', data: readFileSync(join(FONT_DIR, 'space-grotesk-latin-700-normal.woff')), weight: 700, style: 'normal' },
    { name: 'Space Grotesk', data: readFileSync(join(FONT_DIR, 'space-grotesk-latin-500-normal.woff')), weight: 500, style: 'normal' },
    { name: 'Inter', data: readFileSync(join(FONT_DIR, 'inter-latin-500-normal.woff')), weight: 500, style: 'normal' },
    { name: 'JetBrains Mono', data: readFileSync(join(FONT_DIR, 'jetbrains-mono-latin-500-normal.woff')), weight: 500, style: 'normal' },
  ]);

// The F mark, from the site's own favicon.
let markSrc: string | null = null;
const loadMark = () =>
  (markSrc ??= `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), 'public/favicon.svg')).toString('base64')}`);

// Background photos: local /public paths are read from disk, URLs fetched once.
const imageCache = new Map<string, string | null>();
async function loadImage(src?: string): Promise<string | null> {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src)!;
  let out: string | null = null;
  try {
    let buf: Buffer | null = null;
    if (src.startsWith('/')) {
      const p = join(process.cwd(), 'public', decodeURIComponent(src.split('?')[0]));
      if (existsSync(p)) buf = readFileSync(p);
    } else if (/^https?:\/\//.test(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    }
    // Normalize to a modest JPEG so satori gets a small, decodable data URI.
    if (buf) out = `data:image/jpeg;base64,${(await sharp(buf).resize({ width: 1400, withoutEnlargement: true }).flatten({ background: C.obsidian }).jpeg({ quality: 80 }).toBuffer()).toString('base64')}`;
  } catch {
    out = null;
  }
  imageCache.set(src, out);
  return out;
}

type El = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, children?: any, extra: Record<string, any> = {}): El => ({
  type,
  props: { style, children, ...extra },
});

function titleSize(title: string, variant: OgVariant) {
  const n = title.length;
  if (variant === 'tall') return n < 28 ? 132 : n < 56 ? 104 : n < 90 ? 80 : 68;
  return n < 28 ? 80 : n < 56 ? 64 : n < 90 ? 52 : 44;
}

const mark = (size: number) =>
  h('div', { display: 'flex', alignItems: 'center', gap: Math.round(size * 0.32) }, [
    h('img', { width: size, height: size, borderRadius: Math.round(size * 0.2) }, undefined, { src: loadMark(), width: size, height: size }),
    h('div', { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: Math.round(size * 0.66), color: C.bone, letterSpacing: -0.5 }, 'FullStack VC'),
  ]);

// The site-wide card, after lfg-hub's: mark top left, a bracketed kicker, the
// headline as large as the frame allows with its last words in the accent, one
// line under it, and a ruled footer. Content sits in the middle so WhatsApp's
// center-cropped square thumbnail still shows the headline.
function universal(card: ShareCard, variant: OgVariant): El {
  const { width, height } = OG_SIZES[variant];
  const tall = variant === 'tall';
  const pad = tall ? 88 : 64;
  const w = width - 2 * pad;
  const accent = card.accent && card.title.endsWith(card.accent) ? card.accent : '';
  const lead = accent ? card.title.slice(0, -accent.length) : card.title;
  const words = (s: string, color: string) =>
    s.split(/\s+/).filter(Boolean).map((word) => h('span', { color, marginRight: '0.22em' }, word));

  return h('div', {
    width, height, display: 'flex', position: 'relative', background: C.obsidian, fontFamily: 'Inter', color: C.bone,
  }, [
    h('div', {
      position: 'absolute', top: 0, left: 0, width, height,
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(124,92,255,0.34), rgba(11,13,18,0) 58%)',
    }),
    h('div', { position: 'absolute', top: tall ? 88 : 52, left: pad, display: 'flex' }, mark(tall ? 64 : 48)),
    h('div', {
      position: 'absolute', left: pad, top: 0, width: w, height: tall ? height : height - 40,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: tall ? 36 : 20,
    }, [
      h('div', {
        display: 'block', lineClamp: 1, width: w,
        fontFamily: 'JetBrains Mono', fontSize: tall ? 30 : 20, letterSpacing: 2.5, color: C.lavender, textTransform: 'uppercase',
      }, `[ ${card.kicker} ]`),
      h('div', {
        display: 'flex', flexWrap: 'wrap', width: w,
        fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: tall ? 150 : 84, lineHeight: 0.98, letterSpacing: tall ? -5 : -3,
      }, [...words(lead, C.bone), ...words(accent, C.violet)]),
      ...(card.subtitle
        ? [h('div', { display: 'block', lineClamp: 2, width: w, fontFamily: 'Inter', fontWeight: 500, fontSize: tall ? 42 : 26, lineHeight: 1.3, color: C.bone, opacity: 0.82 }, card.subtitle)]
        : []),
    ]),
    footer(variant, pad, w, true),
  ]);
}

function footer(variant: OgVariant, pad: number, w: number, ruled = false): El {
  const tall = variant === 'tall';
  const { height } = OG_SIZES[variant];
  return h('div', {
    position: 'absolute', left: pad, width: w, bottom: tall ? 72 : 40,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    ...(ruled ? { borderTop: `1px solid ${C.line}`, paddingTop: tall ? 28 : 16 } : {}),
    fontFamily: 'JetBrains Mono', fontSize: tall ? 26 : 18, letterSpacing: 2, color: C.graphite,
  }, [
    h('div', { display: 'flex', alignItems: 'center', gap: 14 }, [
      h('div', { width: tall ? 14 : 11, height: tall ? 14 : 11, borderRadius: 7, background: C.lime }),
      h('div', {}, 'AGENTIC VC DOJO'),
    ]),
    h('div', {}, 'FULLSTACK-VC.COM'),
  ]);
}

async function toJpeg(root: El, width: number, height: number) {
  const svg = await satori(root as any, { width, height, fonts: loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  return sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

// ─── Render cache ───────────────────────────────────────────────────────────
// A card's JPEG depends only on its inputs, so a build reuses last build's
// JPEG for any card whose inputs haven't changed, skipping satori, resvg, sharp
// and the photo download. The cache lives in Astro's cache dir
// (node_modules/.astro), which hosts like Vercel and Netlify keep between
// builds. Everything is hashed by CONTENT, never by mtime: a fresh clone gives
// every file a new mtime, which would miss the cache on every deploy.
const CACHE_DIR = join(process.cwd(), 'node_modules/.astro/og-cache');
const sha = (...parts: (string | Buffer)[]) => {
  const hash = createHash('sha256');
  for (const p of parts) hash.update(p);
  return hash.digest('hex');
};

// Fonts and the mark are inputs too: swapping a font file re-renders everything.
let assetsHash: string | null = null;
const rendererAssetsHash = () =>
  (assetsHash ??= sha(
    String(RENDER_VERSION),
    ...readdirSync(FONT_DIR).filter((f) => f.endsWith('.woff')).sort().map((f) => readFileSync(join(FONT_DIR, f))),
    readFileSync(join(process.cwd(), 'public/favicon.svg')),
  ));

// A local photo is hashed by its bytes, so replacing a banner at the same
// path re-renders the card. A remote URL is hashed by the URL alone: we don't
// download it to find out whether it changed (that's the cost we're avoiding).
function photoInput(src?: string): string {
  if (!src) return '';
  if (src.startsWith('/')) {
    const p = join(process.cwd(), 'public', decodeURIComponent(src.split('?')[0]));
    return existsSync(p) ? sha(readFileSync(p)) : src;
  }
  return src;
}

export async function renderCard(card: ShareCard, variant: OgVariant): Promise<Buffer> {
  const key = sha(rendererAssetsHash(), variant, JSON.stringify(card), photoInput(card.image));
  const file = join(CACHE_DIR, `${key}.jpg`);
  if (existsSync(file)) {
    return readFileSync(file);
  }
  const jpg = await renderCardUncached(card, variant);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, jpg);
  } catch {
    // A read-only cache dir costs speed, never correctness.
  }
  return jpg;
}

async function renderCardUncached(card: ShareCard, variant: OgVariant): Promise<Buffer> {
  const { width, height } = OG_SIZES[variant];
  if (card.layout === 'universal') return toJpeg(universal(card, variant), width, height);

  const tall = variant === 'tall';
  const photo = await loadImage(card.image);
  const pad = tall ? 88 : 64;
  const inner = { w: width - 2 * pad, h: height - 2 * pad };
  // On wide cards with a photo, keep the text off the photo on the right.
  const inset = photo && card.imageFit === 'inset';
  const tw = photo && !tall ? Math.round(width * 0.5) - pad : inner.w;

  const text = h('div', { display: 'flex', flexDirection: 'column', width: tw, gap: tall ? 28 : 16 }, [
    h('div', { display: 'block', lineClamp: 1, width: tw, fontFamily: 'JetBrains Mono', fontSize: tall ? 30 : 20, letterSpacing: 1.5, color: C.lavender, textTransform: 'uppercase' }, card.kicker),
    h('div', {
      display: 'block', lineClamp: tall ? 4 : 3, width: tw,
      fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: titleSize(card.title, variant),
      lineHeight: 1.04, letterSpacing: tall ? -2.5 : -1.5, color: C.bone,
    }, card.title),
    ...(card.subtitle
      ? [h('div', { display: 'block', lineClamp: 2, width: tw, fontFamily: 'Inter', fontWeight: 500, fontSize: tall ? 40 : 24, lineHeight: 1.3, color: C.bone, opacity: 0.72 }, card.subtitle)]
      : []),
  ]);

  // Tall: the photo is a band across the top 56%, fading into the card.
  // Wide: it fills the right side. Without a photo, a violet glow, and the
  // text sits centered so the card doesn't look like it lost its picture.
  const layers: El[] = [];
  if (inset) {
    // The banner keeps its 1.9:1 shape inside a rounded frame, on the dark
    // card, so its own text stays whole and the mark never sits on it.
    const box = tall
      ? { top: pad + 56 + 48, left: pad, width: inner.w, height: Math.round(inner.w / 1.905) }
      : (() => { const w = Math.round(width * 0.44); const hgt = Math.round(w / 1.905); return { top: Math.round((height - hgt) / 2) - 10, left: width - pad - w, width: w, height: hgt }; })();
    layers.push(h('div', {
      position: 'absolute', top: 0, left: 0, width, height,
      backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(124,92,255,0.26), rgba(11,13,18,0) 58%)',
    }));
    layers.push(h('img', {
      position: 'absolute', ...box, objectFit: 'cover', objectPosition: 'center center',
      borderRadius: tall ? 28 : 18, border: `2px solid ${C.line}`,
    }, undefined, { src: photo, width: box.width, height: box.height }));
  } else if (photo) {
    const box = tall
      ? { top: 0, left: 0, width, height: Math.round(height * 0.56) }
      : { top: 0, left: Math.round(width * 0.42), width: Math.round(width * 0.58), height };
    layers.push(h('img', { position: 'absolute', ...box, objectFit: 'cover', objectPosition: 'center center' }, undefined, { src: photo, width: box.width, height: box.height }));
    layers.push(h('div', {
      position: 'absolute', top: 0, left: 0, width, height,
      backgroundImage: tall
        ? 'linear-gradient(180deg, rgba(11,13,18,0.55) 0%, rgba(11,13,18,0.05) 18%, rgba(11,13,18,0.1) 34%, rgba(11,13,18,0.88) 50%, rgba(11,13,18,1) 58%)'
        : 'linear-gradient(90deg, rgba(11,13,18,1) 0%, rgba(11,13,18,1) 42%, rgba(11,13,18,0.6) 60%, rgba(11,13,18,0.1) 100%)',
    }));
  } else {
    layers.push(h('div', {
      position: 'absolute', top: 0, left: 0, width, height,
      backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(124,92,255,0.32), rgba(11,13,18,0) 58%)',
    }));
  }

  const root = h('div', {
    width, height, display: 'flex', position: 'relative', background: C.obsidian, fontFamily: 'Inter', color: C.bone,
  }, [
    ...layers,
    h('div', {
      position: 'absolute', top: pad, left: pad, width: inner.w, height: inner.h - (tall ? 40 : 30),
      display: 'flex', flexDirection: 'column',
    }, [
      mark(tall ? 56 : 40),
      h('div', {
        display: 'flex', flexDirection: 'column', flexGrow: 1,
        justifyContent: photo && tall ? 'flex-end' : 'center',
        paddingTop: tall ? 40 : 18, paddingBottom: tall ? 24 : 12,
      }, text),
    ]),
    footer(variant, pad, inner.w),
  ]);

  return toJpeg(root, width, height);
}
