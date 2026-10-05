/**
 * The 3D mask: an image with the same proportion as the map image, covering the same area. Its TONE is the height of
 * the wall (036) — black is a wall of full height, white is empty space and a gray in between is a lower wall the
 * camera can see over. Before 036 the mask was read as black and white only, and a mask that is still only black and
 * white gives exactly the same walls as it did then. Pure rules shared by the map registration (proportion check and
 * gray preview) and the raycaster (`lib/raycaster.buildMaskGrid`).
 */

export interface ImageSize {
  width: number;
  height: number;
}

/** The mask may differ from the map image's proportion by up to 1%. */
export const MASK_RATIO_TOLERANCE = 0.01;

/** Alpha under which a pixel counts as empty (a transparent mask pixel is white). */
export const MASK_MIN_ALPHA = 128;

/** A cell lighter than this share of the range is empty space, not a wall. */
export const MASK_MIN_HEIGHT = 0.05;

/** A cell darker than this is a wall of full height: the ends of the range land on 0 and 1, as the old threshold did. */
export const MASK_FULL_HEIGHT = 0.95;

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

/** Height (0–1) a single pixel asks for: the darker it is, the taller the wall. Transparent is empty. */
export const pixelHeight = (r: number, g: number, b: number, a = 255): number =>
  a < MASK_MIN_ALPHA ? 0 : 1 - luminance(r, g, b) / 255;

/**
 * The height of a cell from the median of its pixels' luminance (0–255): the ends are snapped to nothing or to a whole
 * wall, so an old black and white mask — or a JPEG's noise at either end — comes out exactly as before (FR-008).
 */
export const wallHeight = (medianLuminance: number): number => {
  const height = 1 - medianLuminance / 255;
  if (height < MASK_MIN_HEIGHT) return 0;
  if (height >= MASK_FULL_HEIGHT) return 1;
  return height;
};

/** RGBA pixels as they will be seen: the luminance as gray, opaque. A transparent pixel reads as empty (white). */
export const grayscalePixels = (pixels: Uint8ClampedArray): Uint8ClampedArray => {
  for (let i = 0; i < pixels.length; i += 4) {
    const value = pixels[i + 3] < MASK_MIN_ALPHA ? 255 : Math.round(luminance(pixels[i], pixels[i + 1], pixels[i + 2]));
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }
  return pixels;
};
