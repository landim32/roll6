import { HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import { isLying } from './pieceDrawing';
import { CAMERA_RADIUS, forwardOf, lookToYaw, orbitPose, PITCH_DEFAULT } from './storyCamera';
import type { CameraPose, CameraWorld } from './storyCamera';
import { groundUnder, STEP_HEIGHT } from './terrain';
import type { Terrain } from './terrain';
import type { MapTokenInfo } from '../types/mapToken';

/**
 * Walking the chosen character in the 3D view while the campaign is in free mode (055). The walk is **local**
 * (clarification Q1 = C): it lives only in this browser, never moves the piece and sends nothing, and it starts again
 * from the piece whenever the piece, the map or the mode changes. Since 081 it walks on the terrain of the 3D mask: it
 * stands on the top of whatever is under it, climbs by itself a rise up to `STEP_HEIGHT`, is stopped by anything taller
 * (Q2 = A, no jump) and falls when it walks off a block. Pure, so every rule is unit-tested. Units: map px; `yaw` 0
 * faces north and grows clockwise, like the camera's; `y` is the height of the feet.
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
  /** Height of the feet (081): the ground it stands on, or in the air while falling. */
  y: number;
  /** Speed of the fall (world units per second, downward); 0 on the ground. */
  vy: number;
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

/** Room around the character's feet: what it stands on and what stops it. */
export const WALKER_RADIUS = CAMERA_RADIUS;
/** Time to climb onto a step (s): quick, but the camera does not jump. */
export const STEP_RISE_TIME = 0.1;
/** Gravity of a fall off a block (world units per second²). */
export const GRAVITY = 1200;
/** A rise this close to the feet is reached at once. */
const SNAP = 0.5;

const groundAt = (terrain: Terrain | null, x: number, z: number): number => groundUnder(terrain, x, z, WALKER_RADIUS);

export const startWalker = (
  center: Point,
  look: number,
  distance = WALK_DISTANCE_DEFAULT,
  yaw?: number,
  terrain: Terrain | null = null,
): WalkerState => ({
  x: center.x,
  z: center.y,
  y: groundAt(terrain, center.x, center.y),
  vy: 0,
  // 070: a piece left by a walk starts facing exactly where it faced.
  yaw: yaw ?? lookToYaw(look),
  moving: false,
  distance: clampDistance(distance),
});

const clampDistance = (distance: number): number => Math.min(WALK_DISTANCE_MAX, Math.max(WALK_DISTANCE_MIN, distance));

/**
 * One step of `dt` seconds: turn, then walk one axis at a time so it slides along an obstacle instead of stopping; then
 * the feet follow the ground — up a step quickly, down a ledge with gravity. Since 069 the other pieces never stop it
 * (the walk is shared and passes through them); the edge of the map and anything higher than a step do (081).
 */
export const stepWalker = (state: WalkerState, input: WalkerInput, dt: number, world: CameraWorld): WalkerState => {
  const yaw = state.yaw + input.turn * WALKER_TURN_SPEED * dt;
  const distance = input.forward * WALKER_SPEED * dt;
  const blocked = (x: number, z: number) => world.edge(x, z) || groundAt(world.terrain, x, z) > state.y + STEP_HEIGHT;
  let { x, z } = state;
  if (distance !== 0) {
    const ahead = forwardOf(yaw);
    const dx = ahead.x * distance;
    const dz = ahead.y * distance;
    if (dx !== 0 && !blocked(x + dx, z)) x += dx;
    if (dz !== 0 && !blocked(x, z + dz)) z += dz;
  }
  const ground = groundAt(world.terrain, x, z);
  let { y, vy } = state;
  if (ground >= y) {
    // On the ground, or climbing a step: the feet rise to it, smoothly.
    y = ground - y <= SNAP ? ground : y + (ground - y) * Math.min(1, dt / STEP_RISE_TIME);
    vy = 0;
  } else {
    // Off a ledge: it falls until it lands.
    vy += GRAVITY * dt;
    y = Math.max(ground, y - vy * dt);
    if (y === ground) vy = 0;
  }
  return { ...state, x, z, y, vy, yaw, moving: x !== state.x || z !== state.z };
};

/** The zoom moves the camera closer (steps < 0) or farther (steps > 0), within its limits. */
export const zoomWalker = (state: WalkerState, steps: number): WalkerState => ({
  ...state,
  distance: clampDistance(state.distance + steps * WALK_DISTANCE_STEP),
});

/** The camera at a given distance behind the character, within its limits (a pinch scales it). */
export const withDistance = (state: WalkerState, distance: number): WalkerState => ({ ...state, distance: clampDistance(distance) });

/**
 * The camera behind the character, looking where it looks — or, with an `orbit` (068), at that angle around it, tilted
 * by `pitch` (081); a block in between brings it closer instead.
 */
export const walkCamera = (state: WalkerState, world: CameraWorld, orbit = 0, pitch = PITCH_DEFAULT): CameraPose =>
  orbitPose({ x: state.x, y: state.z }, state.y, state.yaw, orbit, pitch, state.distance, world);

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
