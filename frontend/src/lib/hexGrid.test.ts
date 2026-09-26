import { describe, expect, it } from 'vitest';
import {
  axialToOffset, gridPath, gridPixelSize, HEX_SIZE, hexCenter, hexCorners, hexPath, hexRound, isInsideGrid, offsetToAxial,
  pixelToHex,
} from './hexGrid';

// Reference values shared with backend/Roll6.Tests/Domain/Grid/HexGridTests.cs.
describe('hex size', () => {
  it('is fixed at 40 like the backend', () => {
    expect(HEX_SIZE).toBe(40);
  });
});

describe('offset ↔ axial (odd-q)', () => {
  it.each([
    [0, 0, 0, 0],
    [3, 1, 3, 2],
    [2, -1, 2, 0],
    [1, 0, 1, 0],
    [-3, 2, -3, 0],
  ])('axial (%i, %i) ↔ offset (%i, %i)', (q, r, x, y) => {
    expect(axialToOffset(q, r)).toEqual({ x, y });
    expect(offsetToAxial(x, y)).toEqual({ q, r });
  });

  it('round-trips a range of cells', () => {
    for (let x = -12; x <= 12; x++) {
      for (let y = -12; y <= 12; y++) {
        const { q, r } = offsetToAxial(x, y);
        expect(axialToOffset(q, r)).toEqual({ x, y });
      }
    }
  });
});

describe('grid geometry', () => {
  it('places hex (0, 0) touching the top-left corner', () => {
    const size = 10;
    const corners = hexCorners(hexCenter(0, 0, size), size);
    expect(Math.min(...corners.map((c) => c.x))).toBeCloseTo(0);
    expect(Math.min(...corners.map((c) => c.y))).toBeCloseTo(0);
  });

  it('shifts odd columns half a hex down', () => {
    const size = 10;
    expect(hexCenter(1, 0, size).y - hexCenter(0, 0, size).y).toBeCloseTo((Math.sqrt(3) / 2) * size);
  });

  it('gridPixelSize matches the outermost hex corners', () => {
    const size = HEX_SIZE;
    const { width, height } = gridPixelSize(13, 7, size);
    expect(width).toBeCloseTo(size * (1.5 * 13 + 0.5));
    expect(height).toBeCloseTo(Math.sqrt(3) * size * 7.5);

    // The last hexes reach the computed size.
    const lastCorners = hexCorners(hexCenter(12, 6, size), size);
    expect(Math.max(...lastCorners.map((c) => c.x))).toBeCloseTo(width, 5);
    const oddCorners = hexCorners(hexCenter(11, 6, size), size);
    expect(Math.max(...oddCorners.map((c) => c.y))).toBeCloseTo(height, 5);
  });

  it('draws one closed sub-path per hex', () => {
    const d = gridPath(3, 2, 10);
    expect(d.match(/M/g)).toHaveLength(6);
    expect(d.match(/Z/g)).toHaveLength(6);
  });
});

describe('pixelToHex (cube rounding)', () => {
  it('returns every hex for its own center and for points near its flat sides', () => {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 4; y++) {
        const center = hexCenter(x, y, HEX_SIZE);
        expect(pixelToHex(center, HEX_SIZE)).toEqual({ x, y });
        expect(pixelToHex({ x: center.x + 0.8 * HEX_SIZE, y: center.y }, HEX_SIZE)).toEqual({ x, y });
        expect(pixelToHex({ x: center.x - 0.8 * HEX_SIZE, y: center.y }, HEX_SIZE)).toEqual({ x, y });
      }
    }
  });

  // Same points as HexGridTests.PixelToHex_ReferencePoints in the backend.
  it.each([
    [40, 34.64, 0, 0],
    [100, 69.28, 1, 0],
    [160, 103.92, 2, 1],
    [1, 1, -1, -1],
    [100, 5, 1, -1],
  ])('(%d, %d) → (%d, %d)', (px, py, x, y) => {
    expect(pixelToHex({ x: px, y: py }, HEX_SIZE)).toEqual({ x, y });
  });

  it.each([
    [0.2, 0.2, 0, 0],
    [0.6, 0.3, 1, 0],
    [0.4, 0.4, 0, 1],
    [-0.6, 0.1, -1, 0],
  ])('hexRound(%d, %d) → (%d, %d)', (q, r, eq, er) => {
    expect(hexRound(q, r)).toEqual({ q: eq, r: er });
  });

  it('knows the grid bounds', () => {
    expect(isInsideGrid({ x: 0, y: 0 }, 5, 4)).toBe(true);
    expect(isInsideGrid({ x: 4, y: 3 }, 5, 4)).toBe(true);
    expect(isInsideGrid({ x: 5, y: 0 }, 5, 4)).toBe(false);
    expect(isInsideGrid({ x: 0, y: 4 }, 5, 4)).toBe(false);
    expect(isInsideGrid({ x: -1, y: 0 }, 5, 4)).toBe(false);
  });

  it('draws one hex as a closed path with 6 corners', () => {
    const path = hexPath(0, 0, HEX_SIZE);
    expect(path.startsWith('M80.00,34.64')).toBe(true);
    expect(path.split('L')).toHaveLength(6);
    expect(path.endsWith('Z')).toBe(true);
  });
});
