import type { ModelBounds } from './modelFit';

/**
 * The front of a token's 3D model (106). A file without a skeleton (a prop, a statue, a vehicle) often does not face
 * glTF's forward (+Z), so the user says which side of the file is its front: the direction in the file's floor plane,
 * in degrees clockwise seen from above — 0 = +Z, 90 = +X, 180 = −Z, 270 = −X. Same values as the backend
 * `Guard.ModelFront`. The views turn the file by `frontTurn` inside the model's own frame, before anything else, so that
 * side ends on +Z and every other rule (`lib/modelFit`) stays as it is.
 */
export const MODEL_FRONTS = [0, 90, 180, 270] as const;

export type ModelFront = (typeof MODEL_FRONTS)[number];

/** A saved value as the views read it: anything else is +Z (as before). */
export const toModelFront = (value?: number | null): ModelFront =>
  (MODEL_FRONTS as readonly number[]).includes(value ?? 0) ? (value ?? 0) as ModelFront : 0;

/**
 * Turn about the vertical (radians, three.js convention) that brings the front to +Z: a turn φ takes (x, z) to
 * (x cos φ + z sin φ, −x sin φ + z cos φ), and the front's direction is (sin d, cos d), so φ = −d.
 */
export const frontTurn = (front: ModelFront): number => (front === 0 ? 0 : (-front * Math.PI) / 180);

/** The bounds of the model once turned by `frontTurn` (quarter turns keep the box exact). */
export const turnedBounds = (bounds: ModelBounds, front: ModelFront): ModelBounds => {
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  switch (front) {
    case 90: return { min: [-maxZ, minY, minX], max: [-minZ, maxY, maxX] };
    case 180: return { min: [-maxX, minY, -maxZ], max: [-minX, maxY, -minZ] };
    case 270: return { min: [minZ, minY, -maxX], max: [maxZ, maxY, -minX] };
    default: return bounds;
  }
};

/** The model has a skeleton (a rig with bones): it animates and carries weapons; without one the user picks its front. */
export const hasSkeleton = (boneNames: readonly string[]): boolean => boneNames.length > 0;
