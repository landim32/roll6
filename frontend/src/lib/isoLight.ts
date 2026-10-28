import { HEX_SIZE } from './hexGrid';

/**
 * The light of the isometric view (103): one circle on the floor around the focused character, as if a lamp shone from
 * above. Inside it everything is lit, past its edge everything goes dark, with a soft edge between. The viewer picks the
 * radius (3–6 hexes, 5 by default), remembered on this device only (localStorage `roll6:iso-radius`, cleared on logout;
 * every access guarded). Pure — the shader of `components/iso/isoLightMaterial.ts` uses the same formula (keep them
 * together).
 */

export const LIGHT_RADIUS_MIN = 3;
export const LIGHT_RADIUS_MAX = 6;
/** "inicialmente 5 hexágonos". */
export const LIGHT_RADIUS_DEFAULT = 5;
/** The radii offered, smallest first. */
export const LIGHT_RADII: readonly number[] = Array.from(
  { length: LIGHT_RADIUS_MAX - LIGHT_RADIUS_MIN + 1 },
  (_, i) => LIGHT_RADIUS_MIN + i,
);

export const LIGHT_RADIUS_STORAGE_KEY = 'roll6:iso-radius';

/** A whole number of hexes between the limits; anything else is the default. */
export const clampRadius = (hexes: unknown): number => {
  const value = typeof hexes === 'string' ? Number(hexes) : hexes;
  return typeof value === 'number' && Number.isInteger(value) && value >= LIGHT_RADIUS_MIN && value <= LIGHT_RADIUS_MAX
    ? value
    : LIGHT_RADIUS_DEFAULT;
};

export const readLightRadius = (): number => {
  try {
    return clampRadius(localStorage.getItem(LIGHT_RADIUS_STORAGE_KEY));
  } catch {
    return LIGHT_RADIUS_DEFAULT;
  }
};

export const writeLightRadius = (hexes: number): void => {
  try {
    localStorage.setItem(LIGHT_RADIUS_STORAGE_KEY, String(clampRadius(hexes)));
  } catch {
    // Storage unavailable: the radius lasts this session only.
  }
};

export const clearLightRadius = (): void => {
  try {
    localStorage.removeItem(LIGHT_RADIUS_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};

/** Distance between the centers of two neighboring flat-top hexes of `size` (Red Blob Games: √3 × size). */
export const hexStep = (size: number = HEX_SIZE): number => Math.sqrt(3) * size;

/** Radius of the circle in map pixels: `hexes` steps between hex centers, measured in a straight line. */
export const lightRadiusPx = (hexes: number = LIGHT_RADIUS_DEFAULT, size: number = HEX_SIZE): number => hexes * hexStep(size);

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
