import { describe, expect, it } from 'vitest';
import { CROP_OUTPUT_SIZE, cropOutputSize, rotatedBoundingBox } from './cropImage';

describe('cropOutputSize', () => {
  it('limits large crops to the output size', () => {
    expect(cropOutputSize({ x: 0, y: 0, width: 2000, height: 2000 })).toBe(CROP_OUTPUT_SIZE);
  });

  it('never upscales a small crop', () => {
    expect(cropOutputSize({ x: 10, y: 10, width: 200.4, height: 200.4 })).toBe(200);
  });

  it('uses the smaller side and is at least 1', () => {
    expect(cropOutputSize({ x: 0, y: 0, width: 300, height: 299 })).toBe(299);
    expect(cropOutputSize({ x: 0, y: 0, width: 0, height: 0 })).toBe(1);
  });
});

describe('rotatedBoundingBox', () => {
  it('keeps the size without rotation and at 180 degrees', () => {
    expect(rotatedBoundingBox(400, 200, 0)).toEqual({ width: 400, height: 200 });
    const half = rotatedBoundingBox(400, 200, 180);
    expect(half.width).toBeCloseTo(400);
    expect(half.height).toBeCloseTo(200);
  });

  it('swaps the sides at 90 degrees', () => {
    const box = rotatedBoundingBox(400, 200, 90);
    expect(box.width).toBeCloseTo(200);
    expect(box.height).toBeCloseTo(400);
  });

  it('grows to hold the diagonal at 45 degrees', () => {
    const box = rotatedBoundingBox(100, 100, 45);
    expect(box.width).toBeCloseTo(141.42, 1);
    expect(box.height).toBeCloseTo(141.42, 1);
  });
});
