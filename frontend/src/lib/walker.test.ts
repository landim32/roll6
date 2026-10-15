import { describe, expect, it } from 'vitest';
import { hexCenter, HEX_SIZE } from './hexGrid';
import { POSTURE } from '../types/mapToken';
import type { CameraBlocked } from './storyCamera';
import {
  canWalk, startWalker, stepWalker, WALK_DISTANCE_DEFAULT, WALK_DISTANCE_MAX, WALK_DISTANCE_MIN, walkCamera, walkerBlocker, walkerLook, WALKER_SPEED,
  WALKER_TURN_SPEED, zoomWalker,
} from './walker';

const open: CameraBlocked = () => false;
const FORWARD = { forward: 1, turn: 0 };

describe('startWalker', () => {
  it('starts on the piece, facing where it looks, with the camera close behind', () => {
    const walker = startWalker({ x: 100, y: 200 }, 2);
    expect(walker).toMatchObject({ x: 100, z: 200, moving: false, distance: WALK_DISTANCE_DEFAULT });
    expect(walker.yaw).toBeCloseTo((2 * Math.PI) / 3);
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

  it('slides along a wall instead of stopping, and stops (not moving) against it head on', () => {
    // A wall everywhere north of z = 400.
    const wall: CameraBlocked = (_x, z) => z < 400;
    const diagonal = { ...startWalker({ x: 100, y: 410 }, 0), yaw: Math.PI / 4 };
    const slid = stepWalker(diagonal, FORWARD, 0.5, wall);
    expect(slid.z).toBeCloseTo(410);
    expect(slid.x).toBeGreaterThan(100);
    expect(slid.moving).toBe(true);
    const stuck = stepWalker(startWalker({ x: 100, y: 410 }, 0), FORWARD, 0.5, wall);
    expect(stuck).toMatchObject({ x: 100, z: 410, moving: false });
  });
});

describe('walkerBlocker', () => {
  it('passes through the pieces and keeps the walls and the edge of the camera rule (069)', () => {
    const edge = walkerBlocker((x) => x < 0);
    expect(edge(-1, 50)).toBe(true);
    expect(edge(50, 50)).toBe(false);
    const center = hexCenter(2, 0, HEX_SIZE);
    expect(walkerBlocker(open)(center.x, center.y)).toBe(false);
  });
});

describe('the camera behind the character', () => {
  it('stands behind it at its distance, looking the same way, always attached', () => {
    const pose = walkCamera(startWalker({ x: 300, y: 300 }, 0), open);
    expect(pose).toMatchObject({ x: 300, attached: true });
    expect(pose.z).toBeCloseTo(300 + WALK_DISTANCE_DEFAULT);
    expect(pose.yaw).toBeCloseTo(0);
  });

  it('comes closer in front of a wall behind the character', () => {
    // A wall from z = 340 on: the camera stops at its face instead of 300 + WALK_DISTANCE_DEFAULT.
    const wall: CameraBlocked = (_x, z) => z > 340;
    const pose = walkCamera(startWalker({ x: 300, y: 300 }, 0), wall);
    expect(pose.z).toBeLessThanOrEqual(340);
    expect(pose.z).toBeGreaterThanOrEqual(300);
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
