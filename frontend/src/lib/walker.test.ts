import { describe, expect, it } from 'vitest';
import { HEX_SIZE } from './hexGrid';
import { buildMaskGrid, EYE_HEIGHT, WALL_HEIGHT } from './maskGrid';
import { POSTURE } from '../types/mapToken';
import type { CameraBlocked, CameraWorld } from './storyCamera';
import { buildTerrain, levelHeight, STEP_HEIGHT } from './terrain';
import type { Terrain } from './terrain';
import {
  canWalk, startWalker, stepWalker, WALK_DISTANCE_DEFAULT, WALK_DISTANCE_MAX, WALK_DISTANCE_MIN, walkCamera, walkerLook, WALKER_SPEED,
  WALKER_TURN_SPEED, zoomWalker,
} from './walker';
import type { WalkerState } from './walker';

const open: CameraWorld = { terrain: null, edge: () => false };
const FORWARD = { forward: 1, turn: 0 };

/** A strip of 100 × 100 px cells along x (z 0…100) with these tones: 255 floor, 0 wall, 200 a step. */
const strip = (tones: number[]): Terrain => {
  const pixels = new Uint8ClampedArray(tones.flatMap((v) => [v, v, v, 255]));
  return buildTerrain(buildMaskGrid(pixels, tones.length, 1, { x: 0, y: 0, width: tones.length * 100, height: 100 }))!;
};
/** Standing at x on the strip, facing east (+x). */
const eastOf = (x: number, terrain: Terrain | null = null): WalkerState =>
  ({ ...startWalker({ x, y: 50 }, 0, undefined, undefined, terrain), yaw: Math.PI / 2 });
/** Walks for `seconds` in small steps. */
const walk = (state: WalkerState, world: CameraWorld, seconds: number): WalkerState => {
  let s = state;
  for (let t = 0; t < seconds; t += 0.02) s = stepWalker(s, FORWARD, 0.02, world);
  return s;
};
const on = (terrain: Terrain): CameraWorld => ({ terrain, edge: () => false });

describe('startWalker', () => {
  it('starts on the piece, facing where it looks, with the camera close behind', () => {
    const walker = startWalker({ x: 100, y: 200 }, 2);
    expect(walker).toMatchObject({ x: 100, z: 200, y: 0, vy: 0, moving: false, distance: WALK_DISTANCE_DEFAULT });
    expect(walker.yaw).toBeCloseTo((2 * Math.PI) / 3);
  });

  it('starts standing on the block under the piece', () => {
    const terrain = strip([200]);
    expect(startWalker({ x: 50, y: 50 }, 0, undefined, undefined, terrain).y).toBeCloseTo(levelHeight(terrain.levels[0]));
  });
});

describe('stepWalker', () => {
  it('walks 1.5 hex per second the way it faces (north = up the map)', () => {
    const walked = stepWalker(startWalker({ x: 100, y: 500 }, 0), FORWARD, 1, open);
    expect(walked.x).toBeCloseTo(100);
    expect(walked.z).toBeCloseTo(500 - WALKER_SPEED);
    expect(walked.moving).toBe(true);
    expect(WALKER_SPEED).toBeCloseTo(1.5 * Math.sqrt(3) * HEX_SIZE);
  });

  it('turns without moving, and stands still without input', () => {
    const start = startWalker({ x: 100, y: 500 }, 0);
    const turned = stepWalker(start, { forward: 0, turn: 1 }, 0.5, open);
    expect(turned.yaw).toBeCloseTo(WALKER_TURN_SPEED * 0.5);
    expect(turned).toMatchObject({ x: 100, z: 500, moving: false });
    expect(stepWalker(start, { forward: 0, turn: 0 }, 1, open)).toMatchObject({ x: 100, z: 500, moving: false });
  });

  it('slides along the edge instead of stopping, and stops (not moving) against it head on', () => {
    const edge: CameraBlocked = (_x, z) => z < 400;
    const world = { terrain: null, edge };
    const diagonal = { ...startWalker({ x: 100, y: 410 }, 0), yaw: Math.PI / 4 };
    const slid = stepWalker(diagonal, FORWARD, 0.5, world);
    expect(slid.z).toBeCloseTo(410);
    expect(slid.x).toBeGreaterThan(100);
    expect(slid.moving).toBe(true);
    expect(stepWalker(startWalker({ x: 100, y: 410 }, 0), FORWARD, 0.5, world)).toMatchObject({ x: 100, z: 410, moving: false });
  });

  it('climbs a step and walks on it (081)', () => {
    const terrain = strip([255, 200, 200]);
    const top = levelHeight(terrain.levels[1]);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThanOrEqual(STEP_HEIGHT);
    const walked = walk(eastOf(50, terrain), on(terrain), 1.2);
    expect(walked.x).toBeGreaterThan(150);
    expect(walked.y).toBeCloseTo(top);
  });

  it('is stopped by anything taller than a step: a mid block or a wall', () => {
    for (const tone of [128, 0]) {
      const terrain = strip([255, tone]);
      const walked = walk(eastOf(50, terrain), on(terrain), 1);
      expect(walked.x).toBeLessThan(100);
      expect(walked.y).toBe(0);
    }
    expect(levelHeight(strip([0]).levels[0])).toBe(WALL_HEIGHT);
  });

  it('falls off a block and lands on the floor', () => {
    const terrain = strip([200, 255, 255]);
    const start = eastOf(50, terrain);
    expect(start.y).toBeGreaterThan(0);
    const walked = walk(start, on(terrain), 1);
    expect(walked.x).toBeGreaterThan(110);
    expect(walked.y).toBe(0);
    expect(walked.vy).toBe(0);
  });

  it('climbs a staircase of steps up to a height no single step would reach', () => {
    const terrain = strip([255, 215, 175, 135, 135]);
    const walked = walk(eastOf(50, terrain), on(terrain), 4);
    expect(walked.x).toBeGreaterThan(350);
    expect(walked.y).toBeCloseTo(levelHeight(terrain.levels[3]));
    expect(walked.y).toBeGreaterThan(STEP_HEIGHT);
  });
});

