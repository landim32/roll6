import { describe, expect, it } from 'vitest';
import {
  axialToOffset, gridPath, gridPixelSize, HEX_SIZE, hexCenter, hexCorners, hexPath, hexRound, isInsideGrid, offsetToAxial,
  pixelToHex, neighbor, turnCost, movementField, movementCost, pathTo, arrivalCost, lookToward,
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

// Same reference cases as HexGridTests.MovementCost_ReferenceCases in the backend (grid 5 x 5).
describe('movement (steps + turns)', () => {
  const free = () => false;
  const start = { x: 2, y: 2, look: 0 };

  it('finds the neighbor on each side from an even and an odd column', () => {
    expect([0, 1, 2, 3, 4, 5].map((look) => neighbor(2, 2, look))).toEqual([
      { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 },
    ]);
    expect([0, 1, 2, 3, 4, 5].map((look) => neighbor(1, 1, look))).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 },
    ]);
  });

  it('counts the fewest turns', () => {
    expect(turnCost(0, 0)).toBe(0);
    expect(turnCost(0, 1)).toBe(1);
    expect(turnCost(0, 5)).toBe(1);
    expect(turnCost(1, 4)).toBe(3);
    expect(turnCost(5, 2)).toBe(3);
  });

  it.each([
    [{ x: 2, y: 2, look: 0 }, 0],
    [{ x: 2, y: 1, look: 0 }, 1],
    [{ x: 2, y: 2, look: 3 }, 3],
    [{ x: 3, y: 1, look: 1 }, 2],
    [{ x: 2, y: 3, look: 3 }, 4],
    [{ x: 2, y: 0, look: 0 }, 2],
  ])('costs %j = %i', (end, cost) => {
    expect(movementCost(movementField(start, 5, 5, free), end)).toBe(cost);
  });

  it('walks around blocked hexes and never through them', () => {
    const blocked = (x: number, y: number) => x === 2 && y === 1;
    const field = movementField(start, 5, 5, blocked);
    const cost = movementCost(field, { x: 2, y: 0, look: 0 });
    expect(cost).not.toBeNull();
    expect(cost!).toBeGreaterThan(2);
    expect(pathTo(field, { x: 2, y: 0, look: 0 }).some((s) => s.x === 2 && s.y === 1)).toBe(false);
  });

  it('has no path to blocked hexes or outside the grid', () => {
    const blocked = (x: number, y: number) => x === 2 && y === 1;
    const field = movementField(start, 5, 5, blocked);
    expect(movementCost(field, { x: 2, y: 1, look: 0 })).toBeNull();
    expect(movementCost(field, { x: 5, y: 0, look: 0 })).toBeNull();
    expect(arrivalCost(field, 2, 1)).toBeNull();
  });

  it('rebuilds the path and the cheapest arrival', () => {
    const field = movementField(start, 5, 5, free);
    const path = pathTo(field, { x: 2, y: 3, look: 3 });
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual({ x: 2, y: 3, look: 3 });
    expect(path).toHaveLength(5);
    expect(arrivalCost(field, 2, 3)).toEqual({ cost: 4, state: { x: 2, y: 3, look: 3 } });
    expect(arrivalCost(field, 2, 2)).toEqual({ cost: 0, state: start });
  });

  it('faces the side the point lies on', () => {
    const c = { x: 100, y: 100 };
    expect(lookToward(c, { x: 100, y: 50 }, 3)).toBe(0);
    expect(lookToward(c, { x: 150, y: 70 }, 3)).toBe(1);
    expect(lookToward(c, { x: 150, y: 130 }, 3)).toBe(2);
    expect(lookToward(c, { x: 100, y: 150 }, 0)).toBe(3);
    expect(lookToward(c, { x: 50, y: 130 }, 0)).toBe(4);
    expect(lookToward(c, { x: 50, y: 70 }, 0)).toBe(5);
    expect(lookToward(c, c, 2)).toBe(2);
  });
});
