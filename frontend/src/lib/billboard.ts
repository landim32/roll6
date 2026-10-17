import type { Point } from './hexGrid';
import { chooseSprite, viewSeen } from './spriteView';
import type { SpriteView, ViewImages } from './spriteView';

/**
 * The 2,5D figures of the 3D scene (081) are pictures standing on the ground and turned to the camera. Which picture
 * shows is still the side of the character the camera sees (035): this module only adapts `spriteView` to a figure
 * drawn as a picture in the scene. Pure.
 */

/** The side the camera sees for a figure facing `yaw` (radians, clockwise from north), and whether it is mirrored. */
export const figureView = <T>(
  yaw: number,
  center: Point,
  camera: Point,
  images: ViewImages<T>,
  fallback: T,
): { image: T; mirrored: boolean; seen: SpriteView } => {
  const seen = viewSeen(yaw / (Math.PI / 3), center, camera);
  return { ...chooseSprite(images, fallback, seen), seen };
};

/**
 * The turn about the vertical axis that faces a picture (its front looks toward +z, the map's south) to the camera: the
 * figure always shows its face to the viewer, like the raycaster's figures did.
 */
export const facingAngle = (center: Point, camera: Point): number => Math.atan2(camera.x - center.x, camera.y - center.y);
