import { footprintLocal, hexCenter, hexCorners, pixelToHex } from './hexGrid';
import type { Point } from './hexGrid';
import { tokenSpriteUrls } from './spriteView';
import { modelScaleFactor } from './modelScale';
import { isAllyPiece } from './npcCategory';
import type { ModelClipChoices } from './modelAnimations';
import type { ViewImages } from './spriteView';
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
/** Pieces of ally NPCs (071): teal, apart from the red NPCs, the blue characters and the brand green. */
export const ALLY_BASE_COLOR = '#20c997';

/** The piece's own color: an ally NPC is teal, every other piece by its type. */
export const baseColorOf = (token: { tokenType: number; npcCategory?: number | null }): string =>
  isAllyPiece(token) ? ALLY_BASE_COLOR : BASE_COLORS[token.tokenType] ?? OBJECT_BASE_COLOR;

/**
 * Whether a piece is drawn in the 3D view (034): only the ones standing (objects have no posture and always stand) and
 * whose token has the "2,5D" front image (036) — a token without it has no figure to draw, so it is left out, and so is
 * its speech balloon. The other three sides are optional: with the front alone the figure still shows from every side.
 * A piece that is down or out of combat is lying, and the 3D view only draws figures standing up, so it is left out
 * too (the 2D map still shows it lying). The camera can still follow its character.
 */
export const isShownIn3d = (token: Pick<MapTokenInfo, 'posture' | 'frontImageUrl' | 'modelFileUrl'>): boolean =>
  !isLying(token) && (!!token.frontImageUrl || !!token.modelFileUrl);

/**
 * Whether the 3D view draws the piece's 3D model (058): any piece whose token has one, standing or not — a piece that is
 * down or out of combat lies at the last frame of its death animation. Figures, their proxies and the balloons keep
 * `isShownIn3d`, so a piece lying down still has none of them.
 */
export const isModelShownIn3d = (token: Pick<MapTokenInfo, 'modelFileUrl'>): boolean => !!token.modelFileUrl;

/** How a piece shows in the 3D view (035): a standing figure that draws the side the camera sees. */
export interface SpriteSpec {
  mapTokenId: number;
  name: string;
  /** The token's four "2,5D" images, one per side; null where the token has none. */
  views: ViewImages<string>;
  /** What the 3D view uses when a side has no image: the token's standing image. */
  fallbackUrl: string | null;
  /** Hex side the piece faces (0–5): with the camera position it says which side shows. */
  look: number;
  /** Width of the figure (px): the width of the piece's shape on the map. */
  width: number;
  /** Middle of the piece's shape on the map (px), where the figure stands — or where a 3D walk left it (070). */
  center: Point;
  /** Exact direction it faces (radians, 0 = up, clockwise): the walk's, else the `look`'s. */
  yaw: number;
  /** Color of the placeholder shown when the piece has no image. */
  baseColor: string;
  /** The token's 3D model (055), drawn instead of the figure once it is loaded; null when it has none. */
  modelUrl: string | null;
  /** The animation chosen for each state of that model (056; null = automatic). */
  modelClips: ModelClipChoices;
  /** Size of that model (063) as a factor of its automatic height; 1 = as before. */
  modelScale: number;
}

/**
 * The 3D figure of a standing piece: its four side images and the standing one as the reserve, as wide as the shape of
 * the piece, standing in the middle of that shape (drawn in the look-3 frame, `pieceGeometry`, and turned with the
 * piece) and facing the piece's `look` — which side of them the camera sees is decided per frame by the renderer.
 * Callers check `isShownIn3d` first.
 */
/**
 * Where a 3D walk left a standing piece (070): the exact point inside its hex and the exact direction, kept by the server
 * so the figure is not pulled to the middle of the hex. Null when the piece has none, is lying or the point no longer
 * falls in its hex (any other move clears it on the server).
 */
export const walkPose = (
  token: Pick<MapTokenInfo, 'x' | 'y' | 'posture' | 'walkX' | 'walkY' | 'walkYaw'>,
  size: number,
): { center: Point; yaw: number } | null => {
  const { walkX, walkY, walkYaw } = token;
  if (walkX == null || walkY == null || walkYaw == null) return null;
  if (token.posture !== POSTURE.standing) return null;
  const hex = pixelToHex({ x: walkX, y: walkY }, size);
  if (hex.x !== token.x || hex.y !== token.y) return null;
  return { center: { x: walkX, y: walkY }, yaw: walkYaw };
};

export const spriteSpec = (token: MapTokenInfo, size: number): SpriteSpec => {
  const walked = walkPose(token, size);
  const geometry = pieceGeometry(token.space, size);
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
    views: tokenSpriteUrls(token),
    fallbackUrl: token.upImageUrl,
    look: token.look,
    width: geometry.box.width,
    center: walked?.center ?? center,
    yaw: walked?.yaw ?? (((token.look % 6) + 6) % 6) * (Math.PI / 3),
    baseColor: baseColorOf(token),
    modelUrl: token.modelFileUrl ?? null,
    modelClips: { idle: token.modelIdleClip ?? null, walk: token.modelWalkClip ?? null, down: token.modelDownClip ?? null },
    modelScale: modelScaleFactor(token.modelScale),
  };
};
