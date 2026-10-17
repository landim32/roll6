import { describe, expect, it } from 'vitest';
import { buildMaskGrid, WALL_HEIGHT } from './maskGrid';
import type { MapArea, MaskGrid } from './maskGrid';
import {
  buildTerrain, buildTerrainGeometry, floorPlane, groundUnder, levelHeight, mapUv, repeatWidth, STEP_HEIGHT, TERRAIN_LEVELS,
  terrainHeightAt,
} from './terrain';
import type { Terrain, TerrainGeometry } from './terrain';

/** A mask from rows of text, 100 px per cell: '#' black, '.' white, '=' half gray, '-' light gray (a step). */
const gridFrom = (rows: string[]): MaskGrid => {
  const TONES: Record<string, number> = { '#': 0, '.': 255, '=': 128, '-': 200 };
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => {
    const value = TONES[ch] ?? 255;
    pixels.set([value, value, value, 255], (y * width + x) * 4);
  }));
  return buildMaskGrid(pixels, width, rows.length, { x: 0, y: 0, width: width * 100, height: rows.length * 100 });
};

const terrainOf = (rows: string[]): Terrain => buildTerrain(gridFrom(rows))!;
const AREA = (t: Terrain): MapArea => ({ x: 0, y: 0, width: t.grid.cols * 100, height: t.grid.rows * 100 });
const geometryOf = (t: Terrain, wallTexture: { width: number; height: number } | null = null): TerrainGeometry =>
  buildTerrainGeometry(t, { mapArea: AREA(t), wallTexture, mapColor: () => [0.5, 0.25, 0.125] });

