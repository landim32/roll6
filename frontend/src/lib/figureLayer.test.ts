import { describe, expect, it } from 'vitest';
import { clearLayer, drawFigureLayer } from './figureLayer';
import type { LayerTarget } from './figureLayer';
import { drawRaycastFrame, skyGradient } from './raycastFrame';
import type { FrameLayer, FrameScene, PixelBuffer, RenderSprite } from './raycastFrame';
import { buildMaskGrid } from './raycaster';
import type { CameraPose } from './raycaster';

const WIDTH = 64;
const HEIGHT = 36;
const SCALE = 3;
const AREA = { x: 0, y: 0, width: 500, height: 500 };
const camera: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

const solid = (r: number, g: number, b: number, a = 255, size = 4): PixelBuffer => ({
  data: new Uint8ClampedArray(Array.from({ length: size * size }, () => [r, g, b, a]).flat()),
  width: size,
  height: size,
});

/** 8 × 8 red with a transparent border of 2 texels. */
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

const figure = (pixels: PixelBuffer, x = 250, y = 300, width = 60): RenderSprite => ({
  id: 1, center: { x, y }, width, look: 0, images: { front: pixels, right: pixels, left: pixels, back: pixels }, fallback: pixels,
});

/** Renders the scene in layer mode and returns what the frame handed to the layer, plus where the figure landed. */
const layerOf = (scene: Partial<FrameScene>) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  const result = drawRaycastFrame(frame, { mask: null, map: null, background: null, sprites: [], ...scene }, camera, 70, skyGradient(HEIGHT / 2), { figures: 'layer' });
  return { layer: result.layer as FrameLayer, sprites: result.sprites };
};

const target = (): LayerTarget => ({ data: new Uint8ClampedArray(WIDTH * SCALE * HEIGHT * SCALE * 4), width: WIDTH * SCALE, height: HEIGHT * SCALE });
const alphaAt = (t: LayerTarget, x: number, y: number) => t.data[(y * t.width + x) * 4 + 3];
const redAt = (t: LayerTarget, x: number, y: number) => t.data[(y * t.width + x) * 4];

describe('figure layer (053, Ultra)', () => {
  it('draws the figure scaled to the layer, opaque inside and empty outside', () => {
    const { layer, sprites } = layerOf({ sprites: [figure(solid(255, 0, 0))] });
    const t = target();
    drawFigureLayer(t, layer, WIDTH, HEIGHT);

    const [where] = sprites;
    const cx = Math.round(where.screenX * SCALE);
    const cy = Math.round(((where.top + where.bottom) / 2) * SCALE);
    expect(alphaAt(t, cx, cy)).toBe(255);
    expect(redAt(t, cx, cy)).toBeGreaterThan(100);
    expect(alphaAt(t, 0, 0)).toBe(0);
    expect(alphaAt(t, t.width - 1, t.height - 1)).toBe(0);
    // Nothing above the head nor beside the figure (its feet land on the last row of the frame).
    expect(alphaAt(t, cx, Math.floor(where.top * SCALE) - 2)).toBe(0);
    expect(alphaAt(t, Math.floor(layer.sprites[0].where.screenX0 * SCALE) - 2, cy)).toBe(0);
    expect(alphaAt(t, Math.ceil(layer.sprites[0].where.screenX1 * SCALE) + 2, cy)).toBe(0);
  });

  it('gives the edges of the figure a partial coverage (the soft edge)', () => {
    const { layer } = layerOf({ sprites: [figure(ringed())] });
    const t = target();
    drawFigureLayer(t, layer, WIDTH, HEIGHT);

    let partial = 0;
    for (let i = 3; i < t.data.length; i += 4) if (t.data[i] > 0 && t.data[i] < 255) partial += 1;
    expect(partial).toBeGreaterThan(0);
  });

  it('hides the columns a nearer wall covers, from the top of the wall down', () => {
    // A wall only in the left half of the row; a wide figure behind it, so its right half shows past the wall's end.
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (const x of [0, 1]) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
    const mask = buildMaskGrid(pixels, 5, 5, AREA);
    const { layer, sprites } = layerOf({ mask, sprites: [figure(solid(255, 0, 0), 280, 50, 400)] });
    expect(sprites).toHaveLength(1);
    const t = target();
    drawFigureLayer(t, layer, WIDTH, HEIGHT);

    // The wall's top lands around frame row 7–9 in the left columns (0–24); the figure reaches from above the frame
    // (top < 0) down to row ≈ 24.8. Below the wall's top the left is hidden and the right shows…
    const below = 12 * SCALE;
    const alphas = Array.from({ length: t.width }, (_, x) => alphaAt(t, x, below));
    expect(alphas.slice(0, 20 * SCALE).every((a) => a === 0)).toBe(true);
    expect(alphas.slice(30 * SCALE, 55 * SCALE).every((a) => a > 0)).toBe(true);
    // …and above the wall's top the figure still shows on the left (the eye looks over a low wall, 036).
    expect(alphaAt(t, 16 * SCALE, 1 * SCALE)).toBeGreaterThan(0);
  });

  it('draws nothing for a figure the frame left out, and clears what it drew', () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (let x = 0; x < 5; x++) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
    const mask = buildMaskGrid(pixels, 5, 5, AREA);
    const t = target();
    drawFigureLayer(t, layerOf({ mask, sprites: [figure(solid(255, 0, 0), 250, 50)] }).layer, WIDTH, HEIGHT);
    expect(t.data.every((v) => v === 0)).toBe(true);

    drawFigureLayer(t, layerOf({ sprites: [figure(solid(255, 0, 0))] }).layer, WIDTH, HEIGHT);
    expect(t.data.some((v) => v !== 0)).toBe(true);
    clearLayer(t);
    expect(t.data.every((v) => v === 0)).toBe(true);
  });
});

