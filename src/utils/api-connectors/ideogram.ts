// ============================================================================
// Ideogram v3 API connector
//
// Pure I/O wrapper around the two Ideogram v3 endpoints we use:
//   - generate         (POST /v1/ideogram-v3/generate)
//   - layerize-text    (POST /v1/ideogram-v3/layerize-text)
//
// Plus a `generateAndLayerize` convenience that runs the full
// "Generate → Layerize → return clean base image" pipeline used for
// changelog banners (so we can composite our own brand-font title text on top
// rather than bake fragile model-rendered text into the pixels).
//
// Reference: context-v/explorations/Choosing-an-Image-Generator-for-Text-on-Background-Banners.md
//
// Used only at build time. Node 22+. Zero runtime deps.
// ============================================================================

const BASE_URL = 'https://api.ideogram.ai';

// ---------- typed parameter sets --------------------------------------------

export type AspectRatio =
  | '1x3' | '3x1' | '1x2' | '2x1'
  | '9x16' | '16x9' | '10x16' | '16x10'
  | '2x3' | '3x2' | '3x4' | '4x3'
  | '4x5' | '5x4' | '1x1';

export type RenderingSpeed = 'FLASH' | 'TURBO' | 'DEFAULT' | 'QUALITY';
export type StyleType = 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
export type MagicPrompt = 'AUTO' | 'ON' | 'OFF';

export interface GenerateOptions {
  /** Required. The text prompt. Wrap with your brand style template before calling. */
  prompt: string;
  aspectRatio?: AspectRatio;
  renderingSpeed?: RenderingSpeed;
  styleType?: StyleType;
  magicPrompt?: MagicPrompt;
  negativePrompt?: string;
  seed?: number;
  numImages?: number;
}

export interface GenerateResult {
  /** Ephemeral S3 URL — download immediately. */
  url: string;
  /** The actually-used prompt (may differ from input if magic_prompt was ON). */
  prompt: string;
  resolution: string;
  isImageSafe: boolean;
  seed: number;
  styleType: string;
}

export interface LayerizeOptions {
  /** Required. The image to strip text from. */
  image: Buffer;
  /** Filename hint for the multipart upload. Defaults to 'input.png'. */
  filename?: string;
  /** Optional MIME type. Defaults to 'image/png'. */
  contentType?: string;
  /** Optional prompt describing the image (auto-generated if omitted). */
  prompt?: string;
  seed?: number;
}

export interface LayerizeResult {
  /** Ephemeral URL of the text-stripped image. Download immediately. */
  baseImageUrl: string;
  /** Ephemeral URL of the input echoed back. May be null. */
  originalImageUrl: string | null;
  seed: number;
}

// ---------- low-level error type --------------------------------------------

export class IdeogramApiError extends Error {
  // Field declarations (not TS parameter properties) — Node's
  // --experimental-strip-types is type-erasure-only and cannot transform
  // parameter-property constructor shorthand. Plain field decl + explicit
  // assignment is the strip-only-compatible pattern.
  readonly endpoint: string;
  readonly status: number;
  readonly body: string;

  constructor(endpoint: string, status: number, body: string) {
    super(`Ideogram ${endpoint} ${status}: ${body}`);
    this.name = 'IdeogramApiError';
    this.endpoint = endpoint;
    this.status = status;
    this.body = body;
  }
}

// ---------- internal helpers -------------------------------------------------

function requireKey(): string {
  const key = process.env.IDEOGRAM_API_KEY;
  if (!key) {
    throw new Error(
      'IDEOGRAM_API_KEY is not set. Add it to sites/fullstack-vc/.env (and confirm .env is gitignored).'
    );
  }
  return key;
}

async function downloadEphemeralImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Image download failed (${res.status}). The Ideogram URL may have expired — re-run the generate step.`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

// ---------- public surface ---------------------------------------------------

/**
 * Generate an image from a text prompt.
 * Returns metadata about the generation. Use `downloadGeneratedImage(result.url)`
 * to fetch the actual bytes (URL is ephemeral).
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const key = requireKey();
  const form = new FormData();
  form.append('prompt', options.prompt);
  form.append('aspect_ratio', options.aspectRatio ?? '1x1');
  form.append('rendering_speed', options.renderingSpeed ?? 'DEFAULT');
  form.append('style_type', options.styleType ?? 'GENERAL');
  if (options.magicPrompt) form.append('magic_prompt', options.magicPrompt);
  if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
  if (options.seed !== undefined) form.append('seed', String(options.seed));
  if (options.numImages !== undefined) form.append('num_images', String(options.numImages));

  const res = await fetch(`${BASE_URL}/v1/ideogram-v3/generate`, {
    method: 'POST',
    headers: { 'Api-Key': key },
    body: form,
  });
  if (!res.ok) throw new IdeogramApiError('generate', res.status, await res.text());

  const json = (await res.json()) as {
    data?: Array<{
      url: string;
      prompt: string;
      resolution: string;
      is_image_safe: boolean;
      seed: number;
      style_type: string;
    }>;
  };
  const first = json.data?.[0];
  if (!first) throw new Error(`Ideogram generate: no data in response — ${JSON.stringify(json)}`);

  return {
    url: first.url,
    prompt: first.prompt,
    resolution: first.resolution,
    isImageSafe: first.is_image_safe,
    seed: first.seed,
    styleType: first.style_type,
  };
}

/**
 * Strip text from an image. Returns metadata; use `downloadGeneratedImage(result.baseImageUrl)`
 * to fetch the cleaned bytes.
 */
export async function layerizeText(options: LayerizeOptions): Promise<LayerizeResult> {
  const key = requireKey();
  const form = new FormData();
  const blob = new Blob([options.image], { type: options.contentType ?? 'image/png' });
  form.append('image', blob, options.filename ?? 'input.png');
  if (options.prompt) form.append('prompt', options.prompt);
  if (options.seed !== undefined) form.append('seed', String(options.seed));

  const res = await fetch(`${BASE_URL}/v1/ideogram-v3/layerize-text`, {
    method: 'POST',
    headers: { 'Api-Key': key },
    body: form,
  });
  if (!res.ok) throw new IdeogramApiError('layerize-text', res.status, await res.text());

  const json = (await res.json()) as {
    base_image_url: string;
    original_image_url: string | null;
    seed: number;
  };
  return {
    baseImageUrl: json.base_image_url,
    originalImageUrl: json.original_image_url,
    seed: json.seed,
  };
}

/** Download bytes from any Ideogram ephemeral image URL. */
export async function downloadGeneratedImage(url: string): Promise<Buffer> {
  return downloadEphemeralImage(url);
}

/**
 * Convenience pipeline: generate an image from `prompt`, run it through
 * Layerize Text to remove any incidental text, return the clean base image bytes.
 *
 * Use this for banner generation when you intend to composite your own brand-font
 * title text via an Astro overlay component.
 *
 * Cost: ~$0.09 (generate QUALITY) + Layerize cost. ~$0.12–0.18 per call.
 */
export async function generateAndLayerize(
  options: GenerateOptions,
): Promise<{ image: Buffer; generate: GenerateResult; layerize: LayerizeResult }> {
  const gen = await generate(options);
  const generated = await downloadEphemeralImage(gen.url);

  const lay = await layerizeText({
    image: generated,
    filename: 'generated.png',
    contentType: 'image/png',
  });
  const cleaned = await downloadEphemeralImage(lay.baseImageUrl);

  return { image: cleaned, generate: gen, layerize: lay };
}
