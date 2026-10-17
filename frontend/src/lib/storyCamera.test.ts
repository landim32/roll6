import { describe, expect, it } from 'vitest';
import { gridPixelSize, HEX_SIZE } from './hexGrid';
import { buildMaskGrid, EYE_HEIGHT, WALL_HEIGHT } from './maskGrid';
import {
  cameraEdge, clampFov, clampPitch, FOLLOW_DISTANCE, followPose, FOV_MAX, FOV_MIN, initialCamera, lookToYaw, PITCH_DEFAULT,
  PITCH_MAX, PITCH_MIN, segmentHitsWall, stepCamera,
} from './storyCamera';
import type { CameraPose, CameraWorld } from './storyCamera';
import { buildTerrain, terrainHeightAt } from './terrain';
import type { Terrain } from './terrain';

const COLUMNS = 20;
const ROWS = 15;
const MAP = gridPixelSize(COLUMNS, ROWS, HEX_SIZE);

/** A terrain over the whole map of 40 × 40 px cells with these (col, row) cells at the given tone (0 = full wall). */
const terrainWith = (cells: Array<[number, number]>, tone = 0): Terrain => {
  const cols = Math.round(MAP.width / 40);
  const rows = Math.round(MAP.height / 40);
  const pixels = new Uint8ClampedArray(cols * rows * 4).fill(255);
  for (const [col, row] of cells) pixels.set([tone, tone, tone, 255], (row * cols + col) * 4);
  return buildTerrain(buildMaskGrid(pixels, cols, rows, { x: 0, y: 0, width: MAP.width, height: MAP.height }))!;
};

const edge = cameraEdge(COLUMNS, ROWS);
const flat: CameraWorld = { terrain: null, edge };
const target = { x: 400, y: 300 };

describe('storyCamera', () => {
  it('turns look 0–5 into yaw steps of 60° clockwise from north', () => {
    expect(lookToYaw(0)).toBe(0);
    expect(lookToYaw(3)).toBeCloseTo(Math.PI);
    expect(lookToYaw(7)).toBeCloseTo(Math.PI / 3);
  });

  it('stands behind the piece, a little above its head, looking at it', () => {
    const pose = followPose(target, 0, flat, 0, 0);
    expect(pose.x).toBeCloseTo(400);
    expect(pose.z).toBeCloseTo(300 + FOLLOW_DISTANCE);
    expect(pose.y).toBeCloseTo(EYE_HEIGHT);
    expect(pose).toMatchObject({ yaw: 0, pitch: 0, attached: true });
  });

  it('looking down puts the camera higher, still at the same distance from the head', () => {
    const pose = followPose(target, 0, flat, 0, -Math.PI / 6);
    expect(pose.y).toBeCloseTo(EYE_HEIGHT + FOLLOW_DISTANCE / 2);
    const distance = Math.hypot(pose.x - target.x, pose.y - EYE_HEIGHT, pose.z - target.y);
    expect(distance).toBeCloseTo(FOLLOW_DISTANCE);
  });

  it('limits the tilt: never straight up or down', () => {
    expect(clampPitch(-2)).toBe(PITCH_MIN);
    expect(clampPitch(2)).toBe(PITCH_MAX);
    expect(PITCH_DEFAULT).toBeLessThan(0);
    expect(followPose(target, 0, flat, 0, -3).pitch).toBe(PITCH_MIN);
  });

  it('comes closer to the piece when a block stands behind it', () => {
    // A wall two cells behind the piece (south of it).
    const terrain = terrainWith([[10, 9], [9, 9], [11, 9]]);
    const pose = followPose(target, 0, { terrain, edge }, 0, 0);
    // Short of the wall's face (row 9) instead of FOLLOW_DISTANCE behind the piece.
    expect(pose.z).toBeLessThan(terrain.grid.cellHeight * 9);
    expect(pose.z).toBeLessThan(300 + FOLLOW_DISTANCE);
    expect(pose.z).toBeGreaterThan(300);
  });

  it('stands on the block under the piece: the camera rises with it', () => {
    const terrain = terrainWith([[10, 7]], 128);
    const ground = terrainHeightAt(terrain, 400, 300);
    expect(ground).toBeGreaterThan(0);
    expect(followPose(target, 0, { terrain, edge }, 0, 0).y).toBeCloseTo(ground + EYE_HEIGHT);
  });

  it('never goes under the floor when looking up', () => {
    const pose = followPose(target, 0, flat, 0, PITCH_MAX);
    expect(pose.y).toBeGreaterThan(0);
  });

  it('finds the edge on a segment', () => {
    expect(segmentHitsWall({ x: 100, y: 100 }, { x: 100, y: -100 }, edge)).not.toBeNull();
    expect(segmentHitsWall({ x: 100, y: 100 }, { x: 200, y: 200 }, edge)).toBeNull();
  });

  it('walks, strafes, turns, tilts and lets go of the character', () => {
    const start: CameraPose = { x: 400, y: EYE_HEIGHT, z: 300, yaw: 0, pitch: 0, attached: true };
    expect(stepCamera(start, { forward: 10 }, flat)).toMatchObject({ x: 400, z: 290, attached: false });
    expect(stepCamera(start, { strafe: 10 }, flat).x).toBeCloseTo(410);
    expect(stepCamera(start, { turn: 0.5 }, flat).yaw).toBe(0.5);
    expect(stepCamera(start, { pitch: -0.2 }, flat).pitch).toBeCloseTo(-0.2);
    expect(stepCamera(start, {}, flat)).toBe(start);
  });

  it('climbs a step but not a wall, and slides along it', () => {
    const step = terrainWith([[10, 7]], 200);
    const wall = terrainWith([[10, 7]]);
    const below: CameraPose = { x: 420, y: EYE_HEIGHT, z: 330, yaw: 0, pitch: 0, attached: false };
    const climbed = stepCamera(below, { forward: 30 }, { terrain: step, edge });
    expect(climbed.z).toBeCloseTo(300);
    expect(climbed.y).toBeCloseTo(terrainHeightAt(step, 420, 300) + EYE_HEIGHT);
    const stopped = stepCamera(below, { forward: 30 }, { terrain: wall, edge });
    expect(stopped.z).toBeCloseTo(330);
    expect(terrainHeightAt(wall, 420, 300)).toBe(WALL_HEIGHT);
  });

  it('never leaves the map', () => {
    const corner: CameraPose = { x: 20, y: EYE_HEIGHT, z: 20, yaw: 0, pitch: 0, attached: false };
    expect(stepCamera(corner, { forward: 50 }, flat).z).toBe(20);
  });

  it('limits the field of view', () => {
    expect(clampFov(10)).toBe(FOV_MIN);
    expect(clampFov(200)).toBe(FOV_MAX);
  });

  it('starts behind the chosen character, or free at the center of the map for the GM', () => {
    expect(initialCamera({ center: target, look: 0 }, COLUMNS, ROWS, flat)).toEqual(followPose(target, 0, flat));
    const free = initialCamera(null, COLUMNS, ROWS, flat);
    expect(free).toMatchObject({ x: MAP.width / 2, z: MAP.height / 2, yaw: 0, attached: false });
    expect(free.y).toBeCloseTo(EYE_HEIGHT);
  });
});
