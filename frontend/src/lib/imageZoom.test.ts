import { describe, expect, it } from 'vitest';
import { FITTED, IMAGE_ZOOM_MAX, clampPan, doubleScale, pinchScale, stepScale, wheelScale, zoomAt } from './imageZoom';

const stage = { width: 800, height: 600 };
const fitted = { width: 800, height: 400 };

describe('imageZoom', () => {
  it('keeps the point under the pointer still while zooming', () => {
    const view = zoomAt(FITTED, 2, { x: 200, y: 0 }, fitted, stage);
    expect(view).toEqual({ scale: 2, x: -200, y: 0 });
    // The picture point that was at +200 is now at x + 200 * 2 = 200.
    expect(view.x + 200 * view.scale).toBe(200);
  });

  it('never lets the picture leave the window and centres a smaller side', () => {
    expect(clampPan({ scale: 2, x: 5000, y: 300 }, fitted, stage)).toEqual({ scale: 2, x: 400, y: 100 });
    expect(clampPan({ scale: 1.2, x: 0, y: 50 }, fitted, stage)).toEqual({ scale: 1.2, x: 0, y: 0 });
  });

  it('goes back to the fitted picture at 1 and stops at the maximum', () => {
    expect(zoomAt({ scale: 2, x: -100, y: 40 }, 0.5, { x: 10, y: 10 }, fitted, stage)).toEqual(FITTED);
    expect(stepScale(IMAGE_ZOOM_MAX, 1)).toBe(IMAGE_ZOOM_MAX);
    expect(stepScale(1.5, -1)).toBe(1);
  });

  it('reads the wheel, the double tap and the pinch', () => {
    expect(wheelScale(1, -100)).toBeCloseTo(1.2);
    expect(wheelScale(1, 100)).toBe(1);
    expect(doubleScale(1)).toBe(2.5);
    expect(doubleScale(3)).toBe(1);
    expect(pinchScale(2, 100, 150)).toBe(3);
    expect(pinchScale(2, 0, 150)).toBe(2);
  });
});
