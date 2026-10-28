import type { Point } from './hexGrid';

/**
 * The trails of the isometric view (103): the dashed line of the 2D map's `TurnTrailLayer`, cut into dashes along the
 * path through the hex centers so it can be laid on the floor as flat strips (WebGL lines are one pixel wide). Pure.
 */

/** Dash and gap along the trail (map px): the 2D map's 8 on / 6 off, at the scale of the floor. */
export const TRAIL_DASH = 16;
export const TRAIL_GAP = 12;

/** The dashes of a polyline, each `[start, end]`; the pattern carries on across its corners. */
export const dashSegments = (points: readonly Point[], dash: number = TRAIL_DASH, gap: number = TRAIL_GAP): [Point, Point][] => {
  const dashes: [Point, Point][] = [];
  const period = dash + gap;
  let travelled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    const at = (t: number): Point => ({ x: a.x + ((b.x - a.x) * t) / length, y: a.y + ((b.y - a.y) * t) / length });
    let t = 0;
    while (t < length) {
      const phase = (travelled + t) % period;
      if (phase < dash) {
        const end = Math.min(length, t + (dash - phase));
        dashes.push([at(t), at(end)]);
        t = end;
      } else {
        t = Math.min(length, t + (period - phase));
      }
    }
    travelled += length;
  }
  return dashes;
};
