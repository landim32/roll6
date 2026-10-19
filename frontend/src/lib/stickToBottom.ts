/** How close to the end (px) still counts as "at the bottom": a line of slack for rounding and borders. */
export const STICK_TOLERANCE = 24;

export interface ScrollBox {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Whether a scrolled list shows its end (091): the editor's conversation follows new content only while the user is
 * there, and leaves them alone once they scroll up to read.
 */
export const isAtBottom = ({ scrollTop, scrollHeight, clientHeight }: ScrollBox, tolerance = STICK_TOLERANCE): boolean =>
  scrollHeight - scrollTop - clientHeight <= tolerance;
