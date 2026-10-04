import { describe, expect, it } from 'vitest';
import { fromWallPairs, paintWalls, sameWalls, toWallPairs, trimWalls, wallsPath } from './storyWalls';

const at = (x: number, y: number) => ({ x, y });

describe('storyWalls', () => {
  it('paints sorted by row then column, without duplicates or hexes outside the grid', () => {
    const walls = paintWalls([at(5, 3)], [at(1, 3), at(2, 0), at(5, 3), at(10, 0), at(-1, 1)], 'paint', 10, 8);

    expect(walls).toEqual([at(2, 0), at(1, 3), at(5, 3)]);
  });

  it('erases only the given hexes', () => {
    expect(paintWalls([at(0, 0), at(1, 0), at(2, 0)], [at(1, 0)], 'erase', 10, 8)).toEqual([at(0, 0), at(2, 0)]);
  });

  it('returns the same list when painting or erasing changes nothing', () => {
    const walls = [at(1, 1)];

    expect(paintWalls(walls, [at(1, 1)], 'paint', 10, 8)).toBe(walls);
    expect(paintWalls(walls, [at(4, 4)], 'erase', 10, 8)).toBe(walls);
    expect(paintWalls(walls, [at(20, 20)], 'paint', 10, 8)).toBe(walls);
  });

  it('trims the walls left outside a smaller grid', () => {
    const walls = [at(0, 0), at(5, 2), at(2, 6)];

    expect(trimWalls(walls, 4, 5)).toEqual([at(0, 0)]);
    expect(trimWalls(walls, 10, 10)).toBe(walls);
  });

  it('compares walls ignoring order', () => {
    expect(sameWalls([at(0, 0), at(1, 2)], [at(1, 2), at(0, 0)])).toBe(true);
    expect(sameWalls([at(0, 0)], [at(0, 1)])).toBe(false);
    expect(sameWalls([at(0, 0)], [])).toBe(false);
  });

  it('converts to and from the API pairs', () => {
    const walls = [at(2, 0), at(1, 3)];

    expect(toWallPairs(walls)).toEqual([[2, 0], [1, 3]]);
    expect(fromWallPairs([[1, 3], [2, 0], [2, 0], [7]])).toEqual(walls);
    expect(fromWallPairs(null)).toEqual([]);
  });

  it('draws one closed hex per wall', () => {
    expect(wallsPath([], 40)).toBe('');
    expect(wallsPath([at(0, 0), at(1, 0)], 40).match(/Z/g)).toHaveLength(2);
  });
});