describe('the camera behind the character', () => {
  it('stands behind it at its distance, looking the same way, always attached', () => {
    const pose = walkCamera(startWalker({ x: 300, y: 300 }, 0), open, 0, 0);
    expect(pose).toMatchObject({ x: 300, attached: true });
    expect(pose.z).toBeCloseTo(300 + WALK_DISTANCE_DEFAULT);
    expect(pose.y).toBeCloseTo(EYE_HEIGHT);
    expect(pose.yaw).toBeCloseTo(0);
  });

  it('comes closer in front of the edge behind the character', () => {
    const pose = walkCamera(startWalker({ x: 300, y: 300 }, 0), { terrain: null, edge: (_x, z) => z > 340 }, 0, 0);
    expect(pose.z).toBeLessThanOrEqual(340);
    expect(pose.z).toBeGreaterThanOrEqual(300);
  });

  it('rises with the character standing on a block', () => {
    const terrain = strip([200]);
    const walker = startWalker({ x: 50, y: 50 }, 0, undefined, undefined, terrain);
    expect(walkCamera(walker, on(terrain), 0, 0).y).toBeCloseTo(walker.y + EYE_HEIGHT);
  });

  it('zooms within its limits', () => {
    const walker = startWalker({ x: 0, y: 0 }, 0);
    expect(zoomWalker(walker, -100).distance).toBe(WALK_DISTANCE_MIN);
    expect(zoomWalker(walker, 100).distance).toBe(WALK_DISTANCE_MAX);
    expect(zoomWalker(walker, 1).distance).toBeGreaterThan(walker.distance);
    expect(WALK_DISTANCE_MIN).toBeLessThan(WALK_DISTANCE_DEFAULT);
    expect(WALK_DISTANCE_DEFAULT).toBeLessThan(WALK_DISTANCE_MAX);
  });
});

describe('walkerLook', () => {
  it('is the nearest hex side, wrapping around', () => {
    expect(walkerLook(0)).toBe(0);
    expect(walkerLook(Math.PI / 3 + 0.2)).toBe(1);
    expect(walkerLook(Math.PI)).toBe(3);
    expect(walkerLook(-Math.PI / 3)).toBe(5);
    expect(walkerLook(2 * Math.PI - 0.1)).toBe(0);
  });
});

describe('canWalk', () => {
  const standing = { posture: POSTURE.standing };

  it('only in free mode, for a player whose character stands on the open map', () => {
    expect(canWalk({ freeMode: true, isGm: false, piece: standing })).toBe(true);
    expect(canWalk({ freeMode: false, isGm: false, piece: standing })).toBe(false);
    expect(canWalk({ freeMode: true, isGm: true, piece: standing })).toBe(false);
    expect(canWalk({ freeMode: true, isGm: false, piece: null })).toBe(false);
    expect(canWalk({ freeMode: true, isGm: false, piece: { posture: POSTURE.down } })).toBe(false);
  });
});
