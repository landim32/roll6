import { HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import type { MapTokenInfo } from '../types/mapToken';
import { MAP_TOKEN_TYPE, POSTURE } from '../types/mapToken';

/**
 * The pieces of the isometric view as tabletop miniatures (104): a token with a 3D model or a "2,5D" figure stands on a
 * thin round base; when the piece is down or out of combat the whole miniature — figure and base — tips over backwards
 * (its top toward the piece's back), like a miniature knocked over on the table, and out of combat it is also drawn in
 * black and white (the 2D map's convention). Objects have no posture and always stand. Pure: `components/iso/isoPieces`
 * builds the scene from these rules.
 */

/** Share of the circle as large as the piece's shape that the base covers (the colored hexes still show around it). */
export const BASE_SHARE = 0.85;
/** Thickness of the base (map px; a hex is 40 from middle to corner). */
export const BASE_HEIGHT = 4;

export interface MiniatureState {
  /** Down or out of combat: the miniature lies tipped over. */
  tipped: boolean;
  /** Out of combat: the miniature is drawn without color. */
  gray: boolean;
}

export interface MiniatureBase {
  radius: number;
  height: number;
}

export interface TipPose {
  /** Point of the floor the miniature turns about: the back edge of its base. */
  pivot: Point;
  /** Horizontal axis of the turn, on the scene's x and z. */
  axis: { x: number; z: number };
  /** Turn about `axis` (radians, right-handed) that takes the top of the miniature to its back. */
  angle: number;
}

export const miniatureState = (token: Pick<MapTokenInfo, 'posture' | 'tokenType'>): MiniatureState => {
  if (token.tokenType === MAP_TOKEN_TYPE.object) return { tipped: false, gray: false };
  const gray = token.posture === POSTURE.outOfCombat;
  return { tipped: gray || token.posture === POSTURE.down, gray };
};

/** Area of one flat-top hex of `HEX_SIZE` (middle to corner). */
const HEX_AREA = ((3 * Math.sqrt(3)) / 2) * HEX_SIZE * HEX_SIZE;

/**
 * The base by the piece's size in hexes: a share of the circle with the area of its `space` hexes, so it grows with every
 * size (the 2- and 3-hex shapes are rows, where the circle inside the shape would not); one hex's base stays inside the
 * hex. The size of the token's model never changes it.
 */
export const miniatureBase = (space: number): MiniatureBase => ({
  radius: BASE_SHARE * Math.sqrt((Math.max(1, space) * HEX_AREA) / Math.PI),
  height: BASE_HEIGHT,
});

/**
 * How the miniature on `center`, facing `yaw` (look × 60°, 0 = the top of the map, clockwise), tips over backwards. The
 * front on the floor is f = (sin yaw, −cos yaw) (the map's y is the scene's z); the miniature turns about the back edge
 * of its base, on an axis across f, a quarter turn that takes +Y to −f.
 */
export const tipPose = (center: Point, yaw: number, base: MiniatureBase): TipPose => {
  const front = { x: Math.sin(yaw), z: -Math.cos(yaw) };
  return {
    pivot: { x: center.x - front.x * base.radius, y: center.y - front.z * base.radius },
    axis: { x: Math.cos(yaw), z: Math.sin(yaw) },
    angle: Math.PI / 2,
  };
};

