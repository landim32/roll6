/**
 * Framing of the photo of a 3D model's pose (057, Q1 = A): the camera looks straight down at the model, like the 2D map
 * is seen, with "up" toward −Z so the model's front (+Z, the glTF convention) is at the bottom of the picture — the
 * direction every token picture faces (the map turns pieces by `(look − 3) × 60°`, look 3 = down). The picture has the
 * size of the token image it fills (`tokenImageSize`), and the model, as posed, is centered and as large as fits inside
 * a small margin. Pure: `components/tokens/poseShot` turns it into an orthographic camera.
 */

/** Share of the picture left empty on each side around the model. */
export const SHOT_MARGIN = 0.04;

/** The camera's "up" for the photo: −Z, so the model's front is at the bottom of the picture. */
export const SHOT_UP = [0, 0, -1] as const;

/** Smallest world size a footprint is given, so a flat or empty model still frames. */
const MIN_EXTENT = 1e-3;

export interface ShotBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ShotFraming {
  /** Middle of the model seen from above, in world units. */
  centerX: number;
  centerZ: number;
  /** Half of the world area the picture shows, across (X) and along (Z); their ratio is the picture's. */
  halfWidth: number;
  halfHeight: number;
}

/**
 * The world area the picture shows: centered on the model's footprint seen from above, with the picture's proportion,
 * the smallest one in which the footprint takes `1 − 2 × margin` of the limiting side.
 */
export const shotFraming = (bounds: ShotBounds, size: { width: number; height: number }, margin = SHOT_MARGIN): ShotFraming => {
  const across = Math.max(MIN_EXTENT, bounds.maxX - bounds.minX);
  const along = Math.max(MIN_EXTENT, bounds.maxZ - bounds.minZ);
  const aspect = size.width / size.height;
  const fill = 1 - 2 * margin;
  // World width the picture must show for the footprint to fit both ways.
  const width = Math.max(across, along * aspect) / fill;
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    halfWidth: width / 2,
    halfHeight: width / aspect / 2,
  };
};
