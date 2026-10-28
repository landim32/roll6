import type { Point } from './hexGrid';
import { hexStep } from './isoLight';

/**
 * The camera of the isometric view (103): orthographic, looking down at the focused character from a fixed distance.
 * The user turns it around (yaw), tilts it between two limits (pitch) and zooms (span = how many hexes fit in the height
 * of the screen). There is no pan: the target is always the focus. Pure.
 */
export interface IsoPose {
  /** Point of the floor the camera looks at (map px). */
  target: Point;
  /** Turn around the target (radians, (−π, π]); 0 = the camera south of the target, looking north. */
  yaw: number;
  /** Angle above the floor (degrees). */
  pitch: number;
  /** Hexes that fit in the height of the screen. */
  span: number;
}

export const PITCH_MIN = 30;
export const PITCH_MAX = 70;
/** The classic isometric angle: atan(1/√2). */
export const PITCH_DEFAULT = 35.26;
export const SPAN_MIN = 4;
export const SPAN_MAX = 30;
/** The 5-hex circle fits with room to spare. */
export const SPAN_DEFAULT = 14;
/** Degrees turned per pixel dragged. */
export const ORBIT_DEG_PER_PX = 0.35;
/** Zoom factor per step of the wheel or of the +/− buttons. */
export const ZOOM_STEP = 1.15;
/** How long the camera and the light glide to a new focus (seconds). */
export const FOCUS_EASE_SECONDS = 0.6;
/** Distance of the camera from the target (map px): only sets the depth range, the projection is orthographic. */
export const CAMERA_DISTANCE = 6000;

export const defaultIsoPose = (target: Point): IsoPose => ({ target, yaw: Math.PI / 4, pitch: PITCH_DEFAULT, span: SPAN_DEFAULT });

const wrapAngle = (angle: number): number => {
  const turn = 2 * Math.PI;
  let a = ((angle + Math.PI) % turn + turn) % turn - Math.PI;
  if (a <= -Math.PI) a += turn;
  return a;
};

export const clampIso = (pose: IsoPose): IsoPose => ({
  target: pose.target,
  yaw: wrapAngle(pose.yaw),
  pitch: Math.min(PITCH_MAX, Math.max(PITCH_MIN, pose.pitch)),
  span: Math.min(SPAN_MAX, Math.max(SPAN_MIN, pose.span)),
});

/** A drag of (dx, dy) screen px: sideways turns, up/down tilts. */
export const orbitBy = (pose: IsoPose, dx: number, dy: number): IsoPose => clampIso({
  ...pose,
  yaw: pose.yaw - (dx * ORBIT_DEG_PER_PX * Math.PI) / 180,
  pitch: pose.pitch + dy * ORBIT_DEG_PER_PX,
});

/** Positive steps zoom out (more hexes on screen), negative ones in; `steps` may be fractional (a pinch). */
export const zoomBy = (pose: IsoPose, steps: number): IsoPose => clampIso({ ...pose, span: pose.span * ZOOM_STEP ** steps });

/** Camera position in the scene: x = map x, y = height, z = map y. */
export const isoCameraPosition = (pose: IsoPose): { x: number; y: number; z: number } => {
  const pitch = (pose.pitch * Math.PI) / 180;
  const flat = CAMERA_DISTANCE * Math.cos(pitch);
  return {
    x: pose.target.x + flat * Math.sin(pose.yaw),
    y: CAMERA_DISTANCE * Math.sin(pitch),
    z: pose.target.y + flat * Math.cos(pose.yaw),
  };
};

/** Half the size of the orthographic frustum for a screen of `aspect` (width / height). */
export const frustumFor = (pose: IsoPose, aspect: number): { halfWidth: number; halfHeight: number } => {
  const halfHeight = (pose.span * hexStep()) / 2;
  return { halfWidth: halfHeight * Math.max(0.01, aspect), halfHeight };
};

/** Ease-out from `from` to `to`: t in [0, 1]. */
export const easeTarget = (from: Point, to: Point, t: number): Point => {
  const k = Math.min(1, Math.max(0, t));
  const e = 1 - (1 - k) ** 3;
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
};
