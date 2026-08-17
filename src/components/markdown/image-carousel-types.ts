/**
 * image-carousel-types.ts — registry + shared extraction for the
 * `:::image-carousel` / `:::img-carousel` LFM directive.
 *
 * Sibling module to the ImageCarousel--{Variant}.astro components, mirroring
 * the Callout split (structural component + types registry + stylesheet).
 * Every variant imports `collectSlides` from here so the authoring contract
 * — what counts as a slide — is defined exactly once.
 */

export const CAROUSEL_VARIANTS = ['filmstrip', 'stepper', 'peek', 'contact-sheet'] as const;
export type CarouselVariant = (typeof CAROUSEL_VARIANTS)[number];

export const DEFAULT_VARIANT: CarouselVariant = 'filmstrip';

/** Maps a `variant` attribute to its component file's modifier segment. */
export const VARIANT_COMPONENT: Record<CarouselVariant, string> = {
  filmstrip: 'ImageCarousel--Filmstrip',
  stepper: 'ImageCarousel--Stepper',
  peek: 'ImageCarousel--Peek',
  'contact-sheet': 'ImageCarousel--ContactSheet',
};

export interface CarouselSlide {
  src: string;
  alt: string;
  /** Short step name, e.g. "Recovery key". Rendered above the caption. */
  label?: string;
  caption?: string;
}

/** Options shared by every variant, parsed from the container directive. */
export interface CarouselOptions {
  title?: string;
  numbered: boolean;
  maxHeight?: string;
}

export function readOptions(node: any): CarouselOptions {
  const attrs = node?.attributes || {};
  return {
    title: attrs.title || undefined,
    // Ordinals are the point of this component; allow opting out explicitly.
    numbered: attrs.numbered !== 'false',
    maxHeight: attrs['max-height'] || undefined,
  };
}

export function resolveVariant(node: any): CarouselVariant {
  const requested = (node?.attributes?.variant || DEFAULT_VARIANT) as CarouselVariant;
  // Unknown values fall back rather than failing the build — LFM's
  // no-hard-validation posture.
  return CAROUSEL_VARIANTS.includes(requested) ? requested : DEFAULT_VARIANT;
}

/**
 * Collect child images from a container directive.
 *
 * Accepts both the LFM `::image{}` leaf directive and plain markdown
 * `![alt](src)`, and recurses through paragraphs — remark wraps loose inline
 * content in a paragraph, so directives usually arrive nested one level down.
 */
export function collectSlides(node: any, acc: CarouselSlide[] = []): CarouselSlide[] {
  for (const child of node?.children ?? []) {
    if (child.type === 'leafDirective' && child.name === 'image') {
      const a = child.attributes || {};
      acc.push({
        src: a.src || '',
        alt: a.alt || '',
        label: a.label || undefined,
        caption: a.caption || undefined,
      });
    } else if (child.type === 'image') {
      acc.push({
        src: child.url || '',
        alt: child.alt || '',
        caption: child.title || undefined,
      });
    } else if (child.children) {
      collectSlides(child, acc);
    }
  }
  return acc;
}

/** Deterministic id so dots can target slides as anchor links without JS. */
export function carouselUid(slides: CarouselSlide[], variant: string): string {
  const seed = slides.map((s) => s.src).join('|') + variant;
  const hash = Math.abs(seed.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  return `lfm-carousel-${hash.toString(36)}`;
}
