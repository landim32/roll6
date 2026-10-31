import type { ModelBounds } from './modelFit';

/**
 * The front of a token's 3D model (106). A file without a skeleton (a prop, a statue, a vehicle) often does not face
 * glTF's forward (+Z), so the user says which way of the file is its front: a direction in the file's floor plane, in
 * whole degrees clockwise seen from above — 0 = +Z, 90 = +X, 180 = −Z, 270 = −X. Same values as the backend
 * `Guard.ModelFront` (0–359). The views turn the file by `frontTurn` inside the model's own frame, before anything else,
 * so that direction ends on +Z and every other rule (`lib/modelFit`) stays as it is.
 */
export type ModelFront = number;

export const MODEL_FRONT_MAX = 359;

/** A value as the views read it: whole degrees in 0–359; anything that is not a number is +Z (as before). */
export const toModelFront = (value?: number | null): ModelFront => {
  if (value == null || !Number.isFinite(value)) return 0;
  return ((Math.round(value) % 360) + 360) % 360;
};

/** The front shown on the form's slider (−180…180, like the token images' rotation), and back. */
export const frontRotation = (front: ModelFront): number => {
  const value = toModelFront(front);
  return value > 180 ? value - 360 : value;
};
export const frontFromRotation = (rotation: number): ModelFront => toModelFront(rotation);

/**
 * Turn about the vertical (radians, three.js convention) that brings the front to +Z: a turn φ takes (x, z) to
 * (x cos φ + z sin φ, −x sin φ + z cos φ), and the front's direction is (sin d, cos d), so φ = −d.
 */
export const frontTurn = (front: ModelFront): number => (front === 0 ? 0 : (-front * Math.PI) / 180);

/** The bounds of the model once turned by `frontTurn`: the box around its turned box (exact for quarter turns). */
export const turnedBounds = (bounds: ModelBounds, front: ModelFront): ModelBounds => {
  if (front === 0) return bounds;
  const angle = frontTurn(front);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const xs: number[] = [];
  const zs: number[] = [];
  for (const x of [minX, maxX]) {
    for (const z of [minZ, maxZ]) {
      xs.push(x * cos + z * sin);
      zs.push(-x * sin + z * cos);
    }
  }
  return { min: [Math.min(...xs), minY, Math.min(...zs)], max: [Math.max(...xs), maxY, Math.max(...zs)] };
};

/** The model has a skeleton (a rig with bones): it animates and carries weapons; without one the user picks its front. */
export const hasSkeleton = (boneNames: readonly string[]): boolean => boneNames.length > 0;
