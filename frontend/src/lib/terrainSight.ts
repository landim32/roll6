import { terrainHeightAt } from './terrain';
import type { Terrain } from './terrain';

/** A point of the 3D scene: map x, height y, map y as z. */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** Room kept between the camera and the ground or a block's top (world units). */
export const CLEARANCE = 2;

/**
 * The first point of the segment `from` → `to` that is inside the terrain — under a block's top or under the floor (with
 * `clearance`) — as a fraction 0–1 of the way, or null when the whole segment is clear (081). The camera uses it to stop
 * in front of a block instead of going through it, and the balloons to know whether a head is behind one. It samples at
 * half a cell, so no block is skipped.
 */
export const firstHit = (terrain: Terrain | null, from: Point3, to: Point3, clearance = CLEARANCE): number | null => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const cell = terrain ? Math.min(terrain.grid.cellWidth, terrain.grid.cellHeight) / 2 : 8;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / cell));
  const inside = (t: number) => from.y + dy * t < terrainHeightAt(terrain, from.x + dx * t, from.z + dz * t) + clearance;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!inside(t)) continue;
    // The sample is inside: narrow it down to the face, so whoever stops before it never stops past it.
    let clear = (i - 1) / steps;
    let hit = t;
    for (let k = 0; k < 10; k++) {
      const middle = (clear + hit) / 2;
      if (inside(middle)) hit = middle;
      else clear = middle;
    }
    return hit;
  }
  return null;
};

/** True when nothing of the terrain stands between the two points. */
export const canSee = (terrain: Terrain | null, from: Point3, to: Point3): boolean => firstHit(terrain, from, to, 0) === null;
