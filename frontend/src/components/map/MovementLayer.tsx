import { hexCenter, hexPath } from '../../lib/hexGrid';
import type { MoveState, Offset } from '../../lib/hexGrid';
import type { MovementStatus } from '../../lib/movement';

interface MovementLayerProps {
  trail: MoveState[];
  /** Hexes the piece would take at the destination (its whole shape, 031). */
  destination: Offset[];
  status: MovementStatus;
  hexSize: number;
}

/** Trail of the move through the hex centers and the destination hex: green within the move, red past it, gray for objects. */
export const MovementLayer = ({ trail, destination, status, hexSize }: MovementLayerProps) => {
  const points = trail
    .filter((s, i) => i === 0 || s.x !== trail[i - 1].x || s.y !== trail[i - 1].y)
    .map((s) => hexCenter(s.x, s.y, hexSize))
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  return (
    <g className="stm-movement">
      {destination.length > 0 && (
        <path className={`stm-move-target is-${status}`} d={destination.map((hex) => hexPath(hex.x, hex.y, hexSize)).join('')} />
      )}
      {trail.length > 1 && <polyline className={`stm-move-trail is-${status}`} points={points} />}
    </g>
  );
};

export default MovementLayer;
