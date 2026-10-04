import { gridPixelSize, HEX_SIZE, isInsideGrid, pixelToHex } from './hexGrid';
import type { Offset, Point } from './hexGrid';
import { toWallSet, wallKey } from './storyWalls';

/**
 * Camera of the 3D view of a story map (033): third person behind the chosen character, free when the user walks
 * away, never through walls. Pure (no three.js) so the rules are unit-tested. Map units: 1 = 1 px of the 2D map; the
 * map's x is the scene's X and the map's y is the scene's Z. `yaw` 0 faces north (−Z, the top of the 2D map) and
 * grows clockwise, like `look`.
 */

/** Distance from the followed piece to the camera behind it. */
export const FOLLOW_DISTANCE = 4 * HEX_SIZE;
/** Camera height above the floor. */
export const EYE_HEIGHT = 1.6 * HEX_SIZE;
/** Room the camera keeps from walls and from the edge of the grid. */
export const CAMERA_RADIUS = HEX_SIZE / 3;
/** Zoom = field of view (degrees). */
export const FOV_MIN = 30;
export const FOV_MAX = 90;
export const FOV_DEFAULT = 70;
export const FOV_STEP = 10;
/** Up/down look limit (radians, ±35°). */
export const PITCH_LIMIT = (35 * Math.PI) / 180;
/** Steps along a segment when looking for walls. */
const SEGMENT_STEP = HEX_SIZE / 4;

export interface CameraPose {
  x: number;
  z: number;
  /** Radians; 0 = north, clockwise. */
  yaw: number;
  /** Radians; negative looks down. */
  pitch: number;
  /** True while following the chosen character's piece. */
  attached: boolean;
}

/** One frame of user input: distances in map units, angles in radians. */
export interface CameraInput {
  forward?: number;
  strafe?: number;
  turn?: number;
  tilt?: number;
}

/** True where the camera may not be. */
export type CameraBlocked = (x: number, z: number) => boolean;

/** Look 0–5 (clockwise from the top) as a yaw. */
export const lookToYaw = (look: number): number => (((look % 6) + 6) % 6) * (Math.PI / 3);

/** Unit vector the camera faces on the floor. */
export const forwardOf = (yaw: number): Point => ({ x: Math.sin(yaw), y: -Math.cos(yaw) });

export const clampFov = (fov: number): number => Math.min(FOV_MAX, Math.max(FOV_MIN, fov));

const clampPitch = (pitch: number): number => Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));

/**
 * Where the camera may not be: on a wall hex or outside the grid, with its radius around it. Hexes come from
 * `pixelToHex` (cube rounding), never from ad-hoc math.
 */
export const cameraBlocker = (walls: readonly Offset[], columns: number, rows: number): CameraBlocked => {
  const wallSet = toWallSet(walls);
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  const blockedPoint = (x: number, z: number): boolean => {
    if (x < 0 || z < 0 || x > width || z > height) return true;
    const hex = pixelToHex({ x, y: z }, HEX_SIZE);
    return !isInsideGrid(hex, columns, rows) || wallSet.has(wallKey(hex.x, hex.y));
  };
  return (x, z) =>
    blockedPoint(x, z)
    || blockedPoint(x + CAMERA_RADIUS, z) || blockedPoint(x - CAMERA_RADIUS, z)
    || blockedPoint(x, z + CAMERA_RADIUS) || blockedPoint(x, z - CAMERA_RADIUS);
};

/** First blocked point on the segment from `from` to `to`, as a fraction 0–1 of the way (null = clear). */
export const segmentHitsWall = (from: Point, to: Point, blocked: CameraBlocked): number | null => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / SEGMENT_STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return t;
  }
  return null;
};

/**
 * Behind the piece at `target` (map px of its center), looking the way it faces; with a wall in between the camera
 * comes closer to the piece instead of standing behind the wall (FR-011).
 */
export const followPose = (target: Point, look: number, blocked: CameraBlocked): CameraPose => {
  const yaw = lookToYaw(look);
  const forward = forwardOf(yaw);
  const wanted = { x: target.x - forward.x * FOLLOW_DISTANCE, y: target.y - forward.y * FOLLOW_DISTANCE };
  const hit = segmentHitsWall(target, wanted, blocked);
  // Stop one step before the first blocked point (never past the piece itself).
  const reach = hit === null ? 1 : Math.max(0, hit - SEGMENT_STEP / FOLLOW_DISTANCE);
  return {
    x: target.x + (wanted.x - target.x) * reach,
    z: target.y + (wanted.y - target.y) * reach,
    yaw,
    pitch: -0.18,
    attached: true,
  };
};

/**
 * One step of free navigation: turn/tilt, then walk/strafe one axis at a time so the camera slides along a wall
 * instead of stopping dead. Any input lets go of the character (FR-010c).
 */
export const stepCamera = (pose: CameraPose, input: CameraInput, blocked: CameraBlocked): CameraPose => {
  const { forward = 0, strafe = 0, turn = 0, tilt = 0 } = input;
  if (forward === 0 && strafe === 0 && turn === 0 && tilt === 0) return pose;
  const yaw = pose.yaw + turn;
  const ahead = forwardOf(yaw);
  // Right of the facing = the facing turned 90° clockwise.
  const right = { x: -ahead.y, y: ahead.x };
  const dx = ahead.x * forward + right.x * strafe;
  const dz = ahead.y * forward + right.y * strafe;
  let { x, z } = pose;
  if (dx !== 0 && !blocked(x + dx, z)) x += dx;
  if (dz !== 0 && !blocked(x, z + dz)) z += dz;
  return { x, z, yaw, pitch: clampPitch(pose.pitch + tilt), attached: false };
};

/**
 * Where the camera starts (FR-010a/d): behind the chosen character's piece, or — for the GM or a character without a
 * piece on this map — free at the center of the grid, facing north.
 */
export const initialCamera = (
  piece: { center: Point; look: number } | null,
  columns: number,
  rows: number,
  blocked: CameraBlocked,
): CameraPose => {
  if (piece) return followPose(piece.center, piece.look, blocked);
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  return { x: width / 2, z: height / 2, yaw: 0, pitch: 0, attached: false };
};
