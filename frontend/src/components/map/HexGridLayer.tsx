import { memo, useMemo } from 'react';
import { gridPath } from '../../lib/hexGrid';

interface HexGridLayerProps {
  columns: number;
  rows: number;
  hexSize: number;
}

/** The whole grid as a single memoized <path> (keeps 100 × 100 grids fluid). */
export const HexGridLayer = memo(({ columns, rows, hexSize }: HexGridLayerProps) => {
  const d = useMemo(() => gridPath(columns, rows, hexSize), [columns, rows, hexSize]);
  return <path className="stm-grid" d={d} />;
});

HexGridLayer.displayName = 'HexGridLayer';

export default HexGridLayer;
