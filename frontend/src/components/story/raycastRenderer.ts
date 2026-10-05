import { drawRaycastFrame, skyGradient } from '../../lib/raycastFrame';
import type { FrameResult, PixelBuffer, RenderSprite } from '../../lib/raycastFrame';
import type { CameraPose, MapArea, MaskGrid } from '../../lib/raycaster';
import { skyRepeats } from '../../lib/raycaster';

export type { RenderSprite } from '../../lib/raycastFrame';
export type { FrameResult } from '../../lib/raycastFrame';

/**
 * Puts the 3D view (034) on a canvas the way Wolfenstein 3D did: a small frame — one ray per column, at most
 * `MAX_COLUMNS` wide — drawn by `lib/raycastFrame` and blown up to the canvas without smoothing. Only redraws when
 * something changed.
 */

const MAX_COLUMNS = 480;

export interface RaycastRenderer {
  setMap: (pixels: PixelBuffer | null, area: MapArea | null) => void;
  setMask: (grid: MaskGrid | null) => void;
  setBackground: (pixels: PixelBuffer | null) => void;
  /** The picture that covers every wall (036); null = the walls take the colors of the map image. */
  setWallTexture: (pixels: PixelBuffer | null) => void;
  setSprites: (sprites: readonly RenderSprite[]) => void;
  setCamera: (pose: CameraPose, fov: number) => void;
  resize: (width: number, height: number) => void;
  /** Draws again without anything changing (036: a new speech balloon must be placed at once). */
  refresh: () => void;
  dispose: () => void;
}

/** Thrown when the device has no 2D canvas (FR-017): the page goes back to the 2D map. */
export class CanvasUnavailableError extends Error {
  constructor() {
    super('Canvas 2D unavailable');
    this.name = 'CanvasUnavailableError';
  }
}

export const createRaycastRenderer = (canvas: HTMLCanvasElement, onFrame?: (result: FrameResult) => void): RaycastRenderer => {
  const display = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d');
  if (!display || !bufferCtx) throw new CanvasUnavailableError();

  let mask: MaskGrid | null = null;
  let map: { pixels: PixelBuffer; area: MapArea } | null = null;
  let background: { pixels: PixelBuffer; repeats: number } | null = null;
  let wallTexture: PixelBuffer | null = null;
  let sprites: readonly RenderSprite[] = [];
  let pose: CameraPose = { x: 0, z: 0, yaw: 0, attached: false };
  let fov = 70;
  let image = bufferCtx.createImageData(1, 1);
  let sky = skyGradient(1);
  let dirty = true;
  let disposed = false;
  let animation = 0;

  const draw = () => {
    const result = drawRaycastFrame(image, { mask, map, background, sprites, wallTexture }, pose, fov, sky);
    bufferCtx.putImageData(image, 0, 0);
    display.imageSmoothingEnabled = false;
    display.drawImage(buffer, 0, 0, canvas.width, canvas.height);

    // What the frame drew, for the things laid over it (the speech balloons, 036).
    onFrame?.(result);
  };

  const loop = () => {
    animation = requestAnimationFrame(loop);
    if (!dirty || disposed) return;
    dirty = false;
    draw();
  };
  animation = requestAnimationFrame(loop);

  return {
    setMap: (pixels, area) => {
      map = pixels && area ? { pixels, area } : null;
      dirty = true;
    },
    setMask: (grid) => {
      mask = grid;
      dirty = true;
    },
    setBackground: (pixels) => {
      background = pixels ? { pixels, repeats: skyRepeats(pixels.width, pixels.height) } : null;
      dirty = true;
    },
    setWallTexture: (pixels) => {
      wallTexture = pixels;
      dirty = true;
    },
    setSprites: (next) => {
      sprites = next;
      dirty = true;
    },
    setCamera: (next, nextFov) => {
      pose = next;
      fov = nextFov;
      dirty = true;
    },
    resize: (width, height) => {
      if (width <= 0 || height <= 0) return;
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const columns = Math.max(1, Math.min(MAX_COLUMNS, Math.round(width)));
      const rows = Math.max(1, Math.round((columns * height) / width));
      buffer.width = columns;
      buffer.height = rows;
      image = bufferCtx.createImageData(columns, rows);
      sky = skyGradient(Math.round(rows / 2));
      dirty = true;
    },
    refresh: () => {
      dirty = true;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animation);
    },
  };
};
