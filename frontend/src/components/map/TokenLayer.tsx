import { hexCenter } from '../../lib/hexGrid';
import { MAP_TOKEN_TYPE } from '../../types/mapToken';
import type { MapTokenInfo } from '../../types/mapToken';

interface TokenLayerProps {
  tokens: MapTokenInfo[];
  hexSize: number;
  /** A piece being moved: drawn at this position and facing instead of the saved ones (015). */
  preview?: { mapTokenId: number; x: number; y: number; look: number } | null;
}

/** Disc color class per piece type: blue characters, red NPCs, gray objects. */
const pieceClass = (tokenType: number): string => {
  if (tokenType === MAP_TOKEN_TYPE.character) return ' is-character';
  if (tokenType === MAP_TOKEN_TYPE.npc) return ' is-npc';
  return '';
};

/** Token images are drawn looking down (the bottom side, look 3). */
const IMAGE_LOOK = 3;

/**
 * Pieces of the map, each centered on its hex: the standing image in a circle, or the name's initial.
 * The disc behind it is translucent — blue for campaign characters, red for NPCs, gray for objects. A piece
 * facing `look` is turned by (look − 3) × 60° from its downward-looking image, with a small mark on the
 * front side (drawn on the bottom edge, turning with it).
 */
export const TokenLayer = ({ tokens, hexSize, preview = null }: TokenLayerProps) => {
  const radius = hexSize * 0.8;
  const mark = hexSize * 0.18;
  return (
    <g className="stm-map-tokens">
      {tokens.map((saved) => {
        const token = preview && preview.mapTokenId === saved.mapTokenId ? { ...saved, ...preview } : saved;
        const center = hexCenter(token.x, token.y, hexSize);
        const clipId = `stm-token-clip-${token.mapTokenId}`;
        return (
          <g
            key={token.mapTokenId}
            className={`stm-map-token${pieceClass(token.tokenType)}`}
            transform={`translate(${center.x} ${center.y}) rotate(${(token.look - IMAGE_LOOK) * 60})`}
          >
            <title>{token.name}</title>
            <circle className="stm-map-token-disc" r={radius} />
            {token.upImageUrl ? (
              <>
                <clipPath id={clipId}>
                  <circle r={radius} />
                </clipPath>
                <image
                  href={token.upImageUrl}
                  x={-radius}
                  y={-radius}
                  width={radius * 2}
                  height={radius * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                />
              </>
            ) : (
              <text textAnchor="middle" dominantBaseline="central" fontSize={radius}>
                {token.name.trim().charAt(0).toUpperCase() || '?'}
              </text>
            )}
            <path className="stm-map-token-front" d={`M${-mark} ${radius - 1}L0 ${radius + mark}L${mark} ${radius - 1}Z`} />
          </g>
        );
      })}
    </g>
  );
};

export default TokenLayer;
