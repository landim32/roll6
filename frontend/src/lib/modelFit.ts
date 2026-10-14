import { FRONT_IMAGE_ASPECT, SILHOUETTE_SHARE } from './frontImage';
import type { Point } from './hexGrid';

/**
 * Where and how big a token's 3D model stands in the 3D view (055). Pure, so the rule is unit-tested.
 *
 * World of the 3D view: x = map x, z = map y, y = up, in map pixels. A model stands like the 2,5D figure it replaces:
 * as tall as the silhouette of that figure (the figure is as wide as the piece's shape and keeps the 3:4 crop, whose
 * silhouette is `SILHOUETTE_SHARE` of its height — 64 units for a 1-hex piece), the middle of its feet on the piece's
 * center, the file's +Z (glTF's "forward") along the way the piece looks.
 */

/** Bounds of a model in its own units (glTF: y up, +z forward). */
export interface ModelBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface ModelPlacement {
  /** Uniform scale from the file's units to map pixels. */
  scale: number;
  /** Position of the model's origin in the world. */
  position: { x: number; y: number; z: number };
  /** Turn about the vertical axis (radians, three.js convention). */
  rotationY: number;
}

/** Height of the figure of a piece whose shape is `width` px wide. */
export const figureHeight = (width: number): number => (SILHOUETTE_SHARE * width) / FRONT_IMAGE_ASPECT;

/**
 * Turn that points the model's +Z along a yaw of the 3D view (0 = north, the top of the 2D map, growing clockwise):
 * yaw's direction in the world is (sin yaw, −cos yaw) on x/z, and a turn φ about y takes +Z to (sin φ, cos φ).
 */
export const rotationForYaw = (yaw: number): number => Math.PI - yaw;

/** Scale, position and turn that stand a model of `bounds` on `center`, facing `yaw`, as tall as a figure `width` wide. */
export const fitModel = (bounds: ModelBounds, width: number, center: Point, yaw: number): ModelPlacement => {
  const tall = bounds.max[1] - bounds.min[1];
  const scale = tall > 1e-6 ? figureHeight(width) / tall : 1;
  const rotationY = rotationForYaw(yaw);
  // The middle of the feet, in the model's own frame, scaled.
  const footX = ((bounds.min[0] + bounds.max[0]) / 2) * scale;
  const footZ = ((bounds.min[2] + bounds.max[2]) / 2) * scale;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  // A turn about y: x' = x cos + z sin, z' = −x sin + z cos.
  const turnedX = footX * cos + footZ * sin;
  const turnedZ = -footX * sin + footZ * cos;
  return {
    scale,
    position: { x: center.x - turnedX, y: -bounds.min[1] * scale, z: center.y - turnedZ },
    rotationY,
  };
};
