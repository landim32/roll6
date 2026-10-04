import { footprintLocal, hexCenter, hexCorners } from './hexGrid';
import type { Point } from './hexGrid';
import { MAP_TOKEN_TYPE, POSTURE } from '../types/mapToken';
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

/** Disc colors of the piece types on the map. */
export const BASE_COLORS: Record<number, string> = {
  [MAP_TOKEN_TYPE.character]: '#0d6efd',
  [MAP_TOKEN_TYPE.npc]: '#dc3545',
};
export const OBJECT_BASE_COLOR = '#6c757d';
export const OUT_BASE_COLOR = '#808080';

/** How a piece shows in the 3D view (034). */
export interface SpriteSpec {
  mapTokenId: number;
  name: string;
  imageUrl: string | null;
  /** Standing: a figure that always faces the camera. Lying (down/out of combat): flat on the floor. */
  standing: boolean;
  /** Lying with the standing image: turned 90° on the floor (no down image). */
  sideways: boolean;
  grayscale: boolean;
  /** Width of the figure / size of the lying image (px): the width of the piece's shape on the map. */
  width: number;
  /** Depth of the shape (px), for lying pieces. */
  depth: number;
  /** Middle of the piece's shape on the map (px). */
  center: Point;
  /** Facing, for lying pieces (0–5 clockwise from the top). */
  look: number;
  baseColor: string;
  /** Radius of the disc under the figure (px). */
  baseRadius: number;
  /** Height of the figure relative to its image's natural proportion: 1 standing, less when lying (034). */
  heightRatio: number;
}

/** A lying figure is drawn this fraction of its natural height in the 3D view (034). */
export const LYING_HEIGHT_RATIO = 0.4;

/**
 * The 3D figure of a piece, with the same rules as the 2D map: lying image, black and white out of combat, disc
 * color by type, size and middle of the shape turned with the piece (shape drawn in the look-3 frame, `pieceGeometry`).
 */
export const spriteSpec = (token: MapTokenInfo, size: number): SpriteSpec => {
  const geometry = pieceGeometry(token.space, size);
  const image = pieceImage(token);
  const out = isOutOfCombat(token);
  // Middle of the shape in the piece's frame, turned like TokenLayer: (look − 3) × 60°.
  const local = { x: geometry.box.x + geometry.box.width / 2, y: geometry.box.y + geometry.box.height / 2 };
  const angle = ((token.look - 3) * Math.PI) / 3;
  const position = hexCenter(token.x, token.y, size);
  const center = {
    x: position.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
    y: position.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
  };
  return {
    mapTokenId: token.mapTokenId,
    name: token.name,
    // Standing pieces use the token's "2,5D frente" image when it has one; lying ones keep the 2D rules (034).
    imageUrl: isLying(token) ? image.url : token.frontImageUrl ?? image.url,
    standing: !isLying(token),
    sideways: image.sideways,
    grayscale: out,
    width: geometry.box.width,
    depth: geometry.box.height,
    center,
    look: token.look,
    baseColor: out ? OUT_BASE_COLOR : BASE_COLORS[token.tokenType] ?? OBJECT_BASE_COLOR,
    baseRadius: Math.min(geometry.box.width, geometry.box.height) / 2,
    heightRatio: isLying(token) ? LYING_HEIGHT_RATIO : 1,
  };
};
