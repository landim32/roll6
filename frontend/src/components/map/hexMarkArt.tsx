import { markArt, markSymbolId } from '../../lib/hexMarkArt';
import type { ArtShape } from '../../lib/hexMarkArt';
import { HEX_MARK, HEX_MARKS } from '../../types/mapPaint';

const colorOf = (name: string | undefined): string => (name ? `var(${name})` : 'none');

const ArtPath = ({ shape }: { shape: ArtShape }) => (
  <path
    d={shape.d}
    fill={colorOf(shape.fill)}
    stroke={colorOf(shape.stroke)}
    strokeWidth={shape.width ?? 0}
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity={shape.opacity}
  />
);

/**
 * One `<symbol>` per mark kind (107), drawn around (0, 0) for a hex of `size` — placed with `<use x y>` on each hex
 * center. Colors come from the `--stm-mark-*` theme variables.
 */
export const HexMarkSymbols = ({ prefix, size }: { prefix: string; size: number }) => (
  <defs>
    {HEX_MARKS.map((kind) => (
      <symbol key={kind} id={markSymbolId(prefix, kind, false)} overflow="visible">
        {markArt(kind, size).map((shape, i) => <ArtPath key={i} shape={shape} />)}
      </symbol>
    ))}
    <symbol id={markSymbolId(prefix, HEX_MARK.mark, true)} overflow="visible">
      {markArt(HEX_MARK.mark, size, true).map((shape, i) => <ArtPath key={i} shape={shape} />)}
    </symbol>
  </defs>
);

export default HexMarkSymbols;
