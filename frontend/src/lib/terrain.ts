import { WALL_HEIGHT } from './maskGrid';
import type { MapArea, MaskGrid } from './maskGrid';

/**
 * The 3D scene's terrain (081): the mask's height grid turned into blocks you can stand on. Pure (no DOM, no WebGL): the
 * renderer in components/story only wraps these arrays in three.js geometry, and the walker and the camera read the
 * heights from here.
 *
 * The heights are rounded to `TERRAIN_LEVELS` steps so that close tones are one height and a speckle of noise never
 * becomes a field of thin columns. White is the floor (level 0), black a wall of full height (the last level), the grays
 * in between (036): an old black and white mask gives the same walls as before.
 *
 * World units are map pixels: x → x, the map's y → z, and y is up.
 */

export const TERRAIN_LEVELS = 16;
const TOP_LEVEL = TERRAIN_LEVELS - 1;

/**
 * Highest rise the character climbs by just walking into it (Q2 = A): about its waist. Anything taller stops it like a
 * wall — a tall stage is reached by a staircase of tones in the mask. In tones: lighter than about 70% gray.
 */
export const STEP_HEIGHT = 0.3 * WALL_HEIGHT;

/** The mask grid and the level (0 … TERRAIN_LEVELS − 1) of each of its cells. */
export interface Terrain {
  grid: MaskGrid;
  levels: Uint8Array;
}

/** The terrain of a mask grid; no grid (no mask) is a flat floor. */
export const buildTerrain = (grid: MaskGrid | null): Terrain | null => {
  if (!grid) return null;
  const levels = new Uint8Array(grid.heights.length);
  for (let i = 0; i < levels.length; i++) levels[i] = Math.round((grid.heights[i] * TOP_LEVEL) / 255);
  return { grid, levels };
};

/** World height of a level: 0 the floor, the last level a wall of full height. */
export const levelHeight = (level: number): number => (level / TOP_LEVEL) * WALL_HEIGHT;

const cellIndex = (grid: MaskGrid, x: number, z: number): number => {
  const col = Math.floor((x - grid.originX) / grid.cellWidth);
  const row = Math.floor((z - grid.originY) / grid.cellHeight);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return -1;
  return row * grid.cols + col;
};

/** Height of the terrain under a map point: the top of its block, 0 on the floor and outside the mask. */
export const terrainHeightAt = (terrain: Terrain | null, x: number, z: number): number => {
  if (!terrain) return 0;
  const index = cellIndex(terrain.grid, x, z);
  return index < 0 ? 0 : levelHeight(terrain.levels[index]);
};

/**
 * The ground under something of `radius` standing at a point: the highest of the point and four points around it, so
 * feet at the edge of a block stand on it instead of sinking into its side.
 */
export const groundUnder = (terrain: Terrain | null, x: number, z: number, radius: number): number => {
  if (!terrain) return 0;
  return Math.max(
    terrainHeightAt(terrain, x, z),
    terrainHeightAt(terrain, x + radius, z),
    terrainHeightAt(terrain, x - radius, z),
    terrainHeightAt(terrain, x, z + radius),
    terrainHeightAt(terrain, x, z - radius),
  );
};

/** The map image's coordinates of a point (v = 1 at the image's top, as textures read). */
export const mapUv = (area: MapArea, x: number, z: number): [number, number] => [
  (x - area.x) / area.width,
  1 - (z - area.y) / area.height,
];

/** The terrain as plain arrays: tops first, then the vertical sides. */
export interface TerrainGeometry {
  positions: Float32Array;
  normals: Float32Array;
  /** Tops: the map image's coordinates. Sides: along the wall / up the wall, in repeats of the wall texture. */
  uvs: Float32Array;
  /** Sides without a wall texture: the color of the map under the block; tops and textured sides: white. */
  colors: Float32Array;
  indices: Uint32Array;
  /** Index ranges `[start, count]` of each material. */
  groups: { top: [number, number]; side: [number, number] };
}

export interface TerrainGeometryOptions {
  /** The map image's rectangle: the tops show the part of the image under them. */
  mapArea: MapArea;
  /** Size of the wall texture (036), or null: the sides then take the map's color. */
  wallTexture: { width: number; height: number } | null;
  /** Color (0–1) of the map image at a point, for sides without a wall texture. */
  mapColor: (x: number, z: number) => [number, number, number];
}

type Vec3 = [number, number, number];

/** Width of one repeat of the wall texture along a wall (036): a whole wall is as tall as the picture. */
export const repeatWidth = (texture: { width: number; height: number }): number => (WALL_HEIGHT * texture.width) / texture.height;

/**
 * The blocks of the terrain as one mesh: the tops of each level merged into as few rectangles as possible (greedy), and
 * a vertical face wherever two neighbouring cells — or a cell and the outside of the mask — differ in height, facing the
 * lower side and merged along runs of the same pair of heights. The floor itself is not here (see `floorPlane`).
 */
