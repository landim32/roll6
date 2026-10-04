import { hexCenter, hexCorners, isInsideGrid, type Offset } from './hexGrid';

/**
 * Walls of a story map (033): cells of the same hex grid (column/row, odd-q), kept sorted by row then column with no
 * duplicates — the same normalization as MapModel.UpdateStory on the backend, so a saved draft compares equal to the
 * map read back.
 */

export type WallMode = 'paint' | 'erase';

export const wallKey = (x: number, y: number): string => `${x},${y}`;

export const toWallSet = (walls: readonly Offset[]): Set<string> => new Set(walls.map((w) => wallKey(w.x, w.y)));

const byRowThenColumn = (a: Offset, b: Offset): number => a.y - b.y || a.x - b.x;

const normalize = (walls: Iterable<Offset>, columns: number, rows: number): Offset[] => {
  const seen = new Set<string>();
  const result: Offset[] = [];
  for (const wall of walls) {
    const key = wallKey(wall.x, wall.y);
    if (seen.has(key) || !isInsideGrid(wall, columns, rows)) continue;
    seen.add(key);
    result.push({ x: wall.x, y: wall.y });
  }
  return result.sort(byRowThenColumn);
};

/** Paints or erases hexes; hexes outside the grid are ignored. Returns the same list when nothing changes. */
export const paintWalls = (
  walls: readonly Offset[],
  hexes: readonly Offset[],
  mode: WallMode,
  columns: number,
  rows: number,
): Offset[] => {
  const current = toWallSet(walls);
  const inside = hexes.filter((h) => isInsideGrid(h, columns, rows));
  const changed = inside.some((h) => current.has(wallKey(h.x, h.y)) !== (mode === 'paint'));
  if (!changed) return walls as Offset[];
  if (mode === 'paint') return normalize([...walls, ...inside], columns, rows);
  const erased = toWallSet(inside);
  return walls.filter((w) => !erased.has(wallKey(w.x, w.y)));
};

/** Drops the walls left outside a smaller grid. Returns the same list when none is dropped. */
export const trimWalls = (walls: readonly Offset[], columns: number, rows: number): Offset[] =>
  walls.every((w) => isInsideGrid(w, columns, rows)) ? (walls as Offset[]) : walls.filter((w) => isInsideGrid(w, columns, rows));

/** Same cells, in any order. */
export const sameWalls = (a: readonly Offset[], b: readonly Offset[]): boolean => {
  if (a.length !== b.length) return false;
  const set = toWallSet(a);
  return b.every((w) => set.has(wallKey(w.x, w.y)));
};

/** Draft walls → API pairs [[x, y], …]. */
export const toWallPairs = (walls: readonly Offset[]): number[][] => walls.map((w) => [w.x, w.y]);

/** API pairs → draft walls (sorted, no duplicates; pairs that are not two numbers are skipped). */
export const fromWallPairs = (pairs: readonly number[][] | null | undefined): Offset[] => {
  const walls = (pairs ?? [])
    .filter((p) => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]))
    .map((p) => ({ x: p[0], y: p[1] }));
  return normalize(walls, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
};

/** SVG path data with every wall hex (one <path> for all walls). */
export const wallsPath = (walls: readonly Offset[], size: number): string =>
  walls
    .map((w) => {
      const corners = hexCorners(hexCenter(w.x, w.y, size), size);
      return `M${corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('L')}Z`;
    })
    .join('');
