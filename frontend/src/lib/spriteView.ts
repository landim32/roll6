import { lookToYaw } from './storyCamera';
import type { Point } from './hexGrid';
import type { TokenInfo } from '../types/token';

/**
 * The four "2,5D" images a token may have (035) and which one the 3D view draws: the side the camera sees,
 * measured against the direction the piece faces. Pure (no DOM), so the sectors and the fallback are unit-tested.
 */

/** The four sides of a figure, in the order the form shows them. */
export const SPRITE_VIEWS = ['front', 'right', 'left', 'back'] as const;

export type SpriteView = (typeof SPRITE_VIEWS)[number];

/** The four images of one kind: file names, URLs or pixels, depending on who reads them. */
export type ViewImages<T> = Record<SpriteView, T | null>;

/** A token with none of the four (the form's starting state). */
export const EMPTY_VIEWS: ViewImages<string> = { front: null, right: null, left: null, back: null };

/** Half of the front sector and of the back one: each side is 90° wide. */
const SECTOR_HALF = Math.PI / 4;
/** The exact border of a sector belongs to the front/back, so floating point must not move it (FR-011, FR-015). */
const BORDER = 1e-9;

/** Direction of the camera seen from the piece, clockwise from north — the same convention as `look`. */
const bearingOf = (piece: Point, camera: Point): number =>
  Math.atan2(camera.x - piece.x, -(camera.y - piece.y));

/** Angle in (−π, π]. */
const wrap = (angle: number): number => {
  let value = angle;
  while (value > Math.PI) value -= 2 * Math.PI;
  while (value <= -Math.PI) value += 2 * Math.PI;
  return value;
};

/**
 * Which side of the figure the camera sees: `front` within ±45° of the direction the piece faces, `back` within
 * ±45° of the opposite one, and `right`/`left` — the character's own sides — in between.
 */
export const viewSeen = (look: number, piece: Point, camera: Point): SpriteView => {
  const relative = wrap(bearingOf(piece, camera) - lookToYaw(look));
  if (Math.abs(relative) <= SECTOR_HALF + BORDER) return 'front';
  if (Math.abs(relative) >= 3 * SECTOR_HALF - BORDER) return 'back';
  return relative > 0 ? 'right' : 'left';
};

/**
 * The image of the side seen, with the fallback of the 3D view (FR-013): the side itself, else the opposite side
 * mirrored (only sides mirror), else the front, else `fallback` (the standing image). The back is never mirrored.
 */
export const chooseSprite = <T>(
  images: ViewImages<T>,
  fallback: T,
  seen: SpriteView,
): { image: T; mirrored: boolean } => {
  const direct = images[seen];
  if (direct !== null) return { image: direct, mirrored: false };
  const opposite = seen === 'right' ? images.left : seen === 'left' ? images.right : null;
  if (opposite !== null) return { image: opposite, mirrored: true };
  if (images.front !== null) return { image: images.front, mirrored: false };
  return { image: fallback, mirrored: false };
};

/** The four saved images of a token (file names). */
export type SpriteImages = ViewImages<string>;

/** The four URLs a token or a piece carries — the same four fields in both DTOs. */
type SpriteUrlSource = Pick<TokenInfo, 'frontImageUrl' | 'rightImageUrl' | 'leftImageUrl' | 'backImageUrl'>;

/** The saved file names of the four sides. */
export const tokenSpriteNames = (token: TokenInfo): SpriteImages => ({
  front: token.frontImage, right: token.rightImage, left: token.leftImage, back: token.backImage,
});

/** The presigned URL of each side (null when the token or piece has none). */
export const tokenSpriteUrls = (source: SpriteUrlSource): SpriteImages => ({
  front: source.frontImageUrl, right: source.rightImageUrl, left: source.leftImageUrl, back: source.backImageUrl,
});

/**
 * What the four sides are when the form is saved (FR-005): a direction with a new crop is uploaded and replaces the
 * saved name; without one it keeps the saved name while `keep` says so, and null when it was removed — the token PUT
 * replaces every field. Crops upload in parallel, and only the directions that have one are touched.
 */
export const resolveSpriteImages = async <T>(
  saved: SpriteImages,
  keep: Record<SpriteView, boolean>,
  crops: ViewImages<T | null>,
  upload: (crop: T) => Promise<string>,
): Promise<SpriteImages> => {
  const one = async (view: SpriteView): Promise<string | null> => {
    const crop = crops[view];
    if (crop !== null) return upload(crop);
    return keep[view] ? saved[view] : null;
  };
  const [front, right, left, back] = await Promise.all(SPRITE_VIEWS.map(one));
  return { front, right, left, back };
};
