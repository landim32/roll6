import { describe, expect, it } from 'vitest';
import { PREVIEW_ZOOM_MAX, PREVIEW_ZOOM_MIN, clampZoom, pinchZoom, stepZoom, wheelZoom } from './previewZoom';

describe('previewZoom', () => {
  it('keeps the zoom between the whole character and the hand', () => {
    expect(clampZoom(0.2)).toBe(PREVIEW_ZOOM_MIN);
    expect(clampZoom(40)).toBe(PREVIEW_ZOOM_MAX);
    expect(clampZoom(Number.NaN)).toBe(PREVIEW_ZOOM_MIN);
    expect(clampZoom(2)).toBe(2);
  });

  it('zooms in on a wheel roll up and a roll down cancels it', () => {
    const zoomed = wheelZoom(2, -100);
    expect(zoomed).toBeGreaterThan(2);
    expect(wheelZoom(zoomed, 100)).toBeCloseTo(2);
    expect(wheelZoom(1, 300)).toBe(PREVIEW_ZOOM_MIN);
  });

  it('follows the ratio of the fingers in a pinch', () => {
    expect(pinchZoom(1, 100, 200)).toBe(2);
    expect(pinchZoom(2, 100, 50)).toBe(1);
    expect(pinchZoom(2, 0, 50)).toBe(2);
    expect(pinchZoom(3, 10, 1000)).toBe(PREVIEW_ZOOM_MAX);
  });

  it('steps with the buttons and stops at the limits', () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1.5, -1)).toBeCloseTo(1);
    expect(stepZoom(1, -1)).toBe(PREVIEW_ZOOM_MIN);
    expect(stepZoom(3.9, 1)).toBe(PREVIEW_ZOOM_MAX);
  });
});
