import { describe, expect, it } from 'vitest';
import { toMapPoint } from './useMapPointer';

describe('toMapPoint', () => {
  const rect = { left: 10, top: 20 };

  it('removes the SVG offset and the pan', () => {
    expect(toMapPoint(150, 220, rect, { zoom: 1, panX: 40, panY: 80 })).toEqual({ x: 100, y: 120 });
  });

  it('undoes the zoom', () => {
    expect(toMapPoint(250, 320, rect, { zoom: 2, panX: 40, panY: 100 })).toEqual({ x: 100, y: 100 });
  });
});
