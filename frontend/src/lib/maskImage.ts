/**
 * The 3D mask (034): a black and white image with the same proportion as the map image, covering the same area —
 * black is wall and white is empty space in the 3D view. Pure rules shared by the map registration (ratio check and
 * black-and-white preview) and the raycaster (`lib/raycaster.buildMaskGrid`).
 */

export interface ImageSize {
  width: number;
  height: number;
}

/** The mask may differ from the map image's proportion by up to 1%. */
export const MASK_RATIO_TOLERANCE = 0.01;

/** Luminance (0–255) under which a mask pixel is wall. */
export const MASK_THRESHOLD = 128;

/** Alpha under which a pixel counts as empty (a transparent mask pixel is white). */
export const MASK_MIN_ALPHA = 128;

const ratioOf = (size: ImageSize): number => size.width / size.height;

/** True when both sizes have the same width ÷ height, within the tolerance (relative to the map's proportion). */
export const sameRatio = (mask: ImageSize, map: ImageSize): boolean => {
  if (mask.width <= 0 || mask.height <= 0 || map.width <= 0 || map.height <= 0) return false;
  return Math.abs(ratioOf(mask) - ratioOf(map)) / ratioOf(map) <= MASK_RATIO_TOLERANCE;
};

/** "1,14 : 1" — the proportion shown in the mismatch message. */
export const formatRatio = (size: ImageSize): string => `${ratioOf(size).toFixed(2).replace('.', ',')} : 1`;

/** Rec. 601 luma of an RGB pixel. */
export const luminance = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

/** Dark and opaque enough = wall; light or transparent = empty. */
export const isMaskWall = (r: number, g: number, b: number, a = 255): boolean =>
  a >= MASK_MIN_ALPHA && luminance(r, g, b) < MASK_THRESHOLD;

/** RGBA pixels to pure black (wall) and white (empty), in place: the preview shows exactly what the 3D view reads. */
export const thresholdPixels = (pixels: Uint8ClampedArray): Uint8ClampedArray => {
  for (let i = 0; i < pixels.length; i += 4) {
    const value = isMaskWall(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]) ? 0 : 255;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }
  return pixels;
};
