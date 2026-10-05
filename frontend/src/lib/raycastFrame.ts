import type { Point } from './hexGrid';
import {
  castRay, columnAngle, EYE_HEIGHT, floorPoint, heightAt, MAX_FACES_PER_RAY, perpendicularDistance, projectionOf,
  projectSprite, shade, skyColumn, WALL_HEIGHT, wallColumn,
} from './raycaster';
import type { CameraPose, MapArea, MaskGrid } from './raycaster';
import { chooseSprite, viewSeen } from './spriteView';
import { heightAtRow, textureColumn, textureOffset, textureRow } from './wallTexture';
import type { ViewImages } from './spriteView';

/**
 * Draws one frame of the 3D view (034) the way Wolfenstein 3D did: column by column — sky, wall, floor — and then the
 * figures. Pure: it writes RGBA pixels into a buffer; the renderer in components/story puts that buffer on a canvas.
 */

/** RGBA pixels of an image. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * A figure to draw: the four "2,5D" images of its token (035) and its standing one as the reserve, where its feet
 * stand, how wide it is (map units) and which way it faces. The renderer picks the image every frame.
 */
export interface RenderSprite {
  id: number;
  /** One image per side of the character; null where the token has none. */
  images: ViewImages<PixelBuffer>;
  /** What to draw when the side the camera sees has no image (the token's standing image). */
  fallback: PixelBuffer;
  center: Point;
  width: number;
  /** Hex side the piece faces, 0–5 clockwise from the top. */
  look: number;
}

/** Everything a frame shows besides the camera. */
export interface FrameScene {
  mask: MaskGrid | null;
  /** The map image: the floor, and the color of the walls. */
  map: { pixels: PixelBuffer; area: MapArea } | null;
  /** Panorama behind the walls and how many times it repeats around the camera (`skyRepeats`). */
  background: { pixels: PixelBuffer; repeats: number } | null;
  sprites: readonly RenderSprite[];
  /** One picture that covers every wall (036); without it the walls take the colors of the map image. */
  wallTexture?: PixelBuffer | null;
}

const DEFAULT_WALL = [122, 116, 104];
const DEFAULT_FLOOR = [42, 46, 53];
const SKY_TOP = [18, 22, 40];
const SKY_HORIZON = [74, 78, 108];
/** Strongest the shadow of a figure gets, at its middle; it fades to nothing at the edge. */
export const SHADOW_ALPHA = 0.55;
/** Share of the figure's width that the radius of its shadow takes: a bit less than the body, like a person's feet. */
export const SHADOW_RADIUS_SHARE = 0.42;
/** Softness of the shadow's edge: higher falls off faster toward the border. */
const SHADOW_SOFTNESS = 1.3;
/** How far into a wall (in cells) the color is read, so the edge pixel of the image is not what paints the wall. */
const WALL_PUSH = 0.5;

/**
 * Where a drawn figure landed on the screen (036, for the speech balloons): the pixels of the frame, so the caller can
 * turn them into canvas pixels. `headVisible` is false when a wall covers the top of the figure — the balloon goes away
 * with it (FR-018).
 */
export interface FrameSprite {
  id: number;
  /** Center of the figure. */
  screenX: number;
  top: number;
  bottom: number;
  /** Perpendicular distance from the camera: the balloon's size and the order of the ones that overlap. */
  depth: number;
  headVisible: boolean;
}

