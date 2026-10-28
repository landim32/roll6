import { describe, expect, it } from 'vitest';
import { dashSegments } from './isoTrail';

const length = ([a, b]: [{ x: number; y: number }, { x: number; y: number }]) => Math.hypot(b.x - a.x, b.y - a.y);

describe('isoTrail', () => {
  it('cuts a straight line into dashes and gaps', () => {
    const dashes = dashSegments([{ x: 0, y: 0 }, { x: 60, y: 0 }], 10, 5);
    expect(dashes.map(([a, b]) => [a.x, b.x])).toEqual([[0, 10], [15, 25], [30, 40], [45, 55]]);
  });

  it('keeps the pattern across a corner', () => {
    const dashes = dashSegments([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 20 }], 10, 5);
    // The first dash runs 6 along x and 4 along y.
    expect(dashes[0][0]).toEqual({ x: 0, y: 0 });
    expect(dashes[0][1]).toEqual({ x: 6, y: 0 });
    expect(dashes[1][0]).toEqual({ x: 6, y: 0 });
    expect(dashes[1][1].y).toBeCloseTo(4);
    expect(dashes[2][0].y).toBeCloseTo(9);
    expect(dashes.reduce((sum, d) => sum + length(d), 0)).toBeCloseTo(6 + 4 + 10);
  });

  it('draws nothing for a path without length', () => {
    expect(dashSegments([{ x: 3, y: 3 }])).toEqual([]);
    expect(dashSegments([{ x: 3, y: 3 }, { x: 3, y: 3 }])).toEqual([]);
  });
});
