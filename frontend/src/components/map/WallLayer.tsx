import { memo, useMemo } from 'react';
import type { Offset } from '../../lib/hexGrid';
import { wallsPath } from '../../lib/storyWalls';

interface WallLayerProps {
  /** Active walls (those of a story map; none on a 2D map). */
  walls: readonly Offset[];
  hexSize: number;
  /** Wall editing on: walls stand out more. */
  editing?: boolean;
}

/** Walls of a story map (033) on the 2D map: one <path> with every wall hex, over the grid and under the pieces. */
export const WallLayer = memo(({ walls, hexSize, editing = false }: WallLayerProps) => {
  const d = useMemo(() => wallsPath(walls, hexSize), [walls, hexSize]);
  if (!d) return null;
  return <path className={`stm-walls${editing ? ' is-editing' : ''}`} d={d} />;
});

WallLayer.displayName = 'WallLayer';

export default WallLayer;
