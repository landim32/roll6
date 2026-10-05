import { describe, expect, it } from 'vitest';
import { gridPixelSize, HEX_SIZE } from './hexGrid';
import { buildMaskGrid } from './raycaster';
import type { MaskGrid } from './raycaster';
import {
  cameraBlocker, clampFov, FOLLOW_DISTANCE, followPose, FOV_MAX, FOV_MIN, initialCamera, lookToYaw, segmentHitsWall, stepCamera,
} from './storyCamera';
import type { CameraPose } from './storyCamera';

const COLUMNS = 20;
const ROWS = 15;
const MAP = gridPixelSize(COLUMNS, ROWS, HEX_SIZE);

/** A mask over the whole map of 40 × 40 px cells (one source pixel per cell) with walls at these (col, row) cells. */
const maskWith = (walls: Array<[number, number]>, tone = 0): MaskGrid => {
  const cols = Math.round(MAP.width / 40);
  const rows = Math.round(MAP.height / 40);
  const pixels = new Uint8ClampedArray(cols * rows * 4).fill(255);
  for (const [col, row] of walls) pixels.set([tone, tone, tone, 255], (row * cols + col) * 4);
  return buildMaskGrid(pixels, cols, rows, { x: 0, y: 0, width: MAP.width, height: MAP.height });
};

const open = cameraBlocker(null, COLUMNS, ROWS);
const target = { x: 400, y: 300 };

describe('storyCamera', () => {
  it('turns look 0–5 into yaw steps of 60° clockwise from north', () => {
    expect(lookToYaw(0)).toBe(0);
    expect(lookToYaw(1)).toBeCloseTo(Math.PI / 3);
    expect(lookToYaw(3)).toBeCloseTo(Math.PI);
    expect(lookToYaw(6)).toBe(0);
  });

  it('stands behind the piece, facing the way it looks', () => {
    const facingNorth = followPose(target, 0, open);
    expect(facingNorth.x).toBeCloseTo(target.x);
    expect(facingNorth.z).toBeCloseTo(target.y + FOLLOW_DISTANCE);
    expect(facingNorth.attached).toBe(true);

    const facingSouth = followPose(target, 3, open);
    expect(facingSouth.z).toBeCloseTo(target.y - FOLLOW_DISTANCE);
    expect(facingSouth.yaw).toBeCloseTo(Math.PI);
  });

  it('has no tilt: the pose is only a position, a heading and whether it follows', () => {
    expect(Object.keys(followPose(target, 0, open)).sort()).toEqual(['attached', 'x', 'yaw', 'z']);
  });

  it('comes closer to the piece when a wall of the mask stands behind it', () => {
    // 40 px cells: row 10 is y 400–440; the camera would be at y 300 + 160 = 460, behind that wall.
    const blocked = cameraBlocker(maskWith([[10, 10], [9, 10], [11, 10]]), COLUMNS, ROWS);

    const pose = followPose(target, 0, blocked);

    expect(pose.z - target.y).toBeLessThan(FOLLOW_DISTANCE);
    expect(pose.z).toBeGreaterThanOrEqual(target.y);
    expect(blocked(pose.x, pose.z)).toBe(false);
    expect(pose.z).toBeLessThan(400);
  });

  it('finds the first wall on a segment', () => {
    const blocked = cameraBlocker(maskWith([[10, 10]]), COLUMNS, ROWS);

    expect(segmentHitsWall({ x: 420, y: 300 }, { x: 420, y: 500 }, blocked)).not.toBeNull();
    expect(segmentHitsWall({ x: 420, y: 300 }, { x: 420, y: 200 }, blocked)).toBeNull();
  });

  it('a low wall blocks the camera too: the camera only looks over it, it never walks through (036)', () => {
    const blocked = cameraBlocker(maskWith([[10, 10]], 128), COLUMNS, ROWS); // half gray: half the height

    expect(blocked(420, 420)).toBe(true);
    expect(blocked(420, 300)).toBe(false);
    expect(segmentHitsWall({ x: 420, y: 300 }, { x: 420, y: 500 }, blocked)).not.toBeNull();
  });

  it('walks, strafes, turns and lets go of the character', () => {
    const start: CameraPose = { x: 400, z: 400, yaw: 0, attached: true };

    const walked = stepCamera(start, { forward: 20 }, open);
    expect(walked.z).toBeCloseTo(380);
    expect(walked.attached).toBe(false);

    expect(stepCamera(start, { strafe: 10 }, open).x).toBeCloseTo(410);

    const turned = stepCamera(start, { turn: Math.PI / 2 }, open);
    expect(turned.yaw).toBeCloseTo(Math.PI / 2);
    expect(turned.attached).toBe(false);

    expect(stepCamera(start, {}, open)).toBe(start);
  });

  it('never enters a wall of the mask and slides along it', () => {
    // A wall to the north of the camera: cell (10, 9) is y 360–400, x 400–440.
    const blocked = cameraBlocker(maskWith([[10, 9]]), COLUMNS, ROWS);
    let pose: CameraPose = { x: 420, z: 440, yaw: 0, attached: false };

    for (let i = 0; i < 30; i++) pose = stepCamera(pose, { forward: 5 }, blocked);
    expect(blocked(pose.x, pose.z)).toBe(false);
    expect(pose.z).toBeGreaterThan(400);

    // Walking diagonally into the wall still moves along the free axis.
    const slid = stepCamera(pose, { forward: 5, strafe: 5 }, blocked);
    expect(slid.x).toBeGreaterThan(pose.x);
  });

  it('never leaves the map', () => {
    let pose: CameraPose = { x: 30, z: 30, yaw: 0, attached: false };
    for (let i = 0; i < 50; i++) pose = stepCamera(pose, { forward: 10 }, open);

    expect(pose.z).toBeGreaterThan(0);
    expect(open(pose.x, pose.z)).toBe(false);
  });

  it('limits the field of view', () => {
    expect(clampFov(10)).toBe(FOV_MIN);
    expect(clampFov(200)).toBe(FOV_MAX);
    expect(clampFov(60)).toBe(60);
  });

  it('starts behind the chosen character, or free at the center of the map for the GM', () => {
    const behind = initialCamera({ center: { x: 300, y: 300 }, look: 0 }, COLUMNS, ROWS, open);
    expect(behind.attached).toBe(true);

    const gm = initialCamera(null, COLUMNS, ROWS, open);
    expect(gm).toEqual({ x: MAP.width / 2, z: MAP.height / 2, yaw: 0, attached: false });
  });
});
