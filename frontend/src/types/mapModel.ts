/** Map model types — the library map (image, image layout, grid size and the 3D view images, 034). */

/** Map model as returned by the API. */
export interface MapModelInfo {
  mapModelId: number;
  /** Owner user id. */
  userId: number;
  name: string;
  description: string | null;
  /** Stored image file name ({guid}.{ext}). */
  image: string | null;
  /** Temporary URL of the image. */
  imageUrl: string | null;
  /** Grid columns (flat-top hexes). */
  gridWidth: number;
  /** Grid rows. */
  gridHeight: number;
  /** Display width of the image (px); null = original size. */
  imageWidth: number | null;
  imageHeight: number | null;
  /** Crop offset in px of the resized image. */
  imageTop: number;
  imageLeft: number;
  /** Hex size computed by the server (null without display size). */
  hexSize: number | null;
  /** 3D mask (034): black = wall, white = empty; same proportion as the map image. */
  maskImage: string | null;
  maskImageUrl: string | null;
  /** Background of the 3D view: a 360° panorama shown where no wall stands in front. */
  backgroundImage: string | null;
  backgroundImageUrl: string | null;
  createdAt: string;
  changedAt: string;
}

/** Data to create or replace a map model (PUT replaces every field). */
export interface MapModelInsertInfo {
  name: string;
  description: string | null;
  image: string | null;
  gridWidth: number;
  gridHeight: number;
  imageWidth: number | null;
  imageHeight: number | null;
  imageTop: number;
  imageLeft: number;
  maskImage: string | null;
  backgroundImage: string | null;
}