const triangles = ([, count]: [number, number]) => count / 3;
/** Area of the top quads (each quad = 2 triangles = 4 vertices, in order). */
const topArea = (g: TerrainGeometry): number => {
  let area = 0;
  for (let q = 0; q < g.groups.top[1] / 6; q++) {
    const v = q * 4 * 3;
    const xs = [0, 1, 2, 3].map((k) => g.positions[v + k * 3]);
    const zs = [0, 1, 2, 3].map((k) => g.positions[v + k * 3 + 2]);
    area += (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
  }
  return area;
};

describe('terrain levels', () => {
  it('rounds the tones to levels: an old black and white mask has only the floor and full walls', () => {
    const t = terrainOf(['#.', '.#']);
    expect([...t.levels]).toEqual([TERRAIN_LEVELS - 1, 0, 0, TERRAIN_LEVELS - 1]);
    expect(levelHeight(TERRAIN_LEVELS - 1)).toBe(WALL_HEIGHT);
  });

  it('puts a half gray in the middle and a light gray under the step', () => {
    const t = terrainOf(['=-']);
    expect(levelHeight(t.levels[0]) / WALL_HEIGHT).toBeCloseTo(0.5, 1);
    expect(levelHeight(t.levels[1])).toBeGreaterThan(0);
    expect(levelHeight(t.levels[1])).toBeLessThanOrEqual(STEP_HEIGHT);
  });

  it('no mask is a flat floor', () => {
    expect(buildTerrain(null)).toBeNull();
    expect(terrainHeightAt(null, 10, 10)).toBe(0);
    expect(groundUnder(null, 10, 10, 5)).toBe(0);
  });

  it('reads the height under a point, 0 outside the mask', () => {
    const t = terrainOf(['#.']);
    expect(terrainHeightAt(t, 50, 50)).toBe(WALL_HEIGHT);
    expect(terrainHeightAt(t, 150, 50)).toBe(0);
    expect(terrainHeightAt(t, -10, 50)).toBe(0);
  });

  it('stands feet at the edge of a block on the block', () => {
    const t = terrainOf(['-.']);
    const top = terrainHeightAt(t, 50, 50);
    expect(terrainHeightAt(t, 105, 50)).toBe(0);
    expect(groundUnder(t, 105, 50, 10)).toBe(top);
  });
});

describe('terrain geometry', () => {
  it('makes one top and four sides for a lone block', () => {
    const g = geometryOf(terrainOf(['...', '.#.', '...']));
    expect(triangles(g.groups.top)).toBe(2);
    expect(triangles(g.groups.side)).toBe(8);
    expect(g.indices.length).toBe(g.groups.top[1] + g.groups.side[1]);
  });

  it('merges neighbours of the same level into one top and one face per side', () => {
    const g = geometryOf(terrainOf(['##', '##']));
    expect(triangles(g.groups.top)).toBe(2);
    expect(triangles(g.groups.side)).toBe(8);
  });

  it('covers exactly the raised cells with tops that never overlap', () => {
    const t = terrainOf(['#=#.', '==-.', '#.#-']);
    const raised = [...t.levels].filter((l) => l > 0).length;
    expect(topArea(geometryOf(t))).toBe(raised * 100 * 100);
  });

  it('raises a face as tall as the step between two levels', () => {
    const t = terrainOf(['.=#']);
    const g = geometryOf(t);
    const heights: number[] = [];
    for (let q = 0; q < g.groups.side[1] / 6; q++) {
      const v = (g.groups.side[0] / 6 + q) * 4 * 3;
      const ys = [0, 1, 2, 3].map((k) => g.positions[v + k * 3 + 1]);
      heights.push(Math.round(Math.max(...ys) - Math.min(...ys)));
    }
    const half = Math.round(levelHeight(t.levels[1]));
    expect(heights).toContain(half); // floor → half block
    expect(heights).toContain(Math.round(WALL_HEIGHT - half)); // half block → wall
    expect(heights).toContain(Math.round(WALL_HEIGHT)); // wall → outside
  });

  it('gives an old black and white mask only faces of full height', () => {
    const g = geometryOf(terrainOf(['#.#', '...', '.##']));
    for (let v = g.groups.side[0] / 6 * 4; v < g.positions.length / 3; v += 4) {
      const ys = [0, 1, 2, 3].map((k) => g.positions[(v + k) * 3 + 1]);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(WALL_HEIGHT);
    }
  });

  it('points every face up or toward the lower side, wound to match', () => {
    const g = geometryOf(terrainOf(['.#', '..']));
    for (let tri = 0; tri < g.indices.length; tri += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => g.indices[tri + k] * 3);
      const p = (i: number) => [g.positions[i], g.positions[i + 1], g.positions[i + 2]];
      const [pa, pb, pc] = [p(a), p(b), p(c)];
      const ab = pb.map((v, k) => v - pa[k]);
      const ac = pc.map((v, k) => v - pa[k]);
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const n = [g.normals[a], g.normals[a + 1], g.normals[a + 2]];
      expect(cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2]).toBeGreaterThan(0);
    }
  });

  it('shows on a top the part of the map image under it', () => {
    const t = terrainOf(['.#']);
    const g = geometryOf(t);
    for (let v = 0; v < 4; v++) {
      const [u, w] = mapUv(AREA(t), g.positions[v * 3], g.positions[v * 3 + 2]);
      expect(g.uvs[v * 2]).toBeCloseTo(u);
      expect(g.uvs[v * 2 + 1]).toBeCloseTo(w);
    }
    expect(mapUv(AREA(t), 0, 0)).toEqual([0, 1]);
  });

  it('lays the wall texture by repeats along and up the wall, and colors untextured sides with the map', () => {
    const t = terrainOf(['#']);
    const textured = geometryOf(t, { width: 240, height: 120 });
    const sideStart = textured.groups.top[1] / 6 * 4;
    const vs = [...Array(4).keys()].map((k) => textured.uvs[(sideStart + k) * 2 + 1]);
    expect(Math.max(...vs)).toBeCloseTo(1); // a whole wall is as tall as the picture
    expect(repeatWidth({ width: 240, height: 120 })).toBe(2 * WALL_HEIGHT);
    const plain = geometryOf(t);
    expect([...plain.colors.slice(sideStart * 3, sideStart * 3 + 3)]).toEqual([0.5, 0.25, 0.125]);
  });
});

describe('floorPlane', () => {
  it('reaches past the map with coordinates past 0…1, so the edge color goes on', () => {
    const { corners, uvs } = floorPlane({ x: 0, y: 0, width: 100, height: 200 }, 50);
    expect(corners[0]).toEqual([-50, -50]);
    expect(uvs[0][0]).toBeCloseTo(-0.5);
    expect(uvs[0][1]).toBeCloseTo(1.25);
    expect(uvs[2][0]).toBeCloseTo(1.5);
  });
});
