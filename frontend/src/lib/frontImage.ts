import type { CSSProperties } from 'react';
import type { ImageSize } from './cropImage';

/**
 * The "2,5D" images a token may have (034 front, 035 right/left/back): the character standing, seen from one side. All
 * four are cropped to the same fixed 3:4 portrait over the same human silhouette guide, so every figure has the same
 * margins and the 3D view can size them the same way.
 * The names and values below stay as they are (034): the height of the 3D camera is derived from them.
 */

/** Width ÷ height of the crop (portrait 3:4). */
export const FRONT_IMAGE_ASPECT = 3 / 4;

/** Pixel size the cropped image is saved at. */
export const FRONT_IMAGE_SIZE: ImageSize = { width: 360, height: 480 };

/**
 * Share of the crop's height the silhouette occupies: the character fits in 60% of the image and the rest is margin
 * (headroom for hats, weapons or a bigger creature), saved transparent.
 */
export const SILHOUETTE_SHARE = 0.6;

/** Proportions of the silhouette drawing (viewBox). */
const VIEW_BOX = { width: 50, height: 120 };

/** Height (viewBox units, from the top) of the silhouette's eyes: a little above the center of the head, which is at 9. */
const EYE_Y = 8;

/**
 * Share of the crop's height, measured from its bottom edge (where the feet are), at which the silhouette's eyes are:
 * 56% when the silhouette is 60% of the crop. The 3D camera is placed at this height of a figure, so it looks at the
 * face of a character that fits the silhouette (see `EYE_HEIGHT` in lib/raycaster).
 */
export const FACE_HEIGHT_SHARE = (SILHOUETTE_SHARE * (VIEW_BOX.height - EYE_Y)) / VIEW_BOX.height;

/** A human, arms a little away from the body: head, shoulders, arms and legs as one shape, feet on the bottom line. */
const SILHOUETTE_SHAPES =
  `<circle cx='25' cy='9' r='8'/>`
  + `<path d='M16 22 Q25 19 34 22 L42 26 L45 64 L40 65 L37 40 L36 64 L34 119 L26 119 L25 76 L24 119 L16 119 L14 64 L13 40 L10 65 L5 64 L8 26 Z'/>`;

/** The silhouette as an SVG document: translucent white fill and a dashed outline, readable over any picture. */
export const silhouetteSvg = (): string =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}'>`
  + `<g fill='white' fill-opacity='0.22' stroke='white' stroke-opacity='0.9' stroke-width='1' stroke-dasharray='3 2'`
  + ` stroke-linejoin='round'>${SILHOUETTE_SHAPES}</g></svg>`;

/** Where the silhouette sits in a crop `size` px: its height is `SILHOUETTE_SHARE` of the crop's, centered, feet on the bottom edge. */
export const silhouetteBox = (size: ImageSize): { x: number; y: number; width: number; height: number } => {
  const height = size.height * SILHOUETTE_SHARE;
  const width = (height * VIEW_BOX.width) / VIEW_BOX.height;
  return { x: (size.width - width) / 2, y: size.height - height, width, height };
};

/**
 * Style of the cropper's frame (react-easy-crop `cropAreaStyle`) that paints the silhouette over the picture, so the user
 * fits the character in it. It is only a guide: it never goes into the saved image.
 */
export const silhouetteCropStyle = (): CSSProperties => ({
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(silhouetteSvg())}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center bottom',
  backgroundSize: `auto ${SILHOUETTE_SHARE * 100}%`,
});
