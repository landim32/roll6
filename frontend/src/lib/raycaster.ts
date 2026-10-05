import { FACE_HEIGHT_SHARE, FRONT_IMAGE_ASPECT } from './frontImage';
import { HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import { MASK_MIN_ALPHA, luminance, wallHeight } from './maskImage';

/**
 * Raycasting of the 3D view (034), in the style of Wolfenstein 3D: one ray per screen column hits the walls of the 3D
 * mask and each hit becomes a vertical column whose height depends on its distance. Pure (no DOM): the renderer in
 * components/story only turns these numbers into pixels.
 *
 * World units are the 2D map's pixels (x → x, y → y on the floor). `yaw` 0 faces north (−y, the top of the 2D map) and
 * grows clockwise, like a piece's `look`. The camera never tilts: the horizon is always the middle of the screen.
 */

/** Height of every wall and of the camera's eyes above the floor (world units). */
export const WALL_HEIGHT = 3 * HEX_SIZE;
/**
 * Camera height: the face of a person. A figure of 1 hex is as wide as a hex (2 × HEX_SIZE) and its "2,5D frente" image is a
 * 3:4 portrait, so the image is `2 × HEX_SIZE / 0.75` tall, the silhouette (the character) is 60% of that and its eyes are
 * `FACE_HEIGHT_SHARE` of it above the feet — about 59.7 units, a little under the top of the head (64).
 */
export const EYE_HEIGHT = FACE_HEIGHT_SHARE * ((2 * HEX_SIZE) / FRONT_IMAGE_ASPECT);
/** Distance (world units) at which walls and floor are half as bright. */
export const SHADE_FALLOFF = 12 * HEX_SIZE;
/** Sprites closer than this (depth, world units) are not drawn. */
export const NEAR = 4;

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

/** What a ray met: the euclidean distance along the ray, the world point, the side of the cell struck and its height. */
export interface RayHit {
  distance: number;
  x: number;
  y: number;
  /** 'ew': a face looking east/west (the ray crossed a column boundary); 'ns': north/south. */
  side: 'ew' | 'ns';
  /** Height of that wall, 0–1. */
  height: number;
}

/** Where the camera is and where it looks. */
export interface CameraPose {
  x: number;
  /** Map y (the floor's second axis). */
  z: number;
  yaw: number;
  /** True while following the chosen character's piece. */
  attached: boolean;
}

export const MAX_MASK_CELLS = 512;

/**
 * Reads the mask's tones into the grid of wall heights (036): every cell takes the MEDIAN of the luminance of its own
 * source pixels, not the average — the average would turn the softened edge of an old black and white mask into a
 * half-height wall, and FR-008 wants those masks to come out exactly as before. The median lands on the same "most of
 * the cell is dark" rule the old threshold used: an even split of dark and light is empty.
 * The grid covers `area` (the map image's rectangle) and has at most `maxCells` cells on its longest side — the cost of
 * a ray depends on the grid, not on the size of the image. Only one cell row of the 256-band histogram is kept at a
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

/** How many faces one ray may keep (036): a low wall lets the view go on, but the list cannot be unbounded. */
export const MAX_FACES_PER_RAY = 8;

/**
 * The walls along the ray from (`ox`, `oy`) at `angle` (a yaw), up to `maxDistance` — the DDA of Wolfenstein 3D over
 * the mask's cells, kept going past low walls (036): only a cell taller than the tallest one already seen is recorded,
 * so the faces come back from the nearest to the farthest with growing heights, and it stops at a wall of full height,
 * which hides everything behind it. A mask that is only black and white gives at most one face: the same view as before.
 * The cell the ray starts in never counts (a camera that stands next to a wall may be half inside it).
 */
export const castRay = (grid: MaskGrid, ox: number, oy: number, angle: number, maxDistance: number): RayHit[] => {
  const hits: RayHit[] = [];
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  // Position in cell units.
  const gx = (ox - grid.originX) / grid.cellWidth;
  const gy = (oy - grid.originY) / grid.cellHeight;
  let col = Math.floor(gx);
  let row = Math.floor(gy);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  // Distance along the ray between two column / row boundaries, and to the first one.
  const deltaX = dx === 0 ? Infinity : grid.cellWidth / Math.abs(dx);
  const deltaY = dy === 0 ? Infinity : grid.cellHeight / Math.abs(dy);
  let nextX = dx === 0 ? Infinity : ((dx > 0 ? col + 1 - gx : gx - col) * grid.cellWidth) / Math.abs(dx);
  let nextY = dy === 0 ? Infinity : ((dy > 0 ? row + 1 - gy : gy - row) * grid.cellHeight) / Math.abs(dy);
  let tallest = 0;

  for (;;) {
    let distance: number;
    let side: 'ew' | 'ns';
    if (nextX < nextY) {
      distance = nextX;
      nextX += deltaX;
      col += stepX;
      side = 'ew';
    } else {
      distance = nextY;
      nextY += deltaY;
      row += stepY;
      side = 'ns';
    }
    if (distance > maxDistance) break;
    // Left the grid going away from it: the ray can't come back.
    if ((col < 0 && stepX < 0) || (col >= grid.cols && stepX > 0) || (row < 0 && stepY < 0) || (row >= grid.rows && stepY > 0)) {
      break;
    }
    if (col >= 0 && row >= 0 && col < grid.cols && row < grid.rows) {
      const height = grid.heights[row * grid.cols + col] / 255;
      if (height > tallest) {
        hits.push({ distance, x: ox + dx * distance, y: oy + dy * distance, side, height });
        if (height >= 1 || hits.length >= MAX_FACES_PER_RAY) break;
        tallest = height;
      }
    }
  }
  return hits;
};

/** Distance in screen pixels from the camera to the projection plane, for a frame `width` px wide and a horizontal FOV. */
export const projectionOf = (frameWidth: number, fovDegrees: number): number =>
  frameWidth / 2 / Math.tan((fovDegrees * Math.PI) / 360);

/** Angle of a screen column relative to the camera's facing (radians, negative = left). */
export const columnAngle = (column: number, frameWidth: number, projection: number): number =>
  Math.atan((column + 0.5 - frameWidth / 2) / projection);

/** Perpendicular distance of a hit (no fish-eye): the euclidean distance times the cosine of the column's angle. */
export const perpendicularDistance = (hit: RayHit, offset: number): number => hit.distance * Math.cos(offset);

/**
 * Screen rows `[top, bottom)` of a wall of `height` (0–1) at a perpendicular distance, with the horizon at the middle
 * of the frame. Every wall stands on the floor, so the bottom is the same; a wall lower than the camera's eyes has its
 * top below the horizon (036) — one sees the ground behind it between the top of the wall and the horizon.
 */
export const wallColumn = (perpendicular: number, frameHeight: number, projection: number, height = 1): { top: number; bottom: number } => {
  const horizon = frameHeight / 2;
  const scale = projection / Math.max(perpendicular, 0.0001);
  return { top: horizon - (height * WALL_HEIGHT - EYE_HEIGHT) * scale, bottom: horizon + EYE_HEIGHT * scale };
};

/** Brightness (0–1) at a distance; walls facing north/south are a bit darker, like in Wolfenstein 3D. */
export const shade = (distance: number, side: 'ew' | 'ns' = 'ew'): number =>
  (1 / (1 + distance / SHADE_FALLOFF)) * (side === 'ns' ? 0.75 : 1);

/**
 * World point of the floor at a screen pixel below the horizon (floor casting), or null at or above it. `row` is a
 * screen row and `column` a screen column of a frame `frameWidth × frameHeight`.
 */
export const floorPoint = (
  pose: CameraPose,
  column: number,
  row: number,
  frameWidth: number,
  frameHeight: number,
  projection: number,
): (Point & { depth: number }) | null => {
  const below = row + 0.5 - frameHeight / 2;
  if (below <= 0) return null;
  const depth = (EYE_HEIGHT * projection) / below;
  const lateral = (depth * (column + 0.5 - frameWidth / 2)) / projection;
  const sin = Math.sin(pose.yaw);
  const cos = Math.cos(pose.yaw);
  // Forward = (sin, −cos); right = (cos, sin).
  return { x: pose.x + sin * depth + cos * lateral, y: pose.z - cos * depth + sin * lateral, depth };
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

/** Column (0 … imageWidth − 1) of the background panorama seen along a ray at `angle` (yaw + the column's offset). */
export const skyColumn = (angle: number, repeats: number, imageWidth: number): number => {
  const turns = (angle / (2 * Math.PI)) * repeats;
  const fraction = turns - Math.floor(turns);
  return Math.min(imageWidth - 1, Math.floor(fraction * imageWidth));
};

/** Where a figure lands on the screen (null when behind the camera). */
export interface SpriteProjection {
  screenX0: number;
  screenX1: number;
  top: number;
  bottom: number;
  /** Perpendicular distance from the camera: compared with the walls' (z-buffer) and used to sort far to near. */
  depth: number;
}

/**
 * Projects a standing figure — `width` and `height` in world units, its feet on the floor at `center` — onto a frame
 * `frameWidth × frameHeight`. A figure always faces the camera, so it needs no rotation.
 */
export const projectSprite = (
  pose: CameraPose,
  center: Point,
  width: number,
  height: number,
  frameWidth: number,
  frameHeight: number,
  projection: number,
): SpriteProjection | null => {
  const sin = Math.sin(pose.yaw);
  const cos = Math.cos(pose.yaw);
  const dx = center.x - pose.x;
  const dy = center.y - pose.z;
  const depth = dx * sin - dy * cos;
  if (depth <= NEAR) return null;
  const lateral = dx * cos + dy * sin;
  const screenCenter = frameWidth / 2 + (lateral * projection) / depth;
  const half = (width * projection) / depth / 2;
  const bottom = frameHeight / 2 + (EYE_HEIGHT * projection) / depth;
  return { screenX0: screenCenter - half, screenX1: screenCenter + half, top: bottom - (height * projection) / depth, bottom, depth };
};

/** True when a figure at `depth` is in front of the wall drawn in `column` (the z-buffer holds the walls' distances). */
export const columnVisible = (zBuffer: ArrayLike<number>, column: number, depth: number): boolean =>
  column >= 0 && column < zBuffer.length && depth < zBuffer[column];
