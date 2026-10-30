import { BufferAttribute, BufferGeometry } from 'three';
import { hexCenter, hexCorners, HEX_SIZE } from '../../lib/hexGrid';
import type { Offset, Point } from '../../lib/hexGrid';

/**
 * Flat strips on the floor of the isometric view (103): WebGL lines are one pixel wide, so the outlines of the pieces'
 * hexes, the highlights and the dashes of the trails are thin rectangles lying at height `y` (map px: x = map x, z =
 * map y).
 */
export const stripGeometry = (segments: readonly [Point, Point][], width: number, y: number): BufferGeometry => {
  const positions: number[] = [];
  const half = width / 2;
  for (const [a, b] of segments) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    // The side of the strip, perpendicular to the segment.
    const nx = (-(b.y - a.y) / length) * half;
    const ny = ((b.x - a.x) / length) * half;
    const corners = [
      [a.x + nx, a.y + ny], [a.x - nx, a.y - ny], [b.x - nx, b.y - ny],
      [a.x + nx, a.y + ny], [b.x - nx, b.y - ny], [b.x + nx, b.y + ny],
    ];
    for (const [x, z] of corners) positions.push(x, y, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
};

/** Hexes of a shape (centers and corners) and its outer edges (an edge shared by two of its hexes is inside). */
export const hexShape = (offsets: readonly Offset[]) => {
  const hexes = offsets.map(({ x, y }) => {
    const center = hexCenter(x, y, HEX_SIZE);
    return { center, corners: hexCorners(center, HEX_SIZE) };
  });
  const key = (a: Point, b: Point) => {
    const p = `${Math.round(a.x * 10)},${Math.round(a.y * 10)}`;
    const q = `${Math.round(b.x * 10)},${Math.round(b.y * 10)}`;
    return p < q ? `${p}|${q}` : `${q}|${p}`;
  };
  const edges = new Map<string, { segment: [Point, Point]; count: number }>();
  for (const { corners } of hexes) {
    corners.forEach((a, i) => {
      const b = corners[(i + 1) % 6];
      const k = key(a, b);
      const found = edges.get(k);
      if (found) found.count += 1;
      else edges.set(k, { segment: [a, b], count: 1 });
    });
  }
  return { hexes, outline: [...edges.values()].filter((e) => e.count === 1).map((e) => e.segment) };
};

/** Filled hexes on the floor: a fan of six triangles per hex, around its center. */
export const hexFillGeometry = (hexes: readonly { center: Point; corners: Point[] }[], y: number): BufferGeometry => {
  const positions: number[] = [];
  for (const { center, corners } of hexes) {
    corners.forEach((a, i) => {
      const b = corners[(i + 1) % corners.length];
      positions.push(center.x, y, center.y, b.x, y, b.y, a.x, y, a.y);
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
};
