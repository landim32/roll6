import { FACE_HEIGHT_SHARE, FRONT_IMAGE_ASPECT } from './frontImage';
import { HEX_SIZE } from './hexGrid';
import { MASK_MIN_ALPHA, luminance, wallHeight } from './maskImage';

/**
 * The 3D mask read as a grid of heights (034/036, kept by 081): the tones of the mask over the map image's area, one
 * height per cell. The 3D scene (`lib/terrain`) builds its blocks from it. Pure (no DOM).
 *
 * World units are the 2D map's pixels: x → x, the map's y → the scene's z, and up is y. `yaw` 0 faces north (−y on the
 * 2D map) and grows clockwise, like a piece's `look`.
 */

/** Height of a wall of full height (world units): black in the mask. */
export const WALL_HEIGHT = 3 * HEX_SIZE;
/**
 * Eye height above the feet: the face of a person. A figure of 1 hex is as wide as a hex (2 × HEX_SIZE) and its "2,5D
 * frente" image is a 3:4 portrait, so the image is `2 × HEX_SIZE / 0.75` tall, the silhouette (the character) is 60% of
 * that and its eyes are `FACE_HEIGHT_SHARE` of it above the feet — about 59.7 units, a little under the top of the head.
 */
export const EYE_HEIGHT = FACE_HEIGHT_SHARE * ((2 * HEX_SIZE) / FRONT_IMAGE_ASPECT);

/** A rectangle of the 2D map, in map pixels. */
export interface MapArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The mask's tones reduced to a grid of cells over the map image's area. */
export interface MaskGrid {
  cols: number;
  rows: number;
  /** Map-pixel position of the grid's top-left corner and size of one cell. */
  originX: number;
  originY: number;
  cellWidth: number;
  cellHeight: number;
  /** Height of the cell's wall, 0 (empty) to 255 (a wall of full height), row-major. */
  heights: Uint8Array;
}

export const MAX_MASK_CELLS = 512;

/**
 * Reads the mask's tones into the grid of wall heights (036): every cell takes the MEDIAN of the luminance of its own
 * source pixels, not the average — the average would turn the softened edge of an old black and white mask into a
 * half-height wall, and FR-008 wants those masks to come out exactly as before. The median lands on the same "most of
 * the cell is dark" rule the old threshold used: an even split of dark and light is empty.
 * The grid covers `area` (the map image's rectangle) and has at most `maxCells` cells on its longest side — the cost of
 * the scene's blocks depends on the grid, not on the size of the image. Only one cell row of the 256-band histogram is kept at a
 * time (≤ 512 × 256 counters), finished when the source rows move to the next cell row.
 */
export const buildMaskGrid = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  area: MapArea,
  maxCells = MAX_MASK_CELLS,
): MaskGrid => {
  const scale = Math.min(1, maxCells / Math.max(width, height));
  const cols = Math.max(1, Math.round(width * scale));
  const rows = Math.max(1, Math.round(height * scale));
  const heights = new Uint8Array(cols * rows);
  const bands = new Uint32Array(cols * 256);
  const total = new Uint32Array(cols);
  const darkest = new Uint8Array(cols).fill(255);
  const lightest = new Uint8Array(cols);
  let cellRow = -1;

  const finishRow = (row: number) => {
    for (let col = 0; col < cols; col++) {
      const count = total[col];
      if (count === 0) continue;
      const at = col * 256;
      let median = lightest[col];
      if (darkest[col] !== lightest[col]) {
        // The band where the running count passes half of the cell's pixels.
        const half = Math.floor(count / 2);
        let seen = 0;
        for (let band = darkest[col]; band <= lightest[col]; band++) {
          seen += bands[at + band];
          if (seen > half) {
            median = band;
            break;
          }
        }
        bands.fill(0, at + darkest[col], at + lightest[col] + 1);
      }
      heights[row * cols + col] = Math.round(wallHeight(median) * 255);
      total[col] = 0;
      darkest[col] = 255;
      lightest[col] = 0;
    }
  };

  for (let y = 0; y < height; y++) {
    const row = Math.min(rows - 1, Math.floor((y * rows) / height));
    if (row !== cellRow) {
      if (cellRow >= 0) finishRow(cellRow);
      cellRow = row;
    }
    const offset = y * width;
    for (let x = 0; x < width; x++) {
      const i = (offset + x) * 4;
      const col = Math.min(cols - 1, Math.floor((x * cols) / width));
      // A transparent pixel is empty space: it reads as white.
      const band = pixels[i + 3] < MASK_MIN_ALPHA ? 255 : Math.min(255, Math.round(luminance(pixels[i], pixels[i + 1], pixels[i + 2])));
      bands[col * 256 + band] += 1;
      total[col] += 1;
      if (band < darkest[col]) darkest[col] = band;
      if (band > lightest[col]) lightest[col] = band;
    }
  }
  if (cellRow >= 0) finishRow(cellRow);
  return { cols, rows, originX: area.x, originY: area.y, cellWidth: area.width / cols, cellHeight: area.height / rows, heights };
};

/** True when the world point is on a wall of any height; outside the mask's area there are no walls. */
export const isWallAt = (grid: MaskGrid, x: number, y: number): boolean => {
  const col = Math.floor((x - grid.originX) / grid.cellWidth);
  const row = Math.floor((y - grid.originY) / grid.cellHeight);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return false;
  return grid.heights[row * grid.cols + col] > 0;
};

/** The wall height of the cell under a world point, 0 (empty, or outside the mask) to 255 (full). */
export const heightAt = (grid: MaskGrid, x: number, y: number): number => {
  const col = Math.floor((x - grid.originX) / grid.cellWidth);
  const row = Math.floor((y - grid.originY) / grid.cellHeight);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return 0;
  return grid.heights[row * grid.cols + col];
};

/**
 * How many times the background panorama repeats around the camera (research D7): the number of whole copies of the
 * image, shown from the top of the screen to the horizon at the default zoom, that fill 360°. Whole, so the picture
 * closes the circle without a seam; at least 1.
 */
export const skyRepeats = (imageWidth: number, imageHeight: number, aspect = 16 / 9, fovDegrees = 70): number => {
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  // Screen heights: the image is half a screen high; 360° is `aspect × 360 / fov` screen heights wide.
  const copyWidth = (imageWidth / imageHeight) * 0.5;
  const circumference = (aspect * 360) / fovDegrees;
  return Math.max(1, Math.round(circumference / copyWidth));
};
