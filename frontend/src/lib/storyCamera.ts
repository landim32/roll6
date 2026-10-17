import { gridPixelSize, HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import { EYE_HEIGHT } from './maskGrid';
import { groundUnder, STEP_HEIGHT } from './terrain';
import type { Terrain } from './terrain';
import { CLEARANCE, firstHit } from './terrainSight';

/**
 * Camera of the 3D view (034, a real 3D scene since 081): third person behind the chosen character, free when the user
 * walks away, never inside a block of the terrain nor under the floor, never leaving the map. It turns sideways and,
 * since 081, looks up and down (`pitch`). The user is just an observer: nothing here touches a piece. Pure (no DOM), so
 * the rules are unit-tested. Map units: 1 = 1 px of the 2D map, x → x, the map's y → z, height = y; `yaw` 0 faces north
 * (−z, the top of the 2D map) and grows clockwise, like `look`.
 */

/** Where the camera is and where it looks. */
export interface CameraPose {
  x: number;
  /** Height of the camera (world units). */
  y: number;
  /** Map y (the floor's second axis). */
  z: number;
  yaw: number;
  /** Up (+) or down (−), radians, within `PITCH_MIN`…`PITCH_MAX`. */
  pitch: number;
  /** True while following the chosen character's piece. */
  attached: boolean;
}

/** Distance from the followed piece to the camera behind it. */
export const FOLLOW_DISTANCE = 4 * HEX_SIZE;
/** Room the camera keeps from the edge of the map. */
export const CAMERA_RADIUS = HEX_SIZE / 3;
/** Zoom = horizontal field of view (degrees). */
export const FOV_MIN = 30;
export const FOV_MAX = 90;
export const FOV_DEFAULT = 70;
export const FOV_STEP = 10;
/** How far down and up the camera looks (081): never straight down or up, never upside down. */
export const PITCH_MIN = (-70 * Math.PI) / 180;
export const PITCH_MAX = (60 * Math.PI) / 180;
/** A little down: the character and the ground ahead of it. */
export const PITCH_DEFAULT = (-10 * Math.PI) / 180;
/** Steps along a segment when looking for the edge. */
const SEGMENT_STEP = HEX_SIZE / 4;

/** One frame of user input: distances in map units, the turn and the tilt in radians. */
export interface CameraInput {
  forward?: number;
  strafe?: number;
  turn?: number;
  pitch?: number;
}

/** True where the camera may not be on the map's plane (outside the map). */
export type CameraBlocked = (x: number, z: number) => boolean;

/** What the camera moves in: the terrain (null = flat floor) and the edge of the map. */
export interface CameraWorld {
  terrain: Terrain | null;
  edge: CameraBlocked;
}

/** Look 0–5 (clockwise from the top) as a yaw. */
export const lookToYaw = (look: number): number => (((look % 6) + 6) % 6) * (Math.PI / 3);

/** Unit vector the camera faces on the floor. */
export const forwardOf = (yaw: number): Point => ({ x: Math.sin(yaw), y: -Math.cos(yaw) });

export const clampFov = (fov: number): number => Math.min(FOV_MAX, Math.max(FOV_MIN, fov));

export const clampPitch = (pitch: number): number => Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));

