import { HEX_SIZE } from './hexGrid';
import type { FrameSprite } from './raycastFrame';

/**
 * Where the speech balloons of the turn go over the 3D figures (036). The frame is drawn small and blown up on the
 * canvas, so the balloons are HTML over it: these functions only turn what the frame drew into canvas pixels — text
 * stays sharp and nothing here touches the DOM.
 */

/** Distance at which a balloon is shown at its normal size (about six hexes from the camera). */
export const REFERENCE_DEPTH = 6 * HEX_SIZE;
/** A balloon never shrinks below or grows above this: near figures do not get enormous text, far ones stay readable. */
export const MIN_SCALE = 0.7;
export const MAX_SCALE = 1.2;
/** How far from the edge of the canvas a balloon may go. */
export const SCREEN_MARGIN = 8;
/** The tail of the balloon: the gap between it and the head it points at. */
const TAIL_GAP = 10;
/**
 * The highest the bottom edge of a balloon goes, as a share of the canvas height from the top: a little above the middle
 * of the view (the horizon is at 50%), where the camera looks at a figure. A close figure has its head far above the
 * screen, and a balloon that followed it would leave the canvas; this keeps it where it can be read.
 */
export const BALLOON_CEILING = 0.4;

export interface BubblePlacement {
  id: number;
  /** Center of the box (canvas px). */
  x: number;
  /** Bottom edge of the box (canvas px). */
  y: number;
  scale: number;
  /** The box hangs below the head (and points up) because there was no room above it. */
  below: boolean;
  /** False when the box would not fit on the canvas at all. */
  visible: boolean;
  /** Depth of the figure, kept so `orderByProximity` can sort without going back to the frame. */
  depth: number;
  /** 0 = farthest: nearer balloons get a larger `order`, which becomes the z-index. */
  order: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * The balloon of one drawn figure: its anchor in canvas pixels, its scale by distance, pushed back inside the canvas so
 * it never leaves the screen, and under the head when it does not fit above it. Null when the head is hidden behind a
 * wall (FR-018) — the balloon goes away with the figure.
 */
export const bubblePlacement = (
  sprite: FrameSprite,
  frame: { frameWidth: number; frameHeight: number },
  canvas: { width: number; height: number },
  size: { width: number; height: number },
): BubblePlacement | null => {
  if (!sprite.headVisible) return null;
  const scale = clamp(REFERENCE_DEPTH / sprite.depth, MIN_SCALE, MAX_SCALE);
  const width = size.width * scale;
  const height = size.height * scale;
  const headX = (sprite.screenX * canvas.width) / frame.frameWidth;
  const headY = (sprite.top * canvas.height) / frame.frameHeight;
  const x = clamp(headX, SCREEN_MARGIN + width / 2, Math.max(SCREEN_MARGIN, canvas.width - SCREEN_MARGIN - width / 2));
  // Over the head, but never higher than the ceiling line: a figure so close that its head is off the top of the screen
  // gets its balloon a little above the middle of the view, over the figure, instead of out of sight.
  const anchor = Math.max(headY - TAIL_GAP, canvas.height * BALLOON_CEILING);
  const above = anchor - height >= SCREEN_MARGIN;
  const y = above ? anchor : headY + TAIL_GAP + height;
  return {
    id: sprite.id,
    x,
    y,
    scale,
    below: !above,
    visible: y - height >= 0 && y <= canvas.height,
    depth: sprite.depth,
    order: 0,
  };
};

/** The nearer figure draws on top: `order` grows as the distance shrinks. Equal depths keep the order they came in. */
export const orderByProximity = (placements: BubblePlacement[]): BubblePlacement[] =>
  [...placements]
    .sort((a, b) => b.depth - a.depth)
    .map((placement, index) => ({ ...placement, order: index }));
