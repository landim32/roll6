import type { PixelBuffer } from './raycastFrame';

/**
 * Reduced copies of a figure's image and bilinear sampling over them (053, "Alta" and "Ultra"). Everything is kept
 * **premultiplied** (color × alpha): averaging straight RGBA bleeds the color of transparent pixels — usually black — into
 * the edges and gives the figures a dark fringe; premultiplied averages and interpolations don't. Pure: no DOM, so the
 * frame tests run on it, and nothing here is built for the "Padrão" level (`mipChainOf` is only called by the smooth path).
 */

/** One copy of the image, RGBA premultiplied, 0–255 in a Float32Array (no rounding between levels). */
export interface MipLevel {
  data: Float32Array;
  width: number;
  height: number;
}

/** `levels[0]` is the image itself (premultiplied); each next one is half the size, down to 1×1. */
export interface MipChain {
  levels: MipLevel[];
}

const premultiply = (pixels: PixelBuffer): MipLevel => {
  const { width, height } = pixels;
  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const a = pixels.data[i + 3];
    const k = a / 255;
    data[i] = pixels.data[i] * k;
    data[i + 1] = pixels.data[i + 1] * k;
    data[i + 2] = pixels.data[i + 2] * k;
    data[i + 3] = a;
  }
  return { data, width, height };
};

/** Half the size (rounded up): each pixel is the box average of its 2×2 source block; an odd edge repeats its last pixel. */
const halve = (level: MipLevel): MipLevel => {
  const width = Math.max(1, Math.ceil(level.width / 2));
  const height = Math.max(1, Math.ceil(level.height / 2));
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.min(level.height - 1, y * 2);
    const y1 = Math.min(level.height - 1, y * 2 + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.min(level.width - 1, x * 2);
      const x1 = Math.min(level.width - 1, x * 2 + 1);
      const p00 = (y0 * level.width + x0) * 4;
      const p10 = (y0 * level.width + x1) * 4;
      const p01 = (y1 * level.width + x0) * 4;
      const p11 = (y1 * level.width + x1) * 4;
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        data[o + c] = (level.data[p00 + c] + level.data[p10 + c] + level.data[p01 + c] + level.data[p11 + c]) / 4;
      }
    }
  }
  return { data, width, height };
};

/** The whole chain, from the image to 1×1. */
export const buildMipChain = (pixels: PixelBuffer): MipChain => {
  const levels = [premultiply(pixels)];
  let last = levels[0];
  while (last.width > 1 || last.height > 1) {
    last = halve(last);
    levels.push(last);
  }
  return { levels };
};

const chains = new WeakMap<PixelBuffer, MipChain>();

/** The chain of an image, built on the first smooth sampling and kept with the image (so "Padrão" never pays for it). */
export const mipChainOf = (pixels: PixelBuffer): MipChain => {
  const cached = chains.get(pixels);
  if (cached) return cached;
  const chain = buildMipChain(pixels);
  chains.set(pixels, chain);
  return chain;
};

/**
 * Which level to read when `texelsPerPixel` texels of the original land on one screen pixel: the one whose texels are
 * about one per pixel. 0 (the image itself) when the figure is drawn at least as large as the image.
 */
export const mipLevelFor = (chain: MipChain, texelsPerPixel: number): number => {
  if (!(texelsPerPixel > 1)) return 0;
  return Math.min(chain.levels.length - 1, Math.round(Math.log2(texelsPerPixel)));
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Bilinear sample at (u, v) ∈ [0, 1] — texel centers at (i + 0.5) / n, the border clamped — written premultiplied
 * (0–255) into `out[0..3]`. The coverage of the pixel is `out[3] / 255`.
 */
export const sampleBilinear = (level: MipLevel, u: number, v: number, out: Float32Array): void => {
  const { data, width, height } = level;
  const x = Math.min(Math.max(u, 0), 1) * width - 0.5;
  const y = Math.min(Math.max(v, 0), 1) * height - 0.5;
  const xf = Math.floor(x);
  const yf = Math.floor(y);
  const fx = x - xf;
  const fy = y - yf;
  const x0 = Math.min(width - 1, Math.max(0, xf));
  const x1 = Math.min(width - 1, Math.max(0, xf + 1));
  const y0 = Math.min(height - 1, Math.max(0, yf));
  const y1 = Math.min(height - 1, Math.max(0, yf + 1));
  const p00 = (y0 * width + x0) * 4;
  const p10 = (y0 * width + x1) * 4;
  const p01 = (y1 * width + x0) * 4;
  const p11 = (y1 * width + x1) * 4;
  for (let c = 0; c < 4; c++) {
    out[c] = lerp(lerp(data[p00 + c], data[p10 + c], fx), lerp(data[p01 + c], data[p11 + c], fx), fy);
  }
};
