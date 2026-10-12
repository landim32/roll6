import { describe, expect, it } from 'vitest';
import { drawRaycastFrame, skyGradient } from './raycastFrame';
import type { FrameOptions, FrameScene, PixelBuffer, RenderSprite } from './raycastFrame';
import { buildMaskGrid } from './raycaster';
import type { CameraPose } from './raycaster';

/**
 * The quality options of 053. The reference frame (`raycastFrame.test.ts`) already pins the default path byte for byte;
 * here: the default equals the explicit "nearest in the frame", "smooth" softens the edges without moving the figure,
 * and "layer" paints the shadow but not the figure and hands it back for the screen-size layer.
 */

const WIDTH = 64;
const HEIGHT = 36;
const AREA = { x: 0, y: 0, width: 500, height: 500 };
const camera: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

/** A 5 × 5 mask of 100 px cells with one wall row at y 100–200. */
const wallRowMask = () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
  for (let x = 0; x < 5; x++) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
  return buildMaskGrid(pixels, 5, 5, AREA);
};

const solid = (r: number, g: number, b: number, a = 255, size = 4): PixelBuffer => ({
  data: new Uint8ClampedArray(Array.from({ length: size * size }, () => [r, g, b, a]).flat()),
  width: size,
  height: size,
});

/** 8 × 8 red with a transparent border of 2 texels: the figure has edges inside its box, where smoothing shows. */
const ringed = (): PixelBuffer => {
  const size = 8;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = x >= 2 && x < 6 && y >= 2 && y < 6;
      data.set(inside ? [255, 0, 0, 255] : [0, 0, 0, 0], (y * size + x) * 4);
    }
  }
  return { data, width: size, height: size };
};

const figure = (pixels: PixelBuffer, x = 250, y = 300): RenderSprite => ({
  id: 1, center: { x, y }, width: 60, look: 0, images: { front: pixels, right: pixels, left: pixels, back: pixels }, fallback: pixels,
});

const render = (scene: Partial<FrameScene>, options?: FrameOptions) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  const result = drawRaycastFrame(frame, { mask: null, map: null, background: null, sprites: [], ...scene }, camera, 70, skyGradient(HEIGHT / 2), options);
  const at = (x: number, y: number) => [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
  return { at, frame, result };
};

const isRed = (pixel: number[]) => pixel[0] > 100 && pixel[1] < 40 && pixel[2] < 40;

describe('quality options (053)', () => {
  it('without options the frame is the "nearest, in the frame" one, byte for byte', () => {
    const plain = render({ sprites: [figure(solid(255, 0, 0))] });
    const explicit = render({ sprites: [figure(solid(255, 0, 0))] }, { spriteSampling: 'nearest', figures: 'frame' });

    expect(explicit.frame.data).toEqual(plain.frame.data);
    expect(explicit.result).toEqual(plain.result);
  });

  it('"smooth" keeps the figure where it was and softens its edges', () => {
    const nearest = render({ sprites: [figure(ringed())] });
    const smooth = render({ sprites: [figure(ringed())] }, { spriteSampling: 'smooth' });

    expect(smooth.result.sprites).toHaveLength(1);
    expect(smooth.result.sprites[0]).toEqual(nearest.result.sprites[0]);
    expect(isRed(smooth.at(32, 22))).toBe(true);
    // A pixel half red and half background exists only in the smooth frame: nearest paints a texel or nothing.
    const mixed = (at: (x: number, y: number) => number[]) => {
      let found = false;
      for (let y = 0; y < HEIGHT && !found; y++) {
        for (let x = 0; x < WIDTH && !found; x++) {
          const [r, g, b] = at(x, y);
          found = r > 90 && r < 180 && g < 60 && b < 80;
        }
      }
      return found;
    };
    expect(mixed(nearest.at)).toBe(false);
    expect(mixed(smooth.at)).toBe(true);
  });

  it('"layer" paints the shadow but not the figure, and hands the figure to the layer', () => {
    const empty = render({});
    const inFrame = render({ sprites: [figure(solid(255, 0, 0))] });
    const layered = render({ sprites: [figure(solid(255, 0, 0))] }, { figures: 'layer' });

    expect(isRed(inFrame.at(32, 22))).toBe(true);
    expect(isRed(layered.at(32, 22))).toBe(false);
    expect(layered.at(32, 22)).toEqual(empty.at(32, 22));
    // The feet land on the last row (bottom ≈ 36.2): there the frame shows the figure, the layer render shows the floor
    // darkened by the shadow, which stays in the frame.
    const feet = HEIGHT - 1;
    expect(isRed(inFrame.at(32, feet))).toBe(true);
    expect(isRed(layered.at(32, feet))).toBe(false);
    expect(layered.at(32, feet)[0]).toBeLessThan(empty.at(32, feet)[0]);
    // The balloon data is the same, and the layer gets the projection.
    expect(layered.result.sprites).toEqual(inFrame.result.sprites);
    expect(layered.result.layer?.sprites).toHaveLength(1);
    const handed = layered.result.layer!.sprites[0];
    expect(handed.id).toBe(1);
    expect(handed.mirrored).toBe(false);
    expect(handed.fade).toBeGreaterThan(0);
    expect(handed.where.top).toBe(inFrame.result.sprites[0].top);
    expect(handed.where.bottom).toBe(inFrame.result.sprites[0].bottom);
    expect((handed.where.screenX0 + handed.where.screenX1) / 2).toBe(inFrame.result.sprites[0].screenX);
    expect(layered.result.layer!.walls.columns).toBe(WIDTH);
  });

  it('"layer" leaves out a figure wholly behind a wall, like the frame does', () => {
    const layered = render({ mask: wallRowMask(), sprites: [figure(solid(255, 0, 0), 250, 50)] }, { figures: 'layer' });

    expect(layered.result.sprites).toEqual([]);
    expect(layered.result.layer?.sprites).toEqual([]);
  });

  it('has no `layer` unless asked', () => {
    expect(render({ sprites: [figure(solid(255, 0, 0))] }).result.layer).toBeUndefined();
    expect(render({ sprites: [figure(solid(255, 0, 0))] }, { spriteSampling: 'smooth' }).result.layer).toBeUndefined();
  });
});
