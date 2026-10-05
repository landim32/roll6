import { describe, expect, it } from 'vitest';
import { EYE_HEIGHT, WALL_HEIGHT } from './raycaster';
import { heightAtRow, repeatWidth, textureColumn, textureOffset, textureRow } from './wallTexture';

describe('repeatWidth', () => {
  it('is as wide along the wall as the picture is wide when a whole wall is as tall as the picture', () => {
    expect(repeatWidth({ width: 100, height: 100 })).toBe(WALL_HEIGHT);
    expect(repeatWidth({ width: 200, height: 100 })).toBe(2 * WALL_HEIGHT);
    expect(repeatWidth({ width: 50, height: 100 })).toBe(WALL_HEIGHT / 2);
  });

  it('does not depend on how many pixels the picture has, only on its proportion', () => {
    expect(repeatWidth({ width: 512, height: 256 })).toBe(repeatWidth({ width: 64, height: 32 }));
  });
});

describe('textureOffset', () => {
  const square = { width: 64, height: 64 };

  it('follows y on a face that looks east or west and x on one that looks north or south', () => {
    expect(textureOffset({ x: 999, y: 240, side: 'ew' }, square)).toBe(240 / WALL_HEIGHT);
    expect(textureOffset({ x: 240, y: 999, side: 'ns' }, square)).toBe(240 / WALL_HEIGHT);
  });

  it('counts copies of the picture along the wall', () => {
    expect(textureOffset({ x: 0, y: 0, side: 'ns' }, square)).toBe(0);
    expect(textureOffset({ x: WALL_HEIGHT * 3, y: 0, side: 'ns' }, square)).toBe(3);
  });
});

describe('textureColumn', () => {
  it('takes the fraction of the offset: the picture repeats', () => {
    expect(textureColumn(0, 10)).toBe(0);
    expect(textureColumn(0.5, 10)).toBe(5);
    expect(textureColumn(1.25, 10)).toBe(2);
    expect(textureColumn(7.99, 10)).toBe(9);
  });

  it('repeats backwards too (a wall left of the map origin)', () => {
    expect(textureColumn(-0.25, 10)).toBe(7);
    expect(textureColumn(-1, 10)).toBe(0);
  });

  it('never goes past the last column', () => {
    for (const offset of [0.9999999, 3.9999999999, -0.0000001]) expect(textureColumn(offset, 10)).toBeLessThanOrEqual(9);
  });
});

describe('heightAtRow', () => {
  const FRAME = 36;
  const PROJECTION = 45;

  it('is the height of the eyes at the horizon and falls below it', () => {
    expect(heightAtRow(FRAME / 2 - 0.5, FRAME, 100, PROJECTION)).toBeCloseTo(EYE_HEIGHT);
    expect(heightAtRow(FRAME / 2 + 5, FRAME, 100, PROJECTION)).toBeLessThan(EYE_HEIGHT);
    expect(heightAtRow(FRAME / 2 - 5, FRAME, 100, PROJECTION)).toBeGreaterThan(EYE_HEIGHT);
  });

  it('reaches the floor where a wall of that distance ends on the screen', () => {
    const perpendicular = 250;
    const bottom = FRAME / 2 + (EYE_HEIGHT * PROJECTION) / perpendicular;

    expect(heightAtRow(bottom - 0.5, FRAME, perpendicular, PROJECTION)).toBeCloseTo(0);
  });

  it('covers a whole wall between its top and bottom rows', () => {
    const perpendicular = 250;
    const top = FRAME / 2 - ((WALL_HEIGHT - EYE_HEIGHT) * PROJECTION) / perpendicular;

    expect(heightAtRow(top - 0.5, FRAME, perpendicular, PROJECTION)).toBeCloseTo(WALL_HEIGHT);
  });
});

describe('textureRow', () => {
  it('puts the top of the picture at the top of a whole wall and the bottom at the floor', () => {
    expect(textureRow(WALL_HEIGHT, 100)).toBe(0);
    expect(textureRow(0, 100)).toBe(99);
    expect(textureRow(WALL_HEIGHT / 2, 100)).toBe(50);
  });

  it('shows only the lower part of the picture on a low wall', () => {
    // a wall a quarter high reaches the quarter of the picture that is at its bottom
    expect(textureRow(WALL_HEIGHT / 4, 100)).toBe(75);
  });

  it('stays inside the picture above a wall and below the floor', () => {
    expect(textureRow(WALL_HEIGHT * 2, 100)).toBe(0);
    expect(textureRow(-30, 100)).toBe(99);
  });
});
