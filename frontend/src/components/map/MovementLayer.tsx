import { hexCenter, hexPath } from '../../lib/hexGrid';
import type { MoveState, Offset } from '../../lib/hexGrid';
import type { MovementStatus } from '../../lib/movement';

interface MovementLayerProps {
  trail: MoveState[];
  destination: Offset | null;
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
      {destination && <path className={`stm-move-target is-${status}`} d={hexPath(destination.x, destination.y, hexSize)} />}
      {trail.length > 1 && <polyline className={`stm-move-trail is-${status}`} points={points} />}
    </g>
  );
};

export default MovementLayer;
