import { describe, expect, it } from 'vitest';
import { drawRaycastFrame, skyGradient } from './raycastFrame';
import type { FrameScene, PixelBuffer, RenderSprite } from './raycastFrame';
import { buildMaskGrid } from './raycaster';
import type { CameraPose } from './raycaster';

const WIDTH = 64;
const HEIGHT = 36;
const AREA = { x: 0, y: 0, width: 500, height: 500 };

/** A 5 × 5 mask of 100 px cells with one wall row at y 100–200 (row 1). */
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

const camera: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

const render = (scene: Partial<FrameScene>, pose: CameraPose = camera) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  const zBuffer = new Float32Array(WIDTH);
  drawRaycastFrame(frame, zBuffer, { mask: null, map: null, background: null, sprites: [], ...scene }, pose, 70, skyGradient(HEIGHT / 2));
  const at = (x: number, y: number) => [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
  return { at, zBuffer, frame };
};

describe('drawRaycastFrame', () => {
  it('draws sky above, wall in the middle and floor below, in every column, all opaque', () => {
    const { at, frame } = render({ mask: wallRowMask() });

    const sky = at(32, 0);
    const wall = at(32, 18);
    const floor = at(32, 35);
    expect(sky[0]).toBeLessThan(40); // the dark top of the gradient
    expect(wall.slice(0, 3)).not.toEqual(sky.slice(0, 3));
    expect(floor.slice(0, 3)).not.toEqual(wall.slice(0, 3));
    for (let i = 3; i < frame.data.length; i += 4) expect(frame.data[i]).toBe(255);
  });

  it('puts the walls distance in the z-buffer (perpendicular, so a straight wall is flat) and Infinity without walls', () => {
    const { zBuffer } = render({ mask: wallRowMask() });
    expect(zBuffer[32]).toBeCloseTo(250, 0);
    expect(zBuffer[0]).toBeCloseTo(250, 0);
    expect(zBuffer[63]).toBeCloseTo(250, 0);

    expect(render({}).zBuffer.every((value) => value === Infinity)).toBe(true);
  });

  it('draws a closer wall taller than a farther one', () => {
    const wallRows = (pose: CameraPose) => {
      const { at } = render({ mask: wallRowMask() }, pose);
      const sky = at(32, 0).slice(0, 3);
      let rows = 0;
      for (let y = 0; y < HEIGHT; y++) {
        const p = at(32, y).slice(0, 3);
        const isSky = y < HEIGHT / 2 && p.every((v, i) => Math.abs(v - skyGradient(HEIGHT / 2)[y][i]) < 1.5);
        if (!isSky && y < HEIGHT / 2) rows += 1;
      }
      return { rows, sky };
    };

    expect(wallRows({ ...camera, z: 300 }).rows).toBeGreaterThan(wallRows(camera).rows);
  });

  it('takes the color of the wall from the map image where the ray struck it', () => {
    const { at } = render({ mask: wallRowMask(), map: { pixels: solid(200, 40, 40), area: AREA } });

    const [r, g, b] = at(32, 18);
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
  });

  it('paints the floor from the map image in perspective', () => {
    const { at } = render({ map: { pixels: solid(40, 200, 40), area: AREA } });

    const [r, g] = at(32, 35);
    expect(g).toBeGreaterThan(r * 2);
  });

  it('shows the background panorama above the horizon where no wall stands, and not below it', () => {
    const { at } = render({ background: { pixels: solid(0, 200, 0), repeats: 1 } });

    expect(at(10, 0).slice(0, 3)).toEqual([0, 200, 0]);
    expect(at(10, 10).slice(0, 3)).toEqual([0, 200, 0]);
    expect(at(10, 30)[1]).toBeLessThan(100); // the floor, not the panorama
  });

  it('turns the panorama with the camera', () => {
    const stripes: PixelBuffer = { data: new Uint8ClampedArray(8 * 2 * 4), width: 8, height: 2 };
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) stripes.data.set(x % 2 === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * 8 + x) * 4);
    }
    const a = render({ background: { pixels: stripes, repeats: 1 } }, { ...camera, yaw: 0 });
    const b = render({ background: { pixels: stripes, repeats: 1 } }, { ...camera, yaw: 0.4 });

    const row = (frame: PixelBuffer) => Array.from({ length: WIDTH }, (_, x) => frame.data[(2 * WIDTH + x) * 4]).join(',');
    expect(row(a.frame)).not.toBe(row(b.frame));
  });

  describe('figures', () => {
    const figure = (id: number, x: number, y: number): RenderSprite => ({
      id, pixels: solid(255, 0, 0), center: { x, y }, width: 60, heightRatio: 1,
    });
    const isRed = (pixel: number[]) => pixel[0] > 100 && pixel[1] < 40 && pixel[2] < 40;

    it('draws a figure in front of a wall, standing with its feet on the floor', () => {
      const { at } = render({ mask: wallRowMask(), sprites: [figure(1, 250, 300)] });

      expect(isRed(at(32, 22))).toBe(true);
    });

    it('hides a figure that stands behind the wall', () => {
      const { at } = render({ mask: wallRowMask(), sprites: [figure(1, 250, 50)] });

      expect(isRed(at(32, 18))).toBe(false);
    });

    it('hides only the columns a wall covers: the figure shows past the end of the wall', () => {
      // A wall only in the left half of the row (cells 0–1); the figure sits behind it, ahead and to the right.
      const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
      for (const x of [0, 1]) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
      const mask = buildMaskGrid(pixels, 5, 5, AREA);
      const { at } = render({ mask, sprites: [{ ...figure(1, 280, 50), width: 400 }] }, { ...camera, x: 250 });

      const reds = Array.from({ length: WIDTH }, (_, x) => isRed(at(x, 20)));
      expect(reds.some(Boolean)).toBe(true);
      expect(reds.every(Boolean)).toBe(false);
    });

    it('draws the nearer figure over the farther one', () => {
      const far = { ...figure(1, 250, 250), pixels: solid(0, 255, 0) };
      const near = { ...figure(2, 250, 350), pixels: solid(255, 0, 0) };

      const { at } = render({ sprites: [near, far] });

      expect(isRed(at(32, 24))).toBe(true);
    });

    it('leaves transparent pixels of a figure alone', () => {
      const clear = { ...figure(1, 250, 300), pixels: solid(255, 0, 0, 0) };
      const { at } = render({ sprites: [clear] });

      expect(isRed(at(32, 22))).toBe(false);
    });
  });
});
