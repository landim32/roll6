import type { PixelBuffer } from './raycastFrame';
import { SPRITE_VIEWS } from './spriteView';
import type { SpriteView, ViewImages } from './spriteView';

/**
 * Same height for the four sides of a figure in the 3D view (036). Each side is cropped by hand over the same silhouette,
 * so the character ends up a few percent taller in one picture than in another (60% of the frame in the front, 63% in a
 * profile, say) and the figure seems to grow and shrink as the camera walks around it. A person is as tall from every
 * side, so the sides are fitted to a reference one — the front, or the first side the token has — scaling the others
 * about the middle of the picture and keeping the feet on the same row. Pure (no DOM).
 */

/** Alpha from which a pixel belongs to the figure (the same cut the 3D view uses to draw it). */
const OPAQUE = 128;
/** A row belongs to the figure only with this many opaque pixels in it, so a stray speck does not stretch the box. */
const MIN_ROW_PIXELS = 2;
/** A side is never scaled by more than this either way: past it the picture is not the same figure (a raised sword). */
export const MIN_FIT = 0.75;
export const MAX_FIT = 1 / MIN_FIT;
/** A difference under this is left alone: not worth a resample. */
const TOLERANCE = 0.02;

/** First and last rows of the figure in a picture (row indices, last inclusive), or null when nothing is opaque. */
export const figureRows = (pixels: PixelBuffer): { top: number; bottom: number } | null => {
  const { data, width, height } = pixels;
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width && count < MIN_ROW_PIXELS; x++) {
      if (data[(y * width + x) * 4 + 3] >= OPAQUE) count += 1;
    }
    if (count >= MIN_ROW_PIXELS) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  return top < 0 ? null : { top, bottom };
};

/** Order the reference side is looked for: the front first (the camera is set for it), then the back, then the sides. */
const REFERENCE_ORDER: readonly SpriteView[] = ['front', 'back', 'right', 'left'];

/**
 * `pixels` drawn `scale` times bigger about the middle column, with the row `anchor` of the source landing on the row
 * `anchorTo` of the result (same size as the source, nearest neighbour: the view draws without smoothing anyway).
 */
const rescale = (pixels: PixelBuffer, scale: number, anchor: number, anchorTo: number): PixelBuffer => {
  const { data, width, height } = pixels;
  const out = new Uint8ClampedArray(data.length);
  const middle = (width - 1) / 2;
  for (let y = 0; y < height; y++) {
    const sy = Math.round(anchor + (y - anchorTo) / scale);
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < width; x++) {
      const sx = Math.round(middle + (x - middle) / scale);
      if (sx < 0 || sx >= width) continue;
      const from = (sy * width + sx) * 4;
      const to = (y * width + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }
  return { data: out, width, height };
};

/**
 * The four sides with the figure at the same height: every side is scaled so that its figure is as tall, in proportion
 * to its picture, as the reference's, and its feet land on the reference's feet row. Sides without a figure, the
 * reference itself and differences under 2% come back untouched; the scale is limited to `MIN_FIT`…`MAX_FIT`.
 */
export const fitSprites = (images: ViewImages<PixelBuffer>): ViewImages<PixelBuffer> => {
  const rows = (view: SpriteView) => {
    const pixels = images[view];
    return pixels ? figureRows(pixels) : null;
  };
  const reference = REFERENCE_ORDER.find((view) => rows(view) !== null);
  if (!reference) return images;
  const refPixels = images[reference]!;
  const refRows = rows(reference)!;
  const refShare = (refRows.bottom - refRows.top + 1) / refPixels.height;

  const fitted = { ...images };
  for (const view of SPRITE_VIEWS) {
    const pixels = images[view];
    const own = rows(view);
    if (!pixels || !own || view === reference) continue;
    const share = (own.bottom - own.top + 1) / pixels.height;
    const scale = Math.min(MAX_FIT, Math.max(MIN_FIT, refShare / share));
    // The feet row of the reference, as a share of its picture, in this picture's rows.
    const feetTo = ((refRows.bottom + 1) / refPixels.height) * pixels.height - 1;
    if (Math.abs(scale - 1) < TOLERANCE && Math.abs(feetTo - own.bottom) < 1) continue;
    fitted[view] = rescale(pixels, scale, own.bottom, feetTo);
  }
  return fitted;
};
