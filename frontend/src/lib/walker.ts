import { HEX_SIZE, pixelToHex } from './hexGrid';
import type { Point } from './hexGrid';
import { isBlocked } from './occupancy';
import type { Occupancy } from './occupancy';
import { isLying } from './pieceDrawing';
import { CAMERA_RADIUS, forwardOf, lookToYaw, orbitPose } from './storyCamera';
import type { CameraBlocked, CameraPose } from './storyCamera';
import type { MapTokenInfo } from '../types/mapToken';

/**
 * Walking the chosen character in the 3D view while the campaign is in free mode (055). The walk is **local**
 * (clarification Q1 = C): it lives only in this browser, never moves the piece and sends nothing, and it starts again
 * from the piece whenever the piece, the map or the mode changes. Pure, so every rule is unit-tested. Units: map px;
 * `yaw` 0 faces north and grows clockwise, like the camera's.
 */

/** Distance between the centers of two neighboring hexes (flat-top): √3 × size. */
const HEX_STEP = Math.sqrt(3) * HEX_SIZE;
/** Walking speed: 1.5 hex per second. */
export const WALKER_SPEED = 1.5 * HEX_STEP;
/** Turning speed (radians per second), the camera's. */
export const WALKER_TURN_SPEED = 1.8;
/**
 * How close and how far the camera may be behind the character, where it starts and one step of the zoom. Close by
 * default: on a phone held upright the horizontal field of view makes the vertical one very wide, so the character
 * shrinks quickly with distance (the observer camera's `FOLLOW_DISTANCE`, about 2.3 hex, felt far away).
 */
export const WALK_DISTANCE_MIN = 0.75 * HEX_STEP;
export const WALK_DISTANCE_DEFAULT = 1.1 * HEX_STEP;
export const WALK_DISTANCE_MAX = 6 * HEX_STEP;
export const WALK_DISTANCE_STEP = 0.5 * HEX_STEP;

export interface WalkerState {
  x: number;
  /** Map y. */
  z: number;
  yaw: number;
  /** It moved in the last step: the walk animation plays. */
  moving: boolean;
  /** Distance of the camera behind it. */
  distance: number;
}

/** One frame of input: −1…1 each (forward walks, back walks backwards; turn > 0 turns clockwise). */
export interface WalkerInput {
  forward: number;
  turn: number;
}

export const startWalker = (center: Point, look: number, distance = WALK_DISTANCE_DEFAULT): WalkerState => ({
  x: center.x,
  z: center.y,
  yaw: lookToYaw(look),
  moving: false,
  distance: clampDistance(distance),
});

const clampDistance = (distance: number): number => Math.min(WALK_DISTANCE_MAX, Math.max(WALK_DISTANCE_MIN, distance));

/**
 * Where the character may not stand: the camera's rule (the walls of the 3D mask of any height and the edge of the map,
 * with a radius around the point) plus the hexes taken by the other pieces (their whole shapes); its own piece's hexes
 * are free, since the walk starts on them.
 */
export const walkerBlocker = (wallsAndEdge: CameraBlocked, occupancy: Occupancy, ownId: number): CameraBlocked => {
  const onPiece = (x: number, z: number): boolean => {
    const hex = pixelToHex({ x, y: z }, HEX_SIZE);
    return isBlocked(occupancy, hex.x, hex.y, ownId);
  };
  return (x, z) =>
    wallsAndEdge(x, z)
    || onPiece(x, z)
    || onPiece(x + CAMERA_RADIUS, z) || onPiece(x - CAMERA_RADIUS, z)
    || onPiece(x, z + CAMERA_RADIUS) || onPiece(x, z - CAMERA_RADIUS);
};

/** One step of `dt` seconds: turn, then walk one axis at a time so it slides along an obstacle instead of stopping. */
export const stepWalker = (state: WalkerState, input: WalkerInput, dt: number, blocked: CameraBlocked): WalkerState => {
  const yaw = state.yaw + input.turn * WALKER_TURN_SPEED * dt;
  const distance = input.forward * WALKER_SPEED * dt;
  if (distance === 0) return { ...state, yaw, moving: false };
  const ahead = forwardOf(yaw);
  const dx = ahead.x * distance;
  const dz = ahead.y * distance;
  let { x, z } = state;
  if (dx !== 0 && !blocked(x + dx, z)) x += dx;
  if (dz !== 0 && !blocked(x, z + dz)) z += dz;
  return { ...state, x, z, yaw, moving: x !== state.x || z !== state.z };
};

/** The zoom moves the camera closer (steps < 0) or farther (steps > 0), within its limits. */
export const zoomWalker = (state: WalkerState, steps: number): WalkerState => ({
  ...state,
  distance: clampDistance(state.distance + steps * WALK_DISTANCE_STEP),
});

/** The camera at a given distance behind the character, within its limits (a pinch scales it). */
export const withDistance = (state: WalkerState, distance: number): WalkerState => ({ ...state, distance: clampDistance(distance) });

/**
 * The camera behind the character, looking where it looks — or, with an `orbit` (068), at that angle around it; a wall
 * in between brings it closer instead.
 */
export const walkCamera = (state: WalkerState, wallsAndEdge: CameraBlocked, orbit = 0): CameraPose =>
  orbitPose({ x: state.x, y: state.z }, state.yaw, orbit, state.distance, wallsAndEdge);

/** The hex side (0–5) nearest to a yaw: how a 2,5D figure faces while it walks. */
export const walkerLook = (yaw: number): number => {
  const sixth = Math.round(yaw / (Math.PI / 3));
  return ((sixth % 6) + 6) % 6;
};

/**
 * The walk is on in free mode, for a player (not acting as the GM) whose chosen character has a piece standing on the
 * open map.
 */
export const canWalk = (options: {
  freeMode: boolean;
  isGm: boolean;
  piece: Pick<MapTokenInfo, 'posture'> | null;
}): boolean => options.freeMode && !options.isGm && options.piece !== null && !isLying(options.piece);