/** What one frame drew. */
export interface FrameResult {
  frameWidth: number;
  frameHeight: number;
  sprites: FrameSprite[];
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Default sky: a gradient from the top of the frame to the horizon. */
export const skyGradient = (rows: number): number[][] =>
  Array.from({ length: Math.max(1, rows) }, (_, row) => {
    const t = row / Math.max(1, rows);
    return [lerp(SKY_TOP[0], SKY_HORIZON[0], t), lerp(SKY_TOP[1], SKY_HORIZON[1], t), lerp(SKY_TOP[2], SKY_HORIZON[2], t)];
  });

/** Index into the map image's data of the pixel at a world point, or −1 outside the image. */
const mapIndex = (map: FrameScene['map'], x: number, y: number): number => {
  if (!map) return -1;
  const { area, pixels } = map;
  const u = (x - area.x) / area.width;
  const v = (y - area.y) / area.height;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1;
  return (Math.floor(v * pixels.height) * pixels.width + Math.floor(u * pixels.width)) * 4;
};

/**
 * The same read with (u, v) held inside the image (036): a point beyond the edge gets the color of the nearest edge
 * pixel, so the floor continues past the map instead of turning black, and the two sides of an edge keep their own
 * colors. Corners give the corner pixel.
 */
const clampedMapIndex = (map: FrameScene['map'], x: number, y: number): number => {
  if (!map) return -1;
  const { area, pixels } = map;
  const column = Math.min(pixels.width - 1, Math.max(0, Math.floor(((x - area.x) / area.width) * pixels.width)));
  const row = Math.min(pixels.height - 1, Math.max(0, Math.floor(((y - area.y) / area.height) * pixels.height)));
  return (row * pixels.width + column) * 4;
};

/**
 * The map's RGB at a world point, or null when there is no image, the point is outside it (`clamp` reads the nearest
 * edge instead) or that pixel is transparent — a hole in the map image shows the neutral color, not black.
 */
const mapColorAt = (map: FrameScene['map'], x: number, y: number, clamp: boolean): number[] | null => {
  if (!map) return null;
  const index = clamp ? clampedMapIndex(map, x, y) : mapIndex(map, x, y);
  if (index < 0) return null;
  const { data } = map.pixels;
  if (data[index + 3] < 128) return null;
  return [data[index], data[index + 1], data[index + 2]];
};

/**
 * The walls in front of each screen column, near to far (036). One distance per column — the z-buffer of 034 — is not
 * enough once a mask can ask for a low wall: the view goes over it, and a figure is hidden in a row only by a face
 * that is nearer than the figure AND whose top is at or above that row.
 */
export interface ColumnWalls {
  columns: number;
  /** How many faces each column has (≤ `MAX_FACES_PER_RAY`). */
  counts: Uint8Array;
  /** Per column and face, near to far: the perpendicular distance and the first row the wall paints — its top surface
   *  included when it is a low wall seen from above (`faceTops` is where the vertical face itself starts). */
  depths: Float32Array;
  tops: Float32Array;
  faceTops: Float32Array;
  /** One past the last row the face paints, and the color it paints them with (r, g, b, shade). */
  bottoms: Float32Array;
  colors: Float32Array;
  /** Where along the wall texture the ray struck the face, in copies of the picture (036). */
  offsets: Float32Array;
}

/** The first row of `column` covered by a wall nearer than `depth` — everything from that row down is hidden. */
export const hiddenFrom = (walls: ColumnWalls, column: number, depth: number): number => {
  if (column < 0 || column >= walls.columns) return Infinity;
  const base = column * MAX_FACES_PER_RAY;
  let first = Infinity;
  for (let i = 0; i < walls.counts[column]; i++) {
    // Near to far: once a face is not nearer than the figure, neither is any face after it.
    if (walls.depths[base + i] >= depth) break;
    if (walls.tops[base + i] < first) first = walls.tops[base + i];
  }
  return first;
};

/** True when a figure at `depth` is behind a nearer wall in `column`, row `y`. */
export const hiddenAt = (walls: ColumnWalls, column: number, y: number, depth: number): boolean =>
  y >= hiddenFrom(walls, column, depth);

/**
 * Fills `frame` (RGBA, `width × height`) with what the camera sees and says where each figure landed (036). `fov` is
 * the horizontal field of view in degrees; the horizon is always the middle of the frame.
 * The column is painted as the eye reads it: sky above the horizon and the floor below it as the base, then the walls
 * from the farthest to the nearest, so a low wall leaves the ground and the walls behind it showing above its top.
 */
export const drawRaycastFrame = (
  frame: PixelBuffer,
  scene: FrameScene,
  pose: CameraPose,
  fov: number,
  sky: number[][] = skyGradient(Math.round(frame.height / 2)),
): FrameResult => {
  const { width, height, data } = frame;
  const { mask, map, background } = scene;
  const texture = scene.wallTexture ?? null;
  const projection = projectionOf(width, fov);
  const horizon = Math.round(height / 2);
  const maxDistance = mask
    ? Math.hypot(mask.cols * mask.cellWidth, mask.rows * mask.cellHeight)
      + Math.hypot(pose.x - (mask.originX + (mask.cols * mask.cellWidth) / 2), pose.z - (mask.originY + (mask.rows * mask.cellHeight) / 2))
    : 0;
  const faces = width * MAX_FACES_PER_RAY;
  const walls: ColumnWalls = {
    columns: width,
    counts: new Uint8Array(width),
    depths: new Float32Array(faces),
    tops: new Float32Array(faces),
    faceTops: new Float32Array(faces),
    bottoms: new Float32Array(faces),
    colors: new Float32Array(faces * 4),
    offsets: new Float32Array(faces),
  };
  /** Rows of one column that a wall paints: the floor is not computed for them. */
  const covered = new Uint8Array(height);
  const push = mask ? WALL_PUSH * Math.min(mask.cellWidth, mask.cellHeight) : 0;

  for (let x = 0; x < width; x++) {
    const offset = columnAngle(x, width, projection);
    const angle = pose.yaw + offset;
    const hits = mask ? castRay(mask, pose.x, pose.z, angle, maxDistance) : [];
    const base = x * MAX_FACES_PER_RAY;
    // A point of the horizontal plane `planeHeight` above the floor seen through row `y` of this column (null at or above
    // the horizon): the top surface of a low wall, which the eye looks down on.
    const dirX = Math.sin(angle);
    const dirY = -Math.cos(angle);
    const cosOffset = Math.cos(offset);
    const planePoint = (y: number, planeHeight: number): { x: number; y: number; depth: number } | null => {
      const below = y + 0.5 - height / 2;
      if (below <= 0) return null;
      const depth = ((EYE_HEIGHT - planeHeight) * projection) / below;
      const distance = depth / cosOffset;
      return { x: pose.x + dirX * distance, y: pose.z + dirY * distance, depth };
    };

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const perpendicular = perpendicularDistance(hit, offset);
      const wall = wallColumn(perpendicular, height, projection, hit.height);
      // The wall takes the color of the map image where the ray struck it, a little inside the wall; a point past the
      // edge of the image takes the color of that edge (036).
      const wx = hit.x + Math.sin(angle) * push;
      const wy = hit.y - Math.cos(angle) * push;
      const rgb = mapColorAt(map, wx, wy, false) ?? mapColorAt(map, wx, wy, true) ?? DEFAULT_WALL;
      const at = base + i;
      walls.depths[at] = perpendicular;
      walls.faceTops[at] = Math.min(height, Math.max(0, Math.round(wall.top)));
      walls.tops[at] = walls.faceTops[at];
      walls.bottoms[at] = Math.min(height, Math.max(0, Math.round(wall.bottom)));
      // A wall lower than the eye shows its top: rows above the face, as far as the wall goes along the ray (the next
      // point that is not on a cell of the same height). Those rows are the wall's too.
      const planeHeight = hit.height * WALL_HEIGHT;
      if (mask && planeHeight < EYE_HEIGHT) {
        const level = Math.round(hit.height * 255);
        for (let y = walls.faceTops[at] - 1; y >= 0; y--) {
          const point = planePoint(y, planeHeight);
          if (!point || heightAt(mask, point.x, point.y) !== level) break;
          walls.tops[at] = y;
        }
      }
      const colorAt = at * 4;
      walls.colors[colorAt] = rgb[0];
      walls.colors[colorAt + 1] = rgb[1];
      walls.colors[colorAt + 2] = rgb[2];
      walls.colors[colorAt + 3] = shade(perpendicular, hit.side);
      if (texture) walls.offsets[at] = textureOffset(hit, texture);
      for (let y = walls.tops[at]; y < walls.bottoms[at]; y++) covered[y] = 1;
    }
    walls.counts[x] = hits.length;

    // Base: sky down to the horizon, then the floor in perspective — only in the rows no wall of this column paints.
    const texX = background ? skyColumn(angle, background.repeats, background.pixels.width) : 0;
    for (let y = 0; y < horizon; y++) {
      const i = (y * width + x) * 4;
      if (background) {
        const { pixels } = background;
        const j = (Math.min(pixels.height - 1, Math.floor((y / Math.max(1, horizon)) * pixels.height)) * pixels.width + texX) * 4;
        data[i] = pixels.data[j];
        data[i + 1] = pixels.data[j + 1];
        data[i + 2] = pixels.data[j + 2];
      } else {
        const rgb = sky[Math.min(y, sky.length - 1)];
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
      }
      data[i + 3] = 255;
    }

    // Past the edge of the map image the floor goes on with the color of the nearest edge pixel (036): no black band
    // and no seam; only a transparent pixel, or no image at all, is the neutral color.
    for (let y = horizon; y < height; y++) {
      if (covered[y]) continue;
      const point = floorPoint(pose, x, y, width, height, projection);
      if (!point) continue;
      const i = (y * width + x) * 4;
      const rgb = mapColorAt(map, point.x, point.y, true) ?? DEFAULT_FLOOR;
      const floorShade = shade(point.depth);
      data[i] = rgb[0] * floorShade;
      data[i + 1] = rgb[1] * floorShade;
      data[i + 2] = rgb[2] * floorShade;
      data[i + 3] = 255;
    }

    covered.fill(0);

    // The walls, from the farthest to the nearest: what stands nearer is what the eye keeps.
    for (let f = hits.length - 1; f >= 0; f--) {
      const at = base + f;
      const colorAt = at * 4;
      const fade = walls.colors[colorAt + 3];
      const r = walls.colors[colorAt] * fade;
      const g = walls.colors[colorAt + 1] * fade;
      const b = walls.colors[colorAt + 2] * fade;
      // With a wall texture the face shows the picture, row by row; the top of a low wall (below) keeps the map.
      const column = texture ? textureColumn(walls.offsets[at], texture.width) : 0;
      for (let y = walls.faceTops[at]; y < walls.bottoms[at]; y++) {
        const p = (y * width + x) * 4;
        let pr = r;
        let pg = g;
        let pb = b;
        if (texture) {
          const row = textureRow(heightAtRow(y, height, walls.depths[at], projection), texture.height);
          const t = (row * texture.width + column) * 4;
          if (texture.data[t + 3] >= 128) {
            pr = texture.data[t] * fade;
            pg = texture.data[t + 1] * fade;
            pb = texture.data[t + 2] * fade;
          }
        }
        data[p] = pr;
        data[p + 1] = pg;
        data[p + 2] = pb;
        data[p + 3] = 255;
      }
      // The top of a low wall: the part of the map image under it, seen from above, lit like the floor.
      const planeHeight = hits[f].height * WALL_HEIGHT;
      for (let y = walls.tops[at]; y < walls.faceTops[at]; y++) {
        const point = planePoint(y, planeHeight);
        if (!point) continue;
        const rgb = mapColorAt(map, point.x, point.y, false) ?? mapColorAt(map, point.x, point.y, true) ?? DEFAULT_WALL;
        const topShade = shade(point.depth);
        const p = (y * width + x) * 4;
        data[p] = rgb[0] * topShade;
        data[p + 1] = rgb[1] * topShade;
        data[p + 2] = rgb[2] * topShade;
        data[p + 3] = 255;
      }
    }
  }

