import { HEX_SIZE } from './hexGrid';
import type { Point } from './hexGrid';
import type { MapTokenInfo } from '../types/mapToken';
import { MAP_TOKEN_TYPE, POSTURE } from '../types/mapToken';

/**
 * The pieces of the isometric view as tabletop miniatures (104): a token with a 3D model or a "2,5D" figure stands on a
 * round base of one color; when the piece is down or out of combat the whole miniature — figure and base — lies knocked
 * over backwards on the table, resting on the edge of its base and on its head (nothing floats), along the piece's down
 * shape, and out of combat it is also drawn in black and white (the 2D map's convention). Objects have no posture and
 * always stand. Pure: `components/iso/isoPieces` builds the scene from these rules.
 */

/** Share of the circle as large as the piece's shape that the base covers (the colored hexes still show around it). */
export const BASE_SHARE = 0.85;
/** Thickness of the base (map px; a hex is 40 from middle to corner). */
export const BASE_HEIGHT = 10;

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
  /** Where the middle of the bottom of the base goes: on the floor (x, z = the map's y) and its height `y`. */
  origin: { x: number; y: number; z: number };
  /** Horizontal axis of the turn, on the scene's x and z. */
  axis: { x: number; z: number };
  /** Turn about `axis` (radians, right-handed) that takes the top of the miniature to its back. */
  angle: number;
  /** Height of the highest point of the miniature as it lies. */
  top: number;
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
 * How the miniature of a figure `height` tall (over the base) lies knocked over backwards, its middle on `center` (the
 * middle of the piece's down shape), facing `yaw` (look × 60°, 0 = the top of the map, clockwise). The front on the floor
 * is f = (sin yaw, −cos yaw) (the map's y is the scene's z) and the miniature falls toward u = −f. In the plane (u, up)
 * it is the base [−r, r] × [0, h] with the figure up its middle to h + H; it rests on the side of its outline toward u,
 * from the base's top edge (r, h) to the head (0, h + H): a turn of θ = π − atan(H / r) about the axis across f, a bit
 * past a quarter turn, then lifted so both touch the floor and slid along u so it lies over the middle of the shape.
 */
export const tipPose = (center: Point, yaw: number, base: MiniatureBase, height: number): TipPose => {
  const { radius: r, height: h } = base;
  const tall = Math.max(0, height);
  const angle = Math.PI - Math.atan2(tall, r);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // The outline in the plane (u, up), turned: u' = a cos θ + b sin θ, up' = −a sin θ + b cos θ.
  const turned = [[-r, 0], [r, 0], [-r, h], [r, h], [0, h + tall]].map(([a, b]) => ({ u: a * cos + b * sin, up: -a * sin + b * cos }));
  const low = Math.min(...turned.map((p) => p.up));
  const high = Math.max(...turned.map((p) => p.up));
  const shift = -(Math.min(...turned.map((p) => p.u)) + Math.max(...turned.map((p) => p.u))) / 2;
  const back = { x: -Math.sin(yaw), z: Math.cos(yaw) };
  return {
    origin: { x: center.x + back.x * shift, y: -low, z: center.y + back.z * shift },
    axis: { x: Math.cos(yaw), z: Math.sin(yaw) },
    angle,
    top: high - low,
  };
};
