import { hexPath } from '../../lib/hexGrid';
import type { Offset } from '../../lib/hexGrid';

interface HexHighlightProps {
  hex: Offset | null;
  hexSize: number;
  /** `hover`: light blue (mouse or dragged card); `selected`: gray (clicked hex with its menu open). */
  variant?: 'hover' | 'selected';
}

/** Fill over one hex: the hex under the mouse or the clicked (selected) hex. */
export const HexHighlight = ({ hex, hexSize, variant = 'hover' }: HexHighlightProps) =>
  hex ? <path className={variant === 'selected' ? 'stm-hex-selected' : 'stm-hex-highlight'} d={hexPath(hex.x, hex.y, hexSize)} /> : null;

export default HexHighlight;
