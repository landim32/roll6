import { footprintLocal, hexCorners } from './hexGrid';
import type { Point } from './hexGrid';
import { POSTURE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';

/** How a piece is drawn (031), shared by the map (`TokenLayer`) and the shared snapshot (`mapSnapshot`). */

/** Down or out of combat: the piece is drawn lying. */
export const isLying = (token: Pick<MapTokenInfo, 'posture'>): boolean =>
  token.posture === POSTURE.down || token.posture === POSTURE.outOfCombat;

/** Out of combat: the whole piece (image and disc) in black and white. */
export const isOutOfCombat = (token: Pick<MapTokenInfo, 'posture'>): boolean => token.posture === POSTURE.outOfCombat;

/**
 * Image of the piece and whether it must be turned on its side: lying pieces use the token's down image, or the
 * standing one turned 90° when the token has none.
 */
export const pieceImage = (
  token: Pick<MapTokenInfo, 'posture' | 'upImageUrl' | 'downImageUrl'>,
): { url: string | null; sideways: boolean } => {
  if (!isLying(token)) return { url: token.upImageUrl, sideways: false };
  if (token.downImageUrl) return { url: token.downImageUrl, sideways: false };
  return { url: token.upImageUrl, sideways: true };
};

/** Drawing of a piece of several hexes around its position, in the piece's own (look 3) frame, in px (031). */
export interface PieceGeometry {
  /** Centers of the shape's hexes. */
  centers: Point[];
  /** Every hex of the shape (fill and clip). */
  fillPath: string;
  /** Only the outer edges of the shape (shared edges between its hexes are left out). */
  edgePath: string;
  /** Rectangle around the shape: the image covers it. */
  box: { x: number; y: number; width: number; height: number };
  /** Middle of the front edge (the facing mark). */
  front: Point;
}

const fixed = (value: number): string => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);

/**
 * Geometry of the shape of `space` hexes drawn around (0, 0), before the piece's group turns it by (look − 3) × 60°:
 * token images look down, so the shape is the look-3 one (`footprintLocal`) and the front is the bottom.
 */
export const pieceGeometry = (space: number, size: number): PieceGeometry => {
  const centers = footprintLocal(space, size);
  const hexes = centers.map((center) => hexCorners(center, size));
  const fillPath = hexes.map((corners) => `M${corners.map((c) => `${fixed(c.x)},${fixed(c.y)}`).join('L')}Z`).join('');
  const edges = new Map<string, { a: Point; b: Point; count: number }>();
  for (const corners of hexes) {
    corners.forEach((a, i) => {
      const b = corners[(i + 1) % 6];
      const ends = [`${fixed(a.x)},${fixed(a.y)}`, `${fixed(b.x)},${fixed(b.y)}`].sort();
      const id = ends.join('|');
      const edge = edges.get(id);
      if (edge) edge.count += 1;
      else edges.set(id, { a, b, count: 1 });
    });
  }
  const edgePath = [...edges.values()]
    .filter((e) => e.count === 1)
    .map((e) => `M${fixed(e.a.x)},${fixed(e.a.y)}L${fixed(e.b.x)},${fixed(e.b.y)}`)
    .join('');
  const all = hexes.flat();
  const minX = Math.min(...all.map((c) => c.x));
  const maxX = Math.max(...all.map((c) => c.x));
  const minY = Math.min(...all.map((c) => c.y));
  const maxY = Math.max(...all.map((c) => c.y));
  const frontCenter = centers
    .filter((c) => Math.abs(c.x) < 0.01)
    .reduce((best, c) => (c.y > best.y ? c : best), { x: 0, y: 0 });
  return {
    centers,
    fillPath,
    edgePath,
    box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    front: { x: 0, y: frontCenter.y + (Math.sqrt(3) / 2) * size },
  };
};