  // Figures, far to near, hidden row by row by the walls (036): above the top of a nearer wall the figure still shows.
  // The camera moves every frame, so which side of each one it sees (and whether that side must be mirrored) is
  // decided here, per figure and per frame (035).
  const place = (sprite: RenderSprite) => {
    const { image: pixels, mirrored } = chooseSprite(sprite.images, sprite.fallback, viewSeen(sprite.look, sprite.center, { x: pose.x, y: pose.z }));
    const worldHeight = sprite.width * (pixels.height / pixels.width);
    const where = projectSprite(pose, sprite.center, sprite.width, worldHeight, width, height, projection);
    return where ? { id: sprite.id, pixels, mirrored, where, radius: sprite.width * SHADOW_RADIUS_SHARE } : null;
  };
  const projected = scene.sprites
    .map(place)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.where.depth - a.where.depth);
  const drawn: FrameSprite[] = [];
  for (const { id, pixels, mirrored, where, radius } of projected) {
    const span = where.screenX1 - where.screenX0;
    const tall = where.bottom - where.top;
    if (span <= 0 || tall <= 0) continue;
    // Off the screen to the sides or below it: nothing was drawn, so nothing has a balloon (036).
    if (where.screenX1 < 0 || where.screenX0 >= width || where.bottom <= 0 || where.top >= height) continue;
    const fade = shade(where.depth);
    const screenX = (where.screenX0 + where.screenX1) / 2;
    // The shadow, under the figure and over the floor: the circle of its footprint seen from the eye — `radius × projection
    // / depth` wide and `radius × EYE_HEIGHT × projection / depth²` tall — darkens what is already painted, darkest in the
    // middle. Only below the horizon and only in the rows no nearer wall hides, like the figure itself.
    const shadowX = radius * projection / where.depth;
    const shadowY = Math.max(0.75, (radius * EYE_HEIGHT * projection) / (where.depth * where.depth));
    const feet = where.bottom;
    for (let x = Math.max(0, Math.floor(screenX - shadowX)); x <= Math.min(width - 1, Math.ceil(screenX + shadowX)); x++) {
      const hiddenRow = hiddenFrom(walls, x, where.depth);
      const dx = (x + 0.5 - screenX) / shadowX;
      for (let y = Math.max(horizon, Math.floor(feet - shadowY)); y <= Math.min(height - 1, hiddenRow - 1, Math.ceil(feet + shadowY)); y++) {
        const t = dx * dx + ((y + 0.5 - feet) / shadowY) ** 2;
        if (t >= 1) continue;
        const keep = 1 - SHADOW_ALPHA * (1 - t) ** SHADOW_SOFTNESS;
        const i = (y * width + x) * 4;
        data[i] *= keep;
        data[i + 1] *= keep;
        data[i + 2] *= keep;
      }
    }
    const headColumn = Math.floor(screenX);
    const first = Math.max(0, Math.ceil(where.top));
    const last = Math.min(height - 1, Math.floor(where.bottom));
    let painted = false;
    for (let x = Math.max(0, Math.ceil(where.screenX0)); x <= Math.min(width - 1, Math.floor(where.screenX1)); x++) {
      // From the top of a nearer wall down the wall is what the eye keeps: the figure shows only above it (036).
      const hiddenRow = hiddenFrom(walls, x, where.depth);
      if (hiddenRow <= first) continue;
      const column = Math.min(pixels.width - 1, Math.floor(((x + 0.5 - where.screenX0) / span) * pixels.width));
      // Mirrored: the opposite side's drawing, so the character's other arm is the one showing.
      const texX = mirrored ? pixels.width - 1 - column : column;
      for (let y = first; y <= Math.min(last, hiddenRow - 1); y++) {
        const texY = Math.min(pixels.height - 1, Math.floor(((y + 0.5 - where.top) / tall) * pixels.height));
        const j = (texY * pixels.width + texX) * 4;
        if (pixels.data[j + 3] < 128) continue;
        const i = (y * width + x) * 4;
        data[i] = pixels.data[j] * fade;
        data[i + 1] = pixels.data[j + 1] * fade;
        data[i + 2] = pixels.data[j + 2] * fade;
        data[i + 3] = 255;
        painted = true;
      }
    }
    if (!painted) continue;
    drawn.push({
      id,
      screenX,
      top: where.top,
      bottom: where.bottom,
      depth: where.depth,
      headVisible: headColumn >= 0 && headColumn < width && !hiddenAt(walls, headColumn, first, where.depth),
    });
  }

  return { frameWidth: width, frameHeight: height, sprites: drawn };
};
