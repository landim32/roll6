/**
 * Zoom of a chat photo in its window: `scale` multiplies the picture fitted to the window (1 = all of it visible) and
 * `x`/`y` move it, in screen pixels from the middle of the window. Pure, so the lightbox only feeds it pointer data.
 */

export interface ImageView {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const IMAGE_ZOOM_MIN = 1;
export const IMAGE_ZOOM_MAX = 8;
/** One "+" / "−" press. */
export const IMAGE_ZOOM_STEP = 1.5;
/** Where a double click/tap goes from the fitted picture. */
export const IMAGE_ZOOM_DOUBLE = 2.5;
/** One wheel notch (100 px of `deltaY`). */
const WHEEL_STEP = 1.2;

export const FITTED: ImageView = { scale: 1, x: 0, y: 0 };

export const clampScale = (scale: number): number =>
  (Number.isFinite(scale) ? Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, scale)) : IMAGE_ZOOM_MIN);

const clampAxis = (offset: number, picture: number, stage: number): number => {
  const room = Math.max(0, (picture - stage) / 2);
  return Math.min(room, Math.max(-room, offset));
};

/** Keeps the picture covering the window where it is larger than it, and centered where it is smaller. */
export const clampPan = (view: ImageView, fitted: Size, stage: Size): ImageView => ({
  scale: view.scale,
  x: clampAxis(view.x, fitted.width * view.scale, stage.width),
  y: clampAxis(view.y, fitted.height * view.scale, stage.height),
});

/**
 * Zooms to `scale` keeping the point under `point` (screen px from the middle of the window) where it is, then clamps
 * the pan. Back at 1 the picture is centered again.
 */
export const zoomAt = (view: ImageView, scale: number, point: { x: number; y: number }, fitted: Size, stage: Size): ImageView => {
  const next = clampScale(scale);
  if (next === IMAGE_ZOOM_MIN) return FITTED;
  const ratio = next / view.scale;
  return clampPan({ scale: next, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio }, fitted, stage);
};

/** The scale after a wheel event: rolling up (negative `deltaY`) zooms in. */
export const wheelScale = (scale: number, deltaY: number): number => clampScale(scale * WHEEL_STEP ** (-deltaY / 100));

/** The scale after a "+" (1) or "−" (−1) press. */
export const stepScale = (scale: number, direction: 1 | -1): number =>
  clampScale(direction > 0 ? scale * IMAGE_ZOOM_STEP : scale / IMAGE_ZOOM_STEP);

/** A double click/tap: zooms in on the point from the fitted picture, back to fitted otherwise. */
export const doubleScale = (scale: number): number => (scale > IMAGE_ZOOM_MIN ? IMAGE_ZOOM_MIN : IMAGE_ZOOM_DOUBLE);

/** The scale while two fingers pinch, from the scale and the fingers' distance at the pinch's start. */
export const pinchScale = (startScale: number, startDistance: number, distance: number): number =>
  (startDistance > 1e-6 ? clampScale(startScale * (distance / startDistance)) : clampScale(startScale));