export const buildTerrainGeometry = (terrain: Terrain, options: TerrainGeometryOptions): TerrainGeometry => {
  const { grid, levels } = terrain;
  const { cols, rows, originX, originY, cellWidth, cellHeight } = grid;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const xOf = (col: number) => originX + col * cellWidth;
  const zOf = (row: number) => originY + row * cellHeight;
  const levelAt = (col: number, row: number) => (col < 0 || row < 0 || col >= cols || row >= rows ? 0 : levels[row * cols + col]);

  /** A quad of four corners in order around it, wound so its front faces `normal`. */
  const quad = (corners: Vec3[], normal: Vec3, quadUvs: [number, number][], color: Vec3) => {
    const [a, b, c] = corners;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const facing = cross[0] * normal[0] + cross[1] * normal[1] + cross[2] * normal[2];
    const order = facing >= 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
    const base = positions.length / 3;
    for (const i of order) {
      positions.push(...corners[i]);
      normals.push(...normal);
      uvs.push(...quadUvs[i]);
      colors.push(...color);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // ---- Tops: greedy rectangles of one level ----
  const used = new Uint8Array(cols * rows);
  const white: Vec3 = [1, 1, 1];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const level = levels[i];
      if (level === 0 || used[i]) continue;
      let width = 1;
      while (col + width < cols && levels[i + width] === level && !used[i + width]) width++;
      let height = 1;
      grow: while (row + height < rows) {
        const start = (row + height) * cols + col;
        for (let k = 0; k < width; k++) if (levels[start + k] !== level || used[start + k]) break grow;
        height++;
      }
      for (let r = 0; r < height; r++) used.fill(1, (row + r) * cols + col, (row + r) * cols + col + width);
      const y = levelHeight(level);
      const x0 = xOf(col);
      const x1 = xOf(col + width);
      const z0 = zOf(row);
      const z1 = zOf(row + height);
      const corners: Vec3[] = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]];
      quad(corners, [0, 1, 0], corners.map(([x, , z]) => mapUv(options.mapArea, x, z)), white);
    }
  }
  const topCount = indices.length;

  // ---- Sides: one face per change of height, merged along runs ----
  const texture = options.wallTexture;
  const repeat = texture ? repeatWidth(texture) : 1;
  const sideColor = (col: number, row: number): Vec3 => (texture
    ? white
    : options.mapColor(xOf(col) + cellWidth / 2, zOf(row) + cellHeight / 2));
  const side = (corners: Vec3[], normal: Vec3, along: (c: Vec3) => number, color: Vec3) => {
    quad(corners, normal, corners.map((c) => [along(c) / repeat, c[1] / WALL_HEIGHT] as [number, number]), color);
  };

  // Faces across x (between column b − 1 and b), merged down the rows.
  for (let b = 0; b <= cols; b++) {
    let run: { start: number; lo: number; hi: number; dir: number; color: Vec3 } | null = null;
    const flush = (end: number) => {
      if (!run) return;
      const x = xOf(b);
      const lo = levelHeight(run.lo);
      const hi = levelHeight(run.hi);
      const z0 = zOf(run.start);
      const z1 = zOf(end);
      side([[x, lo, z0], [x, lo, z1], [x, hi, z1], [x, hi, z0]], [run.dir, 0, 0], (c) => c[2], run.color);
      run = null;
    };
    for (let row = 0; row < rows; row++) {
      const left = levelAt(b - 1, row);
      const right = levelAt(b, row);
      if (left === right) {
        flush(row);
        continue;
      }
      // The face looks toward the lower cell; its color is the higher block's.
      const dir = left > right ? 1 : -1;
      const lo = Math.min(left, right);
      const hi = Math.max(left, right);
      const color = sideColor(left > right ? b - 1 : b, row);
      if (run && run.lo === lo && run.hi === hi && run.dir === dir && (texture || run.color.every((v, k) => v === color[k]))) continue;
      flush(row);
      run = { start: row, lo, hi, dir, color };
    }
    flush(rows);
  }

  // Faces across z (between row b − 1 and b), merged along the columns.
  for (let b = 0; b <= rows; b++) {
    let run: { start: number; lo: number; hi: number; dir: number; color: Vec3 } | null = null;
    const flush = (end: number) => {
      if (!run) return;
      const z = zOf(b);
      const lo = levelHeight(run.lo);
      const hi = levelHeight(run.hi);
      const x0 = xOf(run.start);
      const x1 = xOf(end);
      side([[x0, lo, z], [x1, lo, z], [x1, hi, z], [x0, hi, z]], [0, 0, run.dir], (c) => c[0], run.color);
      run = null;
    };
    for (let col = 0; col < cols; col++) {
      const above = levelAt(col, b - 1);
      const below = levelAt(col, b);
      if (above === below) {
        flush(col);
        continue;
      }
      const dir = above > below ? 1 : -1;
      const lo = Math.min(above, below);
      const hi = Math.max(above, below);
      const color = sideColor(col, above > below ? b - 1 : b);
      if (run && run.lo === lo && run.hi === hi && run.dir === dir && (texture || run.color.every((v, k) => v === color[k]))) continue;
      flush(col);
      run = { start: col, lo, hi, dir, color };
    }
    flush(cols);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    groups: { top: [0, topCount], side: [topCount, indices.length - topCount] },
  };
};

/**
 * The floor: one plane at height 0 reaching `margin` past the map image on every side. Its coordinates go past 0…1 by
 * the same amount, so a texture clamped to its edge keeps the color of the image's border out there (036): no black
 * band and no seam.
 */
export const floorPlane = (area: MapArea, margin: number): { corners: [number, number][]; uvs: [number, number][] } => {
  const corners: [number, number][] = [
    [area.x - margin, area.y - margin],
    [area.x - margin, area.y + area.height + margin],
    [area.x + area.width + margin, area.y + area.height + margin],
    [area.x + area.width + margin, area.y - margin],
  ];
  return { corners, uvs: corners.map(([x, z]) => mapUv(area, x, z)) };
};
