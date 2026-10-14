import { EYE_HEIGHT, NEAR, projectionOf } from './raycaster';
import type { CameraPose } from './raycaster';
import { forwardOf } from './storyCamera';

/**
 * The camera of the 3D models (055) as numbers: the same pinhole the raycaster draws with — eyes at `EYE_HEIGHT`, no
 * tilt, the horizon in the middle of the frame and square pixels — so a model stands exactly where a figure with the
 * same feet would. Pure: `modelLayer` hands these values to a three.js `PerspectiveCamera`, and the tests check them
 * against `projectSprite`.
 */

/** Vertical field of view (degrees) of a frame `aspect` = width / height wide, for the raycaster's horizontal one. */
export const verticalFov = (horizontalFov: number, aspect: number): number =>
  (2 * Math.atan(Math.tan((horizontalFov * Math.PI) / 360) / aspect) * 180) / Math.PI;

export interface CameraSetup {
  position: { x: number; y: number; z: number };
  /** A point straight ahead at the height of the eyes. */
  target: { x: number; y: number; z: number };
  verticalFov: number;
  near: number;
}

/** Where the camera stands and looks, in the world of the 3D view (x = map x, z = map y, y = up). */
export const cameraSetup = (pose: CameraPose, horizontalFov: number, aspect: number): CameraSetup => {
  const ahead = forwardOf(pose.yaw);
  return {
    position: { x: pose.x, y: EYE_HEIGHT, z: pose.z },
    target: { x: pose.x + ahead.x, y: EYE_HEIGHT, z: pose.z + ahead.y },
    verticalFov: verticalFov(horizontalFov, aspect),
    near: NEAR,
  };
};

/** Frame column and row of a world point (null behind the near plane), like the raycaster projects the figures. */
export const projectPoint = (
  pose: CameraPose,
  horizontalFov: number,
  frameWidth: number,
  frameHeight: number,
  point: { x: number; y: number; z: number },
): { x: number; y: number; depth: number } | null => {
  const projection = projectionOf(frameWidth, horizontalFov);
  const sin = Math.sin(pose.yaw);
  const cos = Math.cos(pose.yaw);
  const dx = point.x - pose.x;
  const dz = point.z - pose.z;
  const depth = dx * sin - dz * cos;
  if (depth <= NEAR) return null;
  const lateral = dx * cos + dz * sin;
  return {
    x: frameWidth / 2 + (lateral * projection) / depth,
    y: frameHeight / 2 - ((point.y - EYE_HEIGHT) * projection) / depth,
    depth,
  };
};
