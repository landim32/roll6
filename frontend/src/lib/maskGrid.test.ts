import { describe, expect, it } from 'vitest';
import { FACE_HEIGHT_SHARE, FRONT_IMAGE_ASPECT, SILHOUETTE_SHARE } from './frontImage';
import { HEX_SIZE } from './hexGrid';
import { buildMaskGrid, EYE_HEIGHT, heightAt, isWallAt, skyRepeats, WALL_HEIGHT } from './maskGrid';
import type { MaskGrid } from './maskGrid';

/**
 * A mask from rows of text, one pixel per cell, covering `area`: '#' whole wall, '.' empty, '=' half gray,
 * '-' almost white (036 reads the tone as the height).
 */
const gridFrom = (rows: string[], area = { x: 0, y: 0, width: rows[0].length * 100, height: rows.length * 100 }): MaskGrid => {
  const TONES: Record<string, number> = { '#': 0, '.': 255, '=': 128, '-': 245 };
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => {
    const value = TONES[ch] ?? 255;
    pixels.set([value, value, value, 255], (y * width + x) * 4);
  }));
  return buildMaskGrid(pixels, width, rows.length, area);
};

/** One cell made of the given gray values: what the softened edge of a black and white mask looks like. */
const cellOf = (grays: number[]): MaskGrid => {
  const pixels = new Uint8ClampedArray(grays.length * 4);
  grays.forEach((g, x) => pixels.set([g, g, g, 255], x * 4));
  return buildMaskGrid(pixels, grays.length, 1, { x: 0, y: 0, width: grays.length, height: 1 }, 1);
};

describe('buildMaskGrid', () => {
  it('turns dark pixels into whole walls on a grid that covers the given area', () => {
    const grid = gridFrom(['#.', '.#'], { x: -50, y: 20, width: 400, height: 200 });

    expect(grid).toMatchObject({ cols: 2, rows: 2, originX: -50, originY: 20, cellWidth: 200, cellHeight: 100 });
    expect([...grid.heights]).toEqual([255, 0, 0, 255]);
  });

  it('reduces a big mask to at most 512 cells on its longest side; a cell is wall when most of its pixels are', () => {
    const width = 1024;
    const height = 512;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    // Wall on the left half of the first 2×2 block of source pixels only → 3 of 4 is most, 2 of 4 is not.
    for (const [x, y] of [[0, 0], [1, 0], [0, 1]]) pixels.set([0, 0, 0, 255], (y * width + x) * 4);

    const grid = buildMaskGrid(pixels, width, height, { x: 0, y: 0, width, height });

    expect(grid.cols).toBe(512);
    expect(grid.rows).toBe(256);
    expect(grid.heights[0]).toBe(255); // 3 of 4 are dark
    expect(grid.heights[1]).toBe(0);
  });

  it('keeps a small mask at its own size', () => {
    expect(gridFrom(['..', '..']).cols).toBe(2);
  });

  it('reads the tone of the mask as the height of the wall (036)', () => {
    const grid = gridFrom(['#=.-']);

    expect(grid.heights[0] / 255).toBe(1); // black: whole wall
    expect(grid.heights[1] / 255).toBeCloseTo(0.5, 1); // half gray: half wall
    expect(grid.heights[2]).toBe(0); // white: empty
    expect(grid.heights[3]).toBe(0); // 245 of 255: empty, the end of the range is snapped
  });

  it('takes the median, so the softened edge of a black and white mask is never half a wall', () => {
    expect(cellOf([0, 0, 255, 255]).heights[0]).toBe(0); // an even split is empty, as the old rule
    expect(cellOf([0, 0, 0, 255]).heights[0]).toBe(255); // mostly dark: a whole wall
    expect(cellOf([0, 255, 255, 255]).heights[0]).toBe(0);
    // Ten pixels, a third dark: the average would ask for a wall 2/3 of its height; the median says empty.
    expect(cellOf([0, 0, 0, 255, 255, 255, 255, 255, 255, 255]).heights[0]).toBe(0);
    expect(cellOf([255, 255, 0, 0]).heights[0]).toBe(0);
  });

  it('counts transparent pixels as empty, however dark they are', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
    const grid = buildMaskGrid(pixels, 2, 1, { x: 0, y: 0, width: 2, height: 1 }, 2);

    expect(grid.heights[0]).toBe(0); // transparent
    expect(grid.heights[1]).toBe(255); // the same black, opaque
  });
});

describe('isWallAt', () => {
  const grid = gridFrom(['...', '.#.', '...'], { x: 100, y: 100, width: 300, height: 300 });

  it('is true inside a wall cell and false elsewhere, including outside the mask', () => {
    expect(isWallAt(grid, 250, 250)).toBe(true);
    expect(isWallAt(grid, 150, 150)).toBe(false);
    expect(isWallAt(grid, 50, 250)).toBe(false);
    expect(isWallAt(grid, 450, 250)).toBe(false);
  });

  it('is true for a low wall too: the camera never walks through one (036)', () => {
    const low = gridFrom(['=.', '#.'], { x: 0, y: 0, width: 200, height: 200 });

    expect(isWallAt(low, 50, 50)).toBe(true); // half gray
    expect(isWallAt(low, 150, 50)).toBe(false); // white: empty
    expect(isWallAt(low, 50, 150)).toBe(true); // black
  });
});

describe('camera height', () => {
  // A figure of 1 hex is as wide as a hex (2 × HEX_SIZE) and its "2,5D frente" image is a 3:4 portrait.
  const imageHeight = (2 * HEX_SIZE) / FRONT_IMAGE_ASPECT;
  const characterHeight = SILHOUETTE_SHARE * imageHeight;

  it('is the eye level of the character that fits the silhouette of the front image', () => {
    expect(EYE_HEIGHT).toBeCloseTo(FACE_HEIGHT_SHARE * imageHeight);
    expect(EYE_HEIGHT).toBeCloseTo(59.73, 1);
  });

  it('is at the face, not above the head: a little under the height of the character, well above the waist', () => {
    expect(EYE_HEIGHT).toBeLessThan(characterHeight);
    expect(EYE_HEIGHT).toBeGreaterThan(characterHeight * 0.9);
  });

  it('keeps the walls taller than the eyes so the horizon cuts them', () => {
    expect(WALL_HEIGHT).toBeGreaterThan(EYE_HEIGHT);
  });
});

describe('heightAt', () => {
  it('reads the cell under a point, 0 outside the mask', () => {
    const grid = gridFrom(['#='], { x: 0, y: 0, width: 200, height: 100 });
    expect(heightAt(grid, 50, 50)).toBe(255);
    expect(heightAt(grid, 150, 50) / 255).toBeCloseTo(0.5, 1);
    expect(heightAt(grid, 250, 50)).toBe(0);
  });
});

describe('skyRepeats / skyColumn', () => {
  it('repeats a whole number of times, at least once', () => {
    expect(Number.isInteger(skyRepeats(2048, 640))).toBe(true);
    expect(skyRepeats(2048, 640)).toBeGreaterThanOrEqual(1);
    expect(skyRepeats(100000, 100)).toBe(1);
    expect(skyRepeats(100, 100)).toBeGreaterThan(skyRepeats(2048, 640));
    expect(skyRepeats(0, 0)).toBe(1);
  });
});
