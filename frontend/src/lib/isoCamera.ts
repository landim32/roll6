import { hexCenter, HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import { hexStep } from './isoLight';

/**
 * The camera of the isometric view (103/105): orthographic, looking down at a point of the floor (the target) from a
 * fixed distance. The user slides the target over the map (105: it never follows a piece; it only starts on the
 * viewer's character), turns around it (yaw), tilts it between two limits (pitch) and zooms
 * (span = how many hexes fit in the height of the screen). The target is also the middle of the light circle. Pure.
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

/** The rectangle the target may go over: from the first to the last hex center of the grid (map px). */
export interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const mapBounds = (columns: number, rows: number): MapBounds => {
  const lastColumn = Math.max(0, columns - 1);
  const lastRow = Math.max(0, rows - 1);
  const first = hexCenter(0, 0, HEX_SIZE);
  // An odd column sits half a hex lower: the lowest center is in an odd column, when there is one.
  const lowest = hexCenter(lastColumn >= 1 ? 1 : 0, lastRow, HEX_SIZE);
  return { minX: first.x, minY: first.y, maxX: hexCenter(lastColumn, 0, HEX_SIZE).x, maxY: lowest.y };
};

export const clampTarget = (target: Point, bounds: MapBounds): Point => ({
  x: Math.min(bounds.maxX, Math.max(bounds.minX, target.x)),
  y: Math.min(bounds.maxY, Math.max(bounds.minY, target.y)),
});

/**
 * A slide with the floor held under the pointer: `grabbed` is the point of the floor under it when the drag began and
 * `now` the point under it at this moment (both read with the current pose); the target moves by their difference, so
 * the grabbed point comes back under the pointer. Kept inside the map.
 */
export const panTo = (pose: IsoPose, grabbed: Point, now: Point, bounds: MapBounds): IsoPose => ({
  ...pose,
  target: clampTarget({ x: pose.target.x + grabbed.x - now.x, y: pose.target.y + grabbed.y - now.y }, bounds),
});

/** Two fingers turning (radians, clockwise on the screen = positive): the camera turns around the target. */
export const twistBy = (pose: IsoPose, radians: number): IsoPose => clampIso({ ...pose, yaw: pose.yaw - radians });

/** Two fingers moving up or down together (screen px): the camera tilts, like a right drag. */
export const tiltBy = (pose: IsoPose, dy: number): IsoPose => orbitBy(pose, 0, dy);
