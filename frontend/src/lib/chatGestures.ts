/**
 * Touch gestures of the chat (044), as pure rules: holding a bubble opens its action bar; dragging it to the right
 * starts a reply. A vertical drag is always the chat's own scroll and never one of these.
 */

/** Holding this long without moving opens the action bar (WhatsApp's half a second). */
export const LONG_PRESS_MS = 500;
/** A finger that moves more than this is scrolling, not holding. */
export const MOVE_TOLERANCE = 8;
/** The drag direction is decided once the finger moved this far. */
export const SWIPE_DECIDE = 10;
/** Dragging at least this far to the right and letting go starts a reply. */
export const SWIPE_REPLY = 60;
/** The bubble follows the finger up to here. */
export const SWIPE_MAX = 90;

export type SwipeIntent = 'horizontal' | 'vertical' | 'undecided';

/** Right and clearly more horizontal than vertical → a reply drag; anything else is left to the scroll. */
export const swipeIntent = (dx: number, dy: number): SwipeIntent => {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_DECIDE) return 'undecided';
  return dx > 0 && ax > ay * 1.5 ? 'horizontal' : 'vertical';
};

/** How far the bubble follows the finger. */
export const swipeOffset = (dx: number): number => Math.max(0, Math.min(dx, SWIPE_MAX));

export const shouldReply = (dx: number): boolean => dx >= SWIPE_REPLY;

export const movedTooFar = (dx: number, dy: number): boolean => Math.hypot(dx, dy) > MOVE_TOLERANCE;
