import { describe, expect, it } from 'vitest';
import { gridPixelSize, hexCenter, HEX_SIZE, pixelToHex } from './hexGrid';
import {
  cameraBlocker, clampFov, FOLLOW_DISTANCE, followPose, FOV_MAX, FOV_MIN, initialCamera, lookToYaw, PITCH_LIMIT,
  segmentHitsWall, stepCamera,
} from './storyCamera';

const open = cameraBlocker([], 20, 20);
const center = (x: number, y: number) => hexCenter(x, y, HEX_SIZE);

describe('storyCamera', () => {
  it('turns look 0–5 into yaw steps of 60° clockwise from north', () => {
    expect(lookToYaw(0)).toBe(0);
    expect(lookToYaw(1)).toBeCloseTo(Math.PI / 3);
    expect(lookToYaw(3)).toBeCloseTo(Math.PI);
    expect(lookToYaw(6)).toBe(0);
  });

  it('stands behind the piece, facing the way it looks', () => {
    const target = center(10, 10);

    const facingNorth = followPose(target, 0, open);
    expect(facingNorth.x).toBeCloseTo(target.x);
    expect(facingNorth.z).toBeCloseTo(target.y + FOLLOW_DISTANCE);
    expect(facingNorth.attached).toBe(true);

    const facingSouth = followPose(target, 3, open);
    expect(facingSouth.z).toBeCloseTo(target.y - FOLLOW_DISTANCE);
    expect(facingSouth.yaw).toBeCloseTo(Math.PI);
  });

  it('comes closer to the piece when a wall stands behind it', () => {
    const blocked = cameraBlocker([{ x: 10, y: 12 }], 20, 20);
    const target = center(10, 10);

    const pose = followPose(target, 0, blocked);

    expect(pose.z - target.y).toBeLessThan(FOLLOW_DISTANCE);
    expect(pose.z).toBeGreaterThanOrEqual(target.y);
    expect(blocked(pose.x, pose.z)).toBe(false);
    expect(pixelToHex({ x: pose.x, y: pose.z }, HEX_SIZE)).not.toEqual({ x: 10, y: 12 });
  });

  it('finds the first wall on a segment', () => {
    const blocked = cameraBlocker([{ x: 10, y: 12 }], 20, 20);

    expect(segmentHitsWall(center(10, 10), center(10, 14), blocked)).not.toBeNull();
    expect(segmentHitsWall(center(10, 10), center(10, 8), blocked)).toBeNull();
  });

  it('walks, turns and lets go of the character', () => {
    const start = { ...followPose(center(10, 10), 0, open) };

    const walked = stepCamera(start, { forward: 20 }, open);
    expect(walked.z).toBeCloseTo(start.z - 20);
    expect(walked.attached).toBe(false);

    const strafed = stepCamera({ ...start, yaw: 0 }, { strafe: 10 }, open);
    expect(strafed.x).toBeCloseTo(start.x + 10);

    const turned = stepCamera(start, { turn: Math.PI / 2 }, open);
    expect(turned.yaw).toBeCloseTo(Math.PI / 2);
    expect(turned.attached).toBe(false);

    expect(stepCamera(start, {}, open)).toBe(start);
  });

  it('never enters a wall and slides along it', () => {
    const blocked = cameraBlocker([{ x: 10, y: 9 }], 20, 20);
    const start = { x: center(10, 10).x, z: center(10, 10).y, yaw: 0, pitch: 0, attached: false };

    let pose = start;
    for (let i = 0; i < 20; i++) pose = stepCamera(pose, { forward: 5 }, blocked);
    expect(blocked(pose.x, pose.z)).toBe(false);
    expect(pixelToHex({ x: pose.x, y: pose.z }, HEX_SIZE)).toEqual({ x: 10, y: 10 });

    // Walking diagonally into the wall still moves along the free axis.
    const slid = stepCamera(pose, { forward: 5, strafe: 5 }, blocked);
    expect(slid.x).toBeGreaterThan(pose.x);
  });

  it('never leaves the grid', () => {
    let pose = { x: 30, z: 30, yaw: 0, pitch: 0, attached: false };
    for (let i = 0; i < 50; i++) pose = stepCamera(pose, { forward: 10 }, open);

    expect(pose.z).toBeGreaterThan(0);
    expect(open(pose.x, pose.z)).toBe(false);
  });

  it('limits the look up/down and the field of view', () => {
    const pose = stepCamera({ x: 400, z: 400, yaw: 0, pitch: 0, attached: false }, { tilt: 5 }, open);

    expect(pose.pitch).toBeCloseTo(PITCH_LIMIT);
    expect(clampFov(10)).toBe(FOV_MIN);
    expect(clampFov(200)).toBe(FOV_MAX);
    expect(clampFov(60)).toBe(60);
  });

  it('starts behind the chosen character, or free at the center for the GM', () => {
    const behind = initialCamera({ center: center(5, 5), look: 0 }, 20, 20, open);
    expect(behind.attached).toBe(true);

    const gm = initialCamera(null, 20, 20, open);
    const { width, height } = gridPixelSize(20, 20, HEX_SIZE);
    expect(gm).toEqual({ x: width / 2, z: height / 2, yaw: 0, pitch: 0, attached: false });
  });
});