/** Outside the map (the hex grid's rectangle), with the camera's radius around the point. */
export const cameraEdge = (columns: number, rows: number): CameraBlocked => {
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  return (x, z) => x - CAMERA_RADIUS < 0 || z - CAMERA_RADIUS < 0 || x + CAMERA_RADIUS > width || z + CAMERA_RADIUS > height;
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

/** The ground under the camera's footprint. */
const groundAt = (world: CameraWorld, x: number, z: number): number => groundUnder(world.terrain, x, z, CAMERA_RADIUS);

/**
 * The camera `distance` away from the head of the character standing at `target` on `ground`, at `orbit` around the
 * way it faces (`characterYaw`; 0 = behind it, π = in front, 068) and tilted by `pitch` (looking down puts it higher),
 * looking at the head so the character stays in the middle of the view. A block, the floor or the edge of the map in
 * between brings the camera closer, one step before it, instead of going through (081).
 */
export const orbitPose = (
  target: Point,
  ground: number,
  characterYaw: number,
  orbit: number,
  pitch: number,
  distance: number,
  world: CameraWorld,
): CameraPose => {
  const yaw = characterYaw + orbit;
  const tilt = clampPitch(pitch);
  const ahead = forwardOf(yaw);
  const head = { x: target.x, y: ground + EYE_HEIGHT, z: target.y };
  const flat = Math.cos(tilt) * distance;
  const wanted = { x: head.x - ahead.x * flat, y: head.y - Math.sin(tilt) * distance, z: head.z - ahead.y * flat };
  const hits = [
    firstHit(world.terrain, head, wanted),
    segmentHitsWall({ x: head.x, y: head.z }, { x: wanted.x, y: wanted.z }, world.edge),
  ].filter((hit): hit is number => hit !== null);
  const hit = hits.length > 0 ? Math.min(...hits) : null;
  // Stop one step before the first blocked point (never past the head itself).
  const reach = hit === null ? 1 : Math.max(0, hit - SEGMENT_STEP / Math.max(distance, 1));
  const x = head.x + (wanted.x - head.x) * reach;
  const z = head.z + (wanted.z - head.z) * reach;
  const y = Math.max(head.y + (wanted.y - head.y) * reach, groundAt(world, x, z) + CLEARANCE);
  return { x, y, z, yaw, pitch: tilt, attached: true };
};

/** The ground a piece stands on (its center, half a hex around it). */
export const pieceGround = (terrain: Terrain | null, center: Point): number => groundUnder(terrain, center.x, center.y, HEX_SIZE / 2);

/**
 * Behind the piece at `target` (map px of its center), looking the way it faces — or, with an `orbit` (068), at that
 * angle around it.
 */
export const followPose = (target: Point, look: number, world: CameraWorld, orbit = 0, pitch = PITCH_DEFAULT): CameraPose =>
  followYawPose(target, lookToYaw(look), world, orbit, pitch);

/** `followPose` for an exact direction (070: a piece left by a 3D walk faces its walk's direction). */
export const followYawPose = (target: Point, yaw: number, world: CameraWorld, orbit = 0, pitch = PITCH_DEFAULT): CameraPose =>
  orbitPose(target, pieceGround(world.terrain, target), yaw, orbit, pitch, FOLLOW_DISTANCE, world);

/**
 * One step of free navigation: turn and tilt, then walk/strafe one axis at a time so the camera slides along a block
 * instead of stopping dead. It walks on the terrain like a character (081): eyes above the ground, up a step, never up
 * a taller block, never off the map. Any input lets go of the character (FR-013).
 */
export const stepCamera = (pose: CameraPose, input: CameraInput, world: CameraWorld): CameraPose => {
  const { forward = 0, strafe = 0, turn = 0, pitch = 0 } = input;
  if (forward === 0 && strafe === 0 && turn === 0 && pitch === 0) return pose;
  const yaw = pose.yaw + turn;
  const ahead = forwardOf(yaw);
  // Right of the facing = the facing turned 90° clockwise.
  const right = { x: -ahead.y, y: ahead.x };
  const dx = ahead.x * forward + right.x * strafe;
  const dz = ahead.y * forward + right.y * strafe;
  const feet = pose.y - EYE_HEIGHT;
  const blocked = (x: number, z: number) => world.edge(x, z) || groundAt(world, x, z) > feet + STEP_HEIGHT;
  let { x, z } = pose;
  if (dx !== 0 && !blocked(x + dx, z)) x += dx;
  if (dz !== 0 && !blocked(x, z + dz)) z += dz;
  const moved = x !== pose.x || z !== pose.z;
  return {
    x, z, yaw,
    y: moved ? groundAt(world, x, z) + EYE_HEIGHT : pose.y,
    pitch: clampPitch(pose.pitch + pitch),
    attached: false,
  };
};

/**
 * Where the camera starts (FR-013): behind the chosen character's piece, or — for the GM or a character without a
 * piece on this map — free at the center of the map, on the ground there, facing north.
 */
export const initialCamera = (
  piece: { center: Point; look: number } | null,
  columns: number,
  rows: number,
  world: CameraWorld,
): CameraPose => {
  if (piece) return followPose(piece.center, piece.look, world);
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  const x = width / 2;
  const z = height / 2;
  return { x, y: groundAt(world, x, z) + EYE_HEIGHT, z, yaw: 0, pitch: PITCH_DEFAULT, attached: false };
};
