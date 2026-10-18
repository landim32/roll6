/**
 * The zoom of the 3D previews (085): the token form's model preview and the weapon editor. A factor that divides the
 * camera's distance to its target — 1 = the whole character framed as before, up to `PREVIEW_ZOOM_MAX` = the hand and
 * the weapon filling the stage. Never stored: the owner of the preview keeps it while the same model is open.
 */

export const PREVIEW_ZOOM_MIN = 1;
export const PREVIEW_ZOOM_MAX = 4;
/** One "+" or "−" press. */
export const PREVIEW_ZOOM_STEP = 1.5;
/** One wheel notch (100 px of `deltaY`). */
const WHEEL_STEP = 1.1;

export const clampZoom = (zoom: number): number => {
  if (!Number.isFinite(zoom)) return PREVIEW_ZOOM_MIN;
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, zoom));
};

/** The zoom after a wheel event: rolling up (negative `deltaY`) zooms in. */
export const wheelZoom = (zoom: number, deltaY: number): number =>
  clampZoom(zoom * WHEEL_STEP ** (-deltaY / 100));

/** The zoom while two fingers pinch: the zoom at the pinch's start times the ratio of the fingers' distance since then. */
export const pinchZoom = (startZoom: number, startDistance: number, distance: number): number =>
  (startDistance > 1e-6 ? clampZoom(startZoom * (distance / startDistance)) : clampZoom(startZoom));

/** The zoom after a "+" (1) or "−" (−1) press. */
export const stepZoom = (zoom: number, direction: 1 | -1): number =>
  clampZoom(direction > 0 ? zoom * PREVIEW_ZOOM_STEP : zoom / PREVIEW_ZOOM_STEP);
