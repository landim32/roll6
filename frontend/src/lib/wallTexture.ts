import { EYE_HEIGHT, WALL_HEIGHT } from './raycaster';
import type { RayHit } from './raycaster';

/**
 * The wall texture of the 3D view (036): one picture that covers every wall the mask draws. Pure helpers — which column
 * of the picture a point of a wall shows and which row a screen row shows — so the frame painter stays small and the
 * mapping is tested without pixels.
 *
 * The picture is laid on the wall at its own proportions: its full height is the height of a whole wall (so a low wall
 * shows its lower part, as if cut from a tall one) and it repeats along the wall every `repeatWidth` units.
 */

/** A picture's size. */
export interface TextureSize {
  width: number;
  height: number;
}

/** How long (world units) one copy of the picture is along a wall: as wide as it is tall at its own proportions. */
export const repeatWidth = (texture: TextureSize): number => (WALL_HEIGHT * texture.width) / texture.height;

/**
 * Where along the picture a ray struck the wall, in copies (the fraction is the column): a face looking east or west is
 * a line of constant x, so the position along it is y; one looking north or south, x.
 */
export const textureOffset = (hit: Pick<RayHit, 'x' | 'y' | 'side'>, texture: TextureSize): number =>
  (hit.side === 'ew' ? hit.y : hit.x) / repeatWidth(texture);

/** Column of the picture (0 … width − 1) for an offset in copies: the fraction, so it repeats in both directions. */
export const textureColumn = (offset: number, width: number): number => {
  const fraction = offset - Math.floor(offset);
  return Math.min(width - 1, Math.floor(fraction * width));
};

/**
 * Height above the floor (world units) at screen row `row` of a wall at `perpendicular` distance, with the horizon in the
 * middle of a frame `frameHeight` tall: the row is `EYE_HEIGHT` above the floor at the horizon and goes down from there.
 */
export const heightAtRow = (row: number, frameHeight: number, perpendicular: number, projection: number): number =>
  EYE_HEIGHT - ((row + 0.5 - frameHeight / 2) * perpendicular) / projection;

/** Row of the picture (0 … height − 1) for a height above the floor: the picture's top is a whole wall's top. */
export const textureRow = (heightAboveFloor: number, height: number): number => {
  const v = 1 - heightAboveFloor / WALL_HEIGHT;
  return Math.min(height - 1, Math.max(0, Math.floor(v * height)));
};
