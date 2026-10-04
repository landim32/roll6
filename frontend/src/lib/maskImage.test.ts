import { describe, expect, it } from 'vitest';
import { formatRatio, isMaskWall, sameRatio, thresholdPixels } from './maskImage';

describe('sameRatio', () => {
  it('accepts the same proportion at any size', () => {
    expect(sameRatio({ width: 1220, height: 1074 }, { width: 1220, height: 1074 })).toBe(true);
    expect(sameRatio({ width: 610, height: 537 }, { width: 1220, height: 1074 })).toBe(true);
  });

  it('accepts up to 1% of difference and refuses more', () => {
    // 1220 / 1074 = 1.1359...; 1% = 0.01136.
    expect(sameRatio({ width: 1225, height: 1074 }, { width: 1220, height: 1074 })).toBe(true);
    expect(sameRatio({ width: 1240, height: 1074 }, { width: 1220, height: 1074 })).toBe(false);
    expect(sameRatio({ width: 1000, height: 1000 }, { width: 1220, height: 1074 })).toBe(false);
  });

  it('refuses sizes that are not positive', () => {
    expect(sameRatio({ width: 0, height: 10 }, { width: 10, height: 10 })).toBe(false);
    expect(sameRatio({ width: 10, height: 10 }, { width: 10, height: 0 })).toBe(false);
  });
});

describe('formatRatio', () => {
  it('shows the proportion with a decimal comma', () => {
    expect(formatRatio({ width: 1220, height: 1074 })).toBe('1,14 : 1');
    expect(formatRatio({ width: 100, height: 100 })).toBe('1,00 : 1');
  });
});

describe('isMaskWall', () => {
  it('is wall when dark and opaque, empty when light', () => {
    expect(isMaskWall(0, 0, 0)).toBe(true);
    expect(isMaskWall(120, 120, 120)).toBe(true);
    expect(isMaskWall(136, 136, 136)).toBe(false);
    expect(isMaskWall(255, 255, 255)).toBe(false);
  });

  it('weighs the channels by luminance (green counts most)', () => {
    expect(isMaskWall(0, 230, 0)).toBe(false);
    expect(isMaskWall(0, 0, 255)).toBe(true);
  });

  it('counts a transparent pixel as empty, even when black', () => {
    expect(isMaskWall(0, 0, 0, 0)).toBe(false);
    expect(isMaskWall(0, 0, 0, 127)).toBe(false);
    expect(isMaskWall(0, 0, 0, 128)).toBe(true);
  });
});

describe('thresholdPixels', () => {
  it('leaves only black and white, opaque', () => {
    const pixels = new Uint8ClampedArray([
      10, 10, 10, 255, // dark → black
      200, 200, 200, 255, // light → white
      0, 0, 0, 0, // transparent → white
      90, 140, 60, 200, // mid-dark green → black (luma 107)
    ]);

    thresholdPixels(pixels);

    expect([...pixels]).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
    ]);
  });
});
