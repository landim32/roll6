import { hexCenter } from '../../lib/hexGrid';
import { trailHexes } from '../../lib/turnStatus';
import type { MovementTrail } from '../../lib/turnStatus';

interface TurnTrailLayerProps {
  trails: MovementTrail[];
  hexSize: number;
  columns: number;
  rows: number;
}

/** Moves of the turn in progress on the open map: a dashed trail from where each piece was to where it stopped. */
export const TurnTrailLayer = ({ trails, hexSize, columns, rows }: TurnTrailLayerProps) => (
  <g className="stm-turn-trails">
    {trails.map((trail) => {
      const hexes = trailHexes(trail, columns, rows);
      if (hexes.length < 2) return null;
      const points = hexes
        .map(({ x, y }) => hexCenter(x, y, hexSize))
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(' ');
      const start = hexCenter(hexes[0].x, hexes[0].y, hexSize);
      return (
        <g key={trail.turnId}>
          <circle className="stm-turn-trail-start" cx={start.x} cy={start.y} r={hexSize * 0.15} />
          <polyline className="stm-turn-trail" points={points} />
        </g>
      );
    })}
  </g>
);

export default TurnTrailLayer;