describe('figure layer depth (057)', () => {
  const depthTarget = () => new Float32Array(WIDTH * SCALE * HEIGHT * SCALE).fill(-1);

  it('writes each figure\'s depth where it covers the screen, nearer wins, and paints the same bytes', () => {
    const scene = { sprites: [{ ...figure(ringed(), 250, 250), id: 1 }, { ...figure(solid(0, 0, 255), 250, 330), id: 2 }] };
    const { layer, sprites } = layerOf(scene);
    const plain = target();
    drawFigureLayer(plain, layer, WIDTH, HEIGHT);
    const painted = target();
    const depth = depthTarget();
    drawFigureLayer(painted, layer, WIDTH, HEIGHT, depth);

    expect([...painted.data]).toEqual([...plain.data]);
    expect(depth.some((value) => value < 0)).toBe(false);
    const near = sprites.find((item) => item.id === 2)!;
    const cx = Math.round(near.screenX * SCALE);
    const cy = Math.round(((near.top + near.bottom) / 2) * SCALE);
    expect(depth[cy * WIDTH * SCALE + cx]).toBeCloseTo(near.depth, 5);
    expect(depth[0]).toBe(0);
    // Wherever a depth was written the layer is mostly opaque there.
    for (let i = 0; i < depth.length; i++) if (depth[i] > 0) expect(painted.data[i * 4 + 3]).toBeGreaterThanOrEqual(127);
  });

  it('writes nothing behind a nearer wall', () => {
    // One wall row at y 100–200, between the camera (z 450) and the figure (y 50).
    const wall = buildMaskGrid(new Uint8ClampedArray(Array.from({ length: 25 }, (_, i) => (Math.floor(i / 5) === 1 ? [0, 0, 0, 255] : [255, 255, 255, 255])).flat()), 5, 5, AREA);
    const { layer } = layerOf({ mask: wall, sprites: [figure(solid(255, 0, 0), 250, 50)] });
    const depth = depthTarget();
    drawFigureLayer(target(), layer, WIDTH, HEIGHT, depth);
    for (let y = 0; y < HEIGHT * SCALE; y++) expect(depth[y * WIDTH * SCALE + 32 * SCALE]).toBe(0);
  });
});
