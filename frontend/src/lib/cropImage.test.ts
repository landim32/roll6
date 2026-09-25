import { describe, expect, it } from 'vitest';
import { CROP_OUTPUT_SIZE, cropOutputSize } from './cropImage';

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
