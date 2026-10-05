import { describe, expect, it } from 'vitest';
import { grayscalePixels, pixelHeight, sameRatio, wallHeight, formatRatio } from './maskImage';

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

describe('pixelHeight', () => {
  it('asks for the whole wall when black, nothing when white, half when gray', () => {
    expect(pixelHeight(0, 0, 0)).toBe(1);
    expect(pixelHeight(255, 255, 255)).toBe(0);
    expect(pixelHeight(128, 128, 128)).toBeCloseTo(0.498, 2);
  });

  it('weighs the channels by luminance (green counts most)', () => {
    // The same brightness in one channel: green makes the lightest pixel, so the shortest wall.
    expect(pixelHeight(0, 230, 0)).toBeLessThan(pixelHeight(230, 0, 0));
    expect(pixelHeight(0, 230, 0)).toBeLessThan(pixelHeight(0, 0, 230));
    expect(pixelHeight(0, 0, 255)).toBeGreaterThan(pixelHeight(0, 255, 0));
  });

  it('counts a transparent pixel as empty, even when black', () => {
    expect(pixelHeight(0, 0, 0, 0)).toBe(0);
    expect(pixelHeight(0, 0, 0, 127)).toBe(0);
    expect(pixelHeight(0, 0, 0, 128)).toBe(1);
  });
});

describe('wallHeight', () => {
  it('is the whole wall for black and empty for white', () => {
    expect(wallHeight(0)).toBe(1);
    expect(wallHeight(255)).toBe(0);
  });

  it('is proportional in between (50% gray is half the wall)', () => {
    expect(wallHeight(127.5)).toBeCloseTo(0.5);
    expect(wallHeight(200)).toBeCloseTo(0.216, 2);
    expect(wallHeight(55)).toBeCloseTo(0.784, 2);
  });

  it('snaps the ends of the range so a black and white mask, with or without noise, comes out as before (FR-008)', () => {
    expect(wallHeight(10)).toBe(1);
    expect(wallHeight(12)).toBe(1);
    expect(wallHeight(245)).toBe(0);
    expect(wallHeight(250)).toBe(0);
    // just past the snap: a real gray, not a rounding of black or white
    expect(wallHeight(13)).toBeLessThan(1);
    expect(wallHeight(242)).toBeGreaterThan(0);
  });
});

describe('grayscalePixels', () => {
  it('keeps every tone as gray and leaves nothing transparent', () => {
    const pixels = new Uint8ClampedArray([
      10, 10, 10, 255, // nearly black → a tall wall
      200, 200, 200, 255, // light gray → a low wall
      0, 0, 0, 0, // transparent → empty, shown white
      90, 140, 60, 200, // a color tone → its luminance (116), opaque
    ]);

    grayscalePixels(pixels);

    expect([...pixels]).toEqual([
      10, 10, 10, 255,
      200, 200, 200, 255,
      255, 255, 255, 255,
      116, 116, 116, 255,
    ]);
  });

  it('shows the middle grays it got, where the old black and white preview erased them', () => {
    const pixels = new Uint8ClampedArray([128, 128, 128, 255]);

    grayscalePixels(pixels);

    expect(pixels[0]).toBe(128);
  });
});
