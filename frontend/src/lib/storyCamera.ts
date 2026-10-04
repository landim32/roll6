import { gridPixelSize, HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import { isWallAt } from './raycaster';
import type { CameraPose, MaskGrid } from './raycaster';

export type { CameraPose } from './raycaster';

/**
 * Camera of the 3D view (034): third person behind the chosen character, free when the user walks away, never through
 * the walls of the 3D mask and never leaving the map. It only turns sideways — no tilt — and the user is just an
 * observer: nothing here touches a piece. Pure (no DOM), so the rules are unit-tested. Map units: 1 = 1 px of the 2D
 * map; `yaw` 0 faces north (−y, the top of the 2D map) and grows clockwise, like `look`.
 */

/** Distance from the followed piece to the camera behind it. */
export const FOLLOW_DISTANCE = 4 * HEX_SIZE;
/** Room the camera keeps from walls and from the edge of the map. */
export const CAMERA_RADIUS = HEX_SIZE / 3;
/** Zoom = horizontal field of view (degrees). */
export const FOV_MIN = 30;
export const FOV_MAX = 90;
export const FOV_DEFAULT = 70;
export const FOV_STEP = 10;
/** Steps along a segment when looking for walls. */
const SEGMENT_STEP = HEX_SIZE / 4;

/** One frame of user input: distances in map units, the turn in radians. */
export interface CameraInput {
  forward?: number;
  strafe?: number;
  turn?: number;
}

/** True where the camera may not be. */
export type CameraBlocked = (x: number, z: number) => boolean;

/** Look 0–5 (clockwise from the top) as a yaw. */
export const lookToYaw = (look: number): number => (((look % 6) + 6) % 6) * (Math.PI / 3);

/** Unit vector the camera faces on the floor. */
export const forwardOf = (yaw: number): Point => ({ x: Math.sin(yaw), y: -Math.cos(yaw) });

export const clampFov = (fov: number): number => Math.min(FOV_MAX, Math.max(FOV_MIN, fov));

/**
 * Where the camera may not be: on a wall of the mask or outside the map (the hex grid's rectangle), with its radius
 * around it. Without a mask only the edge of the map blocks.
 */
export const cameraBlocker = (grid: MaskGrid | null, columns: number, rows: number): CameraBlocked => {
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  const blockedPoint = (x: number, z: number): boolean => {
    if (x < 0 || z < 0 || x > width || z > height) return true;
    return grid !== null && isWallAt(grid, x, z);
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
 * comes closer to the piece instead of standing behind the wall (FR-012).
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
    attached: true,
  };
};

/**
 * One step of free navigation: turn, then walk/strafe one axis at a time so the camera slides along a wall instead of
 * stopping dead. Any input lets go of the character (FR-013).
 */
export const stepCamera = (pose: CameraPose, input: CameraInput, blocked: CameraBlocked): CameraPose => {
  const { forward = 0, strafe = 0, turn = 0 } = input;
  if (forward === 0 && strafe === 0 && turn === 0) return pose;
  const yaw = pose.yaw + turn;
  const ahead = forwardOf(yaw);
  // Right of the facing = the facing turned 90° clockwise.
  const right = { x: -ahead.y, y: ahead.x };
  const dx = ahead.x * forward + right.x * strafe;
  const dz = ahead.y * forward + right.y * strafe;
  let { x, z } = pose;
  if (dx !== 0 && !blocked(x + dx, z)) x += dx;
  if (dz !== 0 && !blocked(x, z + dz)) z += dz;
  return { x, z, yaw, attached: false };
};

/**
 * Where the camera starts (FR-013): behind the chosen character's piece, or — for the GM or a character without a
 * piece on this map — free at the center of the map, facing north.
 */
export const initialCamera = (
  piece: { center: Point; look: number } | null,
  columns: number,
  rows: number,
  blocked: CameraBlocked,
): CameraPose => {
  if (piece) return followPose(piece.center, piece.look, blocked);
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  return { x: width / 2, z: height / 2, yaw: 0, attached: false };
};
