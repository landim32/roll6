import { hexCenter } from '../../lib/hexGrid';
import { MAP_TOKEN_TYPE } from '../../types/mapToken';
import type { MapTokenInfo } from '../../types/mapToken';

interface TokenLayerProps {
  tokens: MapTokenInfo[];
  hexSize: number;
}

/**
 * Pieces of the map, each centered on its hex: the standing image in a circle, or the name's initial.
 * The disc behind it is translucent — blue for campaign characters, gray for the other pieces.
 */
export const TokenLayer = ({ tokens, hexSize }: TokenLayerProps) => {
  const radius = hexSize * 0.8;
  return (
    <g className="stm-map-tokens">
      {tokens.map((token) => {
        const center = hexCenter(token.x, token.y, hexSize);
        const clipId = `stm-token-clip-${token.mapTokenId}`;
        return (
          <g
            key={token.mapTokenId}
            className={`stm-map-token${token.tokenType === MAP_TOKEN_TYPE.character ? ' is-character' : ''}`}
            transform={`translate(${center.x} ${center.y})`}
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
          </g>
        );
      })}
    </g>
  );
};

export default TokenLayer;
