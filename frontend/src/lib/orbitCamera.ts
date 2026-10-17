import { clampPitch } from './storyCamera';

// The pose around the character lives in `storyCamera` (its `followPose` is the orbit 0 case); re-exported here.
export { orbitPose } from './storyCamera';

/**
 * The World of Warcraft-style camera of the 3D view (068): the camera circles the character it follows. The **orbit**
 * is its angle around the character, relative to where the character faces — 0 behind it, π in front, looking at its
 * face. Dragging changes the orbit without turning the character; the orbit stays while the character stands still
 * and eases back to 0 once it walks or turns ("Only when moving", the game's default following style); a right drag
 * first turns the character to where the camera looks. Since 081 the vertical drag tilts the camera up and down
 * (`pitchBy`), within the camera's limits. Pure, so every rule is unit-tested. Units: map px and radians, yaw 0 =
 * north, clockwise.
 */

/** Radians per horizontally dragged pixel (the drag of before). */
export const DRAG_TURN = 0.005;
/** Time constant of the swing back behind the character: 180° is under `ORBIT_SNAP` in about 0.7 s. */
export const ORBIT_RETURN_TAU = 0.12;
/** Below this the orbit snaps to exactly 0. */
export const ORBIT_SNAP = 0.01;

/** An angle in (−π, π]. */
export const normalizeOrbit = (angle: number): number => {
  const turn = 2 * Math.PI;
  const wrapped = ((angle % turn) + turn) % turn;
  return wrapped > Math.PI ? wrapped - turn : wrapped;
};

/** The left drag: `dx` screen pixels sideways move the camera around the character. */
export const orbitBy = (orbit: number, dx: number): number => normalizeOrbit(orbit + dx * DRAG_TURN);

/** The start of a right drag: the character turns to where the camera looks, and the camera is behind it again. */
export const foldIntoCharacter = (yaw: number, orbit: number): { yaw: number; orbit: number } => ({ yaw: yaw + orbit, orbit: 0 });

/** One step of `dt` seconds of the swing back behind the character, smooth and independent of the frame rate. */
export const easeBack = (orbit: number, dt: number): number => {
  if (orbit === 0) return 0;
  const next = orbit * Math.exp(-dt / ORBIT_RETURN_TAU);
  return Math.abs(next) < ORBIT_SNAP ? 0 : next;
};

/** The vertical drag (081): `dy` screen pixels down tilt the camera up — the scene follows the finger — within its limits. */
export const pitchBy = (pitch: number, dy: number): number => clampPitch(pitch + dy * DRAG_TURN);
