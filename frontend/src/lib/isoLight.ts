import { HEX_SIZE } from './hexGrid';

/**
 * The light of the isometric view (103): one circle on the floor around the middle of the view (105), as if a lamp shone
 * from above. Inside it everything is lit, past its edge everything goes dark, with a soft edge between. The radius is
 * fixed at 6 hexes (105: no longer chosen by the viewer). Pure — the shader of `components/iso/isoLightMaterial.ts` uses
 * the same formula (keep them together).
 */

/** Radius of the circle, in hexes. */
export const LIGHT_RADIUS = 6;

/** Distance between the centers of two neighboring flat-top hexes of `size` (Red Blob Games: √3 × size). */
export const hexStep = (size: number = HEX_SIZE): number => Math.sqrt(3) * size;

/** Radius of the circle in map pixels: `hexes` steps between hex centers, measured in a straight line. */
export const lightRadiusPx = (hexes: number = LIGHT_RADIUS, size: number = HEX_SIZE): number => hexes * hexStep(size);

/** Width of the soft edge, inside the radius (map pixels): about 0.4 hex. */
export const LIGHT_FEATHER_PX = 0.4 * hexStep();

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** How lit a point at `dist` px from the center is: 1 inside, 0 past the radius (px), smooth across the edge. */
export const lightFactor = (dist: number, radius: number = lightRadiusPx(), feather: number = LIGHT_FEATHER_PX): number =>
  1 - smoothstep(radius - feather, radius, dist);

/** Whether a point of a piece at `dist` px is drawn: pieces are cut at the radius (px), the part outside is not shown. */
export const isLit = (dist: number, radius: number = lightRadiusPx()): boolean => dist <= radius;
