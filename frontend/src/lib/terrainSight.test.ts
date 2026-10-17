import { describe, expect, it } from 'vitest';
import { buildMaskGrid, WALL_HEIGHT } from './maskGrid';
import { buildTerrain } from './terrain';
import { canSee, firstHit } from './terrainSight';

// A row of five cells, 100 px each: floor, light block (~1/5 of a wall), floor, wall, floor.
const pixels = new Uint8ClampedArray([255, 200, 255, 0, 255].flatMap((v) => [v, v, v, 255]));
const terrain = buildTerrain(buildMaskGrid(pixels, 5, 1, { x: 0, y: 0, width: 500, height: 100 }))!;

describe('firstHit', () => {
  it('is clear over the floor', () => {
    expect(firstHit(terrain, { x: 10, y: 50, z: 50 }, { x: 290, y: 50, z: 50 })).toBeNull();
  });

  it('stops at a wall', () => {
    const hit = firstHit(terrain, { x: 250, y: 50, z: 50 }, { x: 450, y: 50, z: 50 });
    expect(hit).not.toBeNull();
    expect(250 + 200 * hit!).toBeGreaterThanOrEqual(300);
    expect(250 + 200 * hit!).toBeLessThanOrEqual(310);
  });

  it('passes over a low block and over a wall when high enough', () => {
    expect(firstHit(terrain, { x: 10, y: 60, z: 50 }, { x: 290, y: 60, z: 50 })).toBeNull();
    expect(firstHit(terrain, { x: 250, y: WALL_HEIGHT + 10, z: 50 }, { x: 450, y: WALL_HEIGHT + 10, z: 50 })).toBeNull();
  });

  it('catches a segment that goes under the floor', () => {
    expect(firstHit(null, { x: 0, y: 50, z: 0 }, { x: 100, y: -10, z: 0 })).not.toBeNull();
  });
});

describe('canSee', () => {
  it('sees across the floor, not through the wall', () => {
    expect(canSee(terrain, { x: 20, y: 60, z: 50 }, { x: 280, y: 60, z: 50 })).toBe(true);
    expect(canSee(terrain, { x: 250, y: 60, z: 50 }, { x: 480, y: 60, z: 50 })).toBe(false);
  });
});
