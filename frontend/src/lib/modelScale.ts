/**
 * Size of a token's 3D model (063): a percentage of its automatic height in the 3D view (the 2,5D figure's silhouette
 * for the piece's hexes), 25–400 in steps of 5, 100 = as before. Same limits as the backend `Guard.ModelScale`.
 */

export const MODEL_SCALE = { min: 25, max: 400, step: 5, standard: 100 } as const;

/** The factor the 3D view multiplies the model's automatic height by; a missing or invalid size is 1 (as before). */
export const modelScaleFactor = (percent?: number | null): number =>
  typeof percent === 'number' && Number.isFinite(percent) && percent > 0 ? percent / 100 : 1;

/** A typed size kept inside the range, on the step. */
export const clampModelScale = (value: number): number => {
  if (!Number.isFinite(value)) return MODEL_SCALE.standard;
  const stepped = Math.round(value / MODEL_SCALE.step) * MODEL_SCALE.step;
  return Math.min(MODEL_SCALE.max, Math.max(MODEL_SCALE.min, stepped));
};

/** "120%". */
export const formatModelScale = (percent: number): string => `${percent}%`;

/**
 * How much the token form's preview pulls its camera back (063): the disc of the piece stays fixed as the reference and
 * the model grows on it, so the camera and the point it looks at move away and up by this much for a bigger model to
 * fit; a smaller one just shrinks on the disc.
 */
export const previewFraming = (factor: number): number => Math.max(1, factor);
