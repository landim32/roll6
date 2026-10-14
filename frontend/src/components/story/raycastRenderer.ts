import { clearLayer, drawFigureLayer } from '../../lib/figureLayer';
import { drawRaycastFrame, skyGradient } from '../../lib/raycastFrame';
import type { FrameResult, PixelBuffer, RenderSprite } from '../../lib/raycastFrame';
import type { CameraPose, MapArea, MaskGrid } from '../../lib/raycaster';
import { skyRepeats } from '../../lib/raycaster';
import { QUALITY_PROFILES } from '../../lib/viewQuality';
import type { QualityProfile } from '../../lib/viewQuality';

export type { RenderSprite } from '../../lib/raycastFrame';
export type { FrameResult } from '../../lib/raycastFrame';

/**
 * Puts the 3D view (034) on a canvas the way Wolfenstein 3D did: a small frame — one ray per column, at most
 * `profile.columns` wide (053: 480 on "Padrão", the value of before) — drawn by `lib/raycastFrame` and blown up to the
 * canvas without smoothing. Only redraws when something changed. On "Ultra" the figures leave the frame for a
 * transparent canvas the size of the screen (`lib/figureLayer`), composed over the blown-up frame.
 */

export interface RaycastRenderer {
  setMap: (pixels: PixelBuffer | null, area: MapArea | null) => void;
  setMask: (grid: MaskGrid | null) => void;
  setBackground: (pixels: PixelBuffer | null) => void;
  /** The picture that covers every wall (036); null = the walls take the colors of the map image. */
  setWallTexture: (pixels: PixelBuffer | null) => void;
  setSprites: (sprites: readonly RenderSprite[]) => void;
  setCamera: (pose: CameraPose, fov: number) => void;
  resize: (width: number, height: number) => void;
  /** The quality level (053): the frame's width, how the figures are sampled and whether they get their own layer. */
  setQuality: (profile: QualityProfile) => void;
  /** Draws again without anything changing (036: a new speech balloon must be placed at once). */
  refresh: () => void;
  /**
   * Receives, after every frame, the depth of the figures it painted (057) — for the 3D models' layer, so a model behind
   * a nearer figure is hidden. The frame's size on Padrão/Alta, the screen's on Ultra; null stops it (no buffer kept).
   */
  setFigureDepthSink: (sink: FigureDepthSink | null) => void;
  dispose: () => void;
}

/** The figure depth of one frame (057): `width × height` distances, row 0 at the top, `0` where no figure is. */
export interface FigureDepthMap {
  data: Float32Array;
  width: number;
  height: number;
}

export type FigureDepthSink = (map: FigureDepthMap) => void;

/** Thrown when the device has no 2D canvas (FR-017): the page goes back to the 2D map. */
export class CanvasUnavailableError extends Error {
  constructor() {
    super('Canvas 2D unavailable');
    this.name = 'CanvasUnavailableError';
  }
}

export const createRaycastRenderer = (
  canvas: HTMLCanvasElement,
  onFrame?: (result: FrameResult) => void,
  initialProfile: QualityProfile = QUALITY_PROFILES.standard,
): RaycastRenderer => {
  const display = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d');
  if (!display || !bufferCtx) throw new CanvasUnavailableError();

  let profile = initialProfile;
  let mask: MaskGrid | null = null;
  let map: { pixels: PixelBuffer; area: MapArea } | null = null;
  let background: { pixels: PixelBuffer; repeats: number } | null = null;
  let wallTexture: PixelBuffer | null = null;
  let sprites: readonly RenderSprite[] = [];
  let pose: CameraPose = { x: 0, z: 0, yaw: 0, attached: false };
  let fov = 70;
  let image = bufferCtx.createImageData(1, 1);
  let sky = skyGradient(1);
  let lastSize: { width: number; height: number } | null = null;
  let dirty = true;
  let disposed = false;
  let depthSink: FigureDepthSink | null = null;
  /** Reused frame to frame; re-made only when the size it must cover changes. */
  let depthBuffer: Float32Array | null = null;
  const depthFor = (width: number, height: number): Float32Array => {
    if (!depthBuffer || depthBuffer.length !== width * height) depthBuffer = new Float32Array(width * height);
    return depthBuffer;
  };
  let animation = 0;

  /** The screen-size figure layer of "Ultra" (053), made the first time a profile asks for it and sized with the canvas. */
  let figureCanvas: HTMLCanvasElement | null = null;
  let figureCtx: CanvasRenderingContext2D | null = null;
  let figureImage: ImageData | null = null;

  const ensureFigureLayer = (): boolean => {
    if (!profile.figureLayer || canvas.width <= 0 || canvas.height <= 0) return false;
    if (!figureCanvas) {
      figureCanvas = document.createElement('canvas');
      figureCtx = figureCanvas.getContext('2d');
      if (!figureCtx) {
        figureCanvas = null;
        return false;
      }
    }
    if (!figureImage || figureCanvas.width !== canvas.width || figureCanvas.height !== canvas.height) {
      figureCanvas.width = canvas.width;
      figureCanvas.height = canvas.height;
      figureImage = figureCtx!.createImageData(canvas.width, canvas.height);
    }
    return true;
  };

  const draw = () => {
    const layered = ensureFigureLayer();
    const frameDepth = depthSink && !layered ? depthFor(image.width, image.height) : undefined;
    const result = drawRaycastFrame(image, { mask, map, background, sprites, wallTexture }, pose, fov, sky, {
      spriteSampling: profile.spriteSampling,
      figures: layered ? 'layer' : 'frame',
      figureDepth: frameDepth,
    });
    bufferCtx.putImageData(image, 0, 0);
    display.imageSmoothingEnabled = false;
    display.drawImage(buffer, 0, 0, canvas.width, canvas.height);

    if (layered && result.layer && figureImage && figureCanvas && figureCtx) {
      const target = { data: figureImage.data, width: figureImage.width, height: figureImage.height };
      clearLayer(target);
      const layerDepth = depthSink ? depthFor(target.width, target.height) : undefined;
      drawFigureLayer(target, result.layer, result.frameWidth, result.frameHeight, layerDepth);
      if (depthSink && layerDepth) depthSink({ data: layerDepth, width: target.width, height: target.height });
      figureCtx.putImageData(figureImage, 0, 0);
      display.drawImage(figureCanvas, 0, 0);
    }

    if (depthSink && frameDepth) depthSink({ data: frameDepth, width: image.width, height: image.height });

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

  const resize = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    lastSize = { width, height };
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    const columns = Math.max(1, Math.min(profile.columns, Math.round(width)));
    const rows = Math.max(1, Math.round((columns * height) / width));
    buffer.width = columns;
    buffer.height = rows;
    image = bufferCtx.createImageData(columns, rows);
    sky = skyGradient(Math.round(rows / 2));
    dirty = true;
  };

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
    resize,
    setQuality: (next) => {
      profile = next;
      // A new width of the frame: measure again with the last size; the camera stays where it is.
      if (lastSize) resize(lastSize.width, lastSize.height);
      dirty = true;
    },
    refresh: () => {
      dirty = true;
    },
    setFigureDepthSink: (sink) => {
      depthSink = sink;
      if (!sink) depthBuffer = null;
      dirty = true;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animation);
    },
  };
};
