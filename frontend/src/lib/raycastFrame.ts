import type { Point } from './hexGrid';
import {
  castRay, columnAngle, columnVisible, floorPoint, perpendicularDistance, projectionOf, projectSprite, shade, skyColumn,
  wallColumn,
} from './raycaster';
import type { CameraPose, MapArea, MaskGrid } from './raycaster';

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

/** A figure to draw: its pixels, where its feet stand and how wide it is (map units). */
export interface RenderSprite {
  id: number;
  pixels: PixelBuffer;
  center: Point;
  width: number;
  /** Height relative to the image's natural proportion (1 standing, less lying). */
  heightRatio: number;
}

/** Everything a frame shows besides the camera. */
export interface FrameScene {
  mask: MaskGrid | null;
  /** The map image: the floor, and the color of the walls. */
  map: { pixels: PixelBuffer; area: MapArea } | null;
  /** Panorama behind the walls and how many times it repeats around the camera (`skyRepeats`). */
  background: { pixels: PixelBuffer; repeats: number } | null;
  sprites: readonly RenderSprite[];
}

const DEFAULT_WALL = [122, 116, 104];
const DEFAULT_FLOOR = [42, 46, 53];
const SKY_TOP = [18, 22, 40];
const SKY_HORIZON = [74, 78, 108];
/** How far into a wall (in cells) the color is read, so the edge pixel of the image is not what paints the wall. */
const WALL_PUSH = 0.5;

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
 * Fills `frame` (RGBA, `width × height`) and `zBuffer` (one distance per column, Infinity where no wall stands) with
 * what the camera sees. `fov` is the horizontal field of view in degrees; the horizon is always the middle of the frame.
 */
export const drawRaycastFrame = (
  frame: PixelBuffer,
  zBuffer: Float32Array,
  scene: FrameScene,
  pose: CameraPose,
  fov: number,
  sky: number[][] = skyGradient(Math.round(frame.height / 2)),
): void => {
  const { width, height, data } = frame;
  const { mask, map, background } = scene;
  const projection = projectionOf(width, fov);
  const horizon = Math.round(height / 2);
  const maxDistance = mask
    ? Math.hypot(mask.cols * mask.cellWidth, mask.rows * mask.cellHeight)
      + Math.hypot(pose.x - (mask.originX + (mask.cols * mask.cellWidth) / 2), pose.z - (mask.originY + (mask.rows * mask.cellHeight) / 2))
    : 0;

  for (let x = 0; x < width; x++) {
    const offset = columnAngle(x, width, projection);
    const angle = pose.yaw + offset;
    const hit = mask ? castRay(mask, pose.x, pose.z, angle, maxDistance) : null;
    const perpendicular = hit ? perpendicularDistance(hit, offset) : Infinity;
    zBuffer[x] = perpendicular;

    let wallTop = horizon;
    let wallBottom = horizon;
    let wallRgb: ArrayLike<number> = DEFAULT_WALL;
    let wallShade = 1;
    if (hit && mask) {
      const wall = wallColumn(perpendicular, height, projection);
      wallTop = Math.min(height, Math.max(0, Math.round(wall.top)));
      wallBottom = Math.min(height, Math.max(0, Math.round(wall.bottom)));
      wallShade = shade(perpendicular, hit.side);
      // The wall takes the color of the map image where the ray struck it, a little inside the wall.
      const push = WALL_PUSH * Math.min(mask.cellWidth, mask.cellHeight);
      const index = mapIndex(map, hit.x + Math.sin(angle) * push, hit.y - Math.cos(angle) * push);
      if (map && index >= 0) wallRgb = [map.pixels.data[index], map.pixels.data[index + 1], map.pixels.data[index + 2]];
    }

    // Sky: the panorama (turning with the camera) or the default gradient, down to the wall or the horizon.
    const skyEnd = hit ? wallTop : horizon;
    const texX = background ? skyColumn(angle, background.repeats, background.pixels.width) : 0;
    for (let y = 0; y < skyEnd; y++) {
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

    for (let y = wallTop; y < wallBottom; y++) {
      const i = (y * width + x) * 4;
      data[i] = wallRgb[0] * wallShade;
      data[i + 1] = wallRgb[1] * wallShade;
      data[i + 2] = wallRgb[2] * wallShade;
      data[i + 3] = 255;
    }

    // Floor: the map image seen in perspective, the default color outside it.
    for (let y = Math.max(wallBottom, horizon); y < height; y++) {
      const point = floorPoint(pose, x, y, width, height, projection);
      if (!point) continue;
      const i = (y * width + x) * 4;
      const index = mapIndex(map, point.x, point.y);
      const floorShade = shade(point.depth);
      if (map && index >= 0) {
        data[i] = map.pixels.data[index] * floorShade;
        data[i + 1] = map.pixels.data[index + 1] * floorShade;
        data[i + 2] = map.pixels.data[index + 2] * floorShade;
      } else {
        data[i] = DEFAULT_FLOOR[0] * floorShade;
        data[i + 1] = DEFAULT_FLOOR[1] * floorShade;
        data[i + 2] = DEFAULT_FLOOR[2] * floorShade;
      }
      data[i + 3] = 255;
    }
  }

  // Figures, far to near, hidden column by column by the walls (the z-buffer).
  const projected = scene.sprites
    .map((sprite) => {
      const worldHeight = sprite.width * (sprite.pixels.height / sprite.pixels.width) * sprite.heightRatio;
      return { sprite, where: projectSprite(pose, sprite.center, sprite.width, worldHeight, width, height, projection) };
    })
    .filter((entry): entry is { sprite: RenderSprite; where: NonNullable<typeof entry.where> } => entry.where !== null)
    .sort((a, b) => b.where.depth - a.where.depth);
  for (const { sprite, where } of projected) {
    const span = where.screenX1 - where.screenX0;
    const tall = where.bottom - where.top;
    if (span <= 0 || tall <= 0) continue;
    const fade = shade(where.depth);
    const { pixels } = sprite;
    for (let x = Math.max(0, Math.ceil(where.screenX0)); x <= Math.min(width - 1, Math.floor(where.screenX1)); x++) {
      if (!columnVisible(zBuffer, x, where.depth)) continue;
      const texX = Math.min(pixels.width - 1, Math.floor(((x + 0.5 - where.screenX0) / span) * pixels.width));
      for (let y = Math.max(0, Math.ceil(where.top)); y <= Math.min(height - 1, Math.floor(where.bottom)); y++) {
        const texY = Math.min(pixels.height - 1, Math.floor(((y + 0.5 - where.top) / tall) * pixels.height));
        const j = (texY * pixels.width + texX) * 4;
        if (pixels.data[j + 3] < 128) continue;
        const i = (y * width + x) * 4;
        data[i] = pixels.data[j] * fade;
        data[i + 1] = pixels.data[j + 1] * fade;
        data[i + 2] = pixels.data[j + 2] * fade;
        data[i + 3] = 255;
      }
    }
  }
};
