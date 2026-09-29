import { hexPath } from '../../lib/hexGrid';
import type { Offset } from '../../lib/hexGrid';

interface HexHighlightProps {
  /** The hexes to fill: one free hex, or every hex of a piece (031). */
  hexes: Offset[] | null;
  hexSize: number;
  /** `hover`: light blue (mouse or dragged card); `selected`: gray (clicked hex with its menu open). */
  variant?: 'hover' | 'selected';
}

/** Fill over the hex under the mouse or the clicked (selected) one — the whole shape when a piece is there. */
export const HexHighlight = ({ hexes, hexSize, variant = 'hover' }: HexHighlightProps) =>
  hexes && hexes.length > 0 ? (
    <path
      className={variant === 'selected' ? 'stm-hex-selected' : 'stm-hex-highlight'}
      d={hexes.map((hex) => hexPath(hex.x, hex.y, hexSize)).join('')}
    />
  ) : null;

export default HexHighlight;
