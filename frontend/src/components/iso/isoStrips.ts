import { BufferAttribute, BufferGeometry } from 'three';
import type { Point } from '../../lib/hexGrid';

/**
 * Flat strips on the floor of the isometric view (103): WebGL lines are one pixel wide, so the outlines of the pieces'
 * hexes and the dashes of the trails are thin rectangles lying at height `y` (map px: x = map x, z = map y).
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
