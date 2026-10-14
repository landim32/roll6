import { describe, expect, it } from 'vitest';
import { SHOT_MARGIN, SHOT_UP, shotFraming } from './poseShot';

const SQUARE = { width: 240, height: 240 };
const TALL = { width: 240, height: 480 };

/** Where a world point lands in the image (x right, y down = world +Z), for a framing and an image size. */
const toImage = (framing: ReturnType<typeof shotFraming>, size: { width: number; height: number }, x: number, z: number) => ({
  x: ((x - framing.centerX) / (2 * framing.halfWidth) + 0.5) * size.width,
  y: ((z - framing.centerZ) / (2 * framing.halfHeight) + 0.5) * size.height,
});

describe('shotFraming (057)', () => {
  it('centers a footprint and lets its longer side take the frame minus the margins', () => {
    const framing = shotFraming({ minX: -1, maxX: 1, minZ: -0.5, maxZ: 0.5 }, SQUARE);
    expect(framing.centerX).toBeCloseTo(0);
    expect(framing.centerZ).toBeCloseTo(0);
    const left = toImage(framing, SQUARE, -1, 0);
    const right = toImage(framing, SQUARE, 1, 0);
    expect(right.x - left.x).toBeCloseTo(SQUARE.width * (1 - 2 * SHOT_MARGIN));
    expect(left.x).toBeCloseTo(SQUARE.width * SHOT_MARGIN);
  });

  it('keeps the aspect of the image: a tall frame shows more of the world along Z', () => {
    const framing = shotFraming({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, TALL);
    expect(framing.halfHeight / framing.halfWidth).toBeCloseTo(TALL.height / TALL.width);
    // The square footprint is limited by the width here.
    const left = toImage(framing, TALL, -1, 0);
    const right = toImage(framing, TALL, 1, 0);
    expect(right.x - left.x).toBeCloseTo(TALL.width * (1 - 2 * SHOT_MARGIN));
  });

  it('fits a long footprint by its limiting side and never cuts it', () => {
    const bounds = { minX: -0.3, maxX: 0.3, minZ: -2, maxZ: 2 };
    const framing = shotFraming(bounds, SQUARE);
    for (const [x, z] of [[bounds.minX, bounds.minZ], [bounds.maxX, bounds.maxZ]]) {
      const at = toImage(framing, SQUARE, x, z);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.x).toBeLessThanOrEqual(SQUARE.width);
      expect(at.y).toBeGreaterThanOrEqual(SQUARE.height * SHOT_MARGIN - 1e-6);
      expect(at.y).toBeLessThanOrEqual(SQUARE.height * (1 - SHOT_MARGIN) + 1e-6);
    }
  });

  it('re-centers a model standing off the origin', () => {
    const framing = shotFraming({ minX: 3, maxX: 5, minZ: -7, maxZ: -5 }, SQUARE);
    expect(framing.centerX).toBeCloseTo(4);
    expect(framing.centerZ).toBeCloseTo(-6);
  });

  it('gives a degenerate footprint a size instead of dividing by zero', () => {
    const framing = shotFraming({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 }, SQUARE);
    expect(Number.isFinite(framing.halfWidth)).toBe(true);
    expect(framing.halfWidth).toBeGreaterThan(0);
  });

  it('puts the front of the model (+Z) at the bottom of the image, like every token picture', () => {
    // The camera looks down with "up" = −Z, so +Z is down in the image.
    expect(SHOT_UP).toEqual([0, 0, -1]);
    const framing = shotFraming({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, SQUARE);
    expect(toImage(framing, SQUARE, 0, 1).y).toBeGreaterThan(toImage(framing, SQUARE, 0, -1).y);
  });
});
