import { hexCenter } from '../../lib/hexGrid';
import { pieceKey } from '../../lib/turnStatus';
import type { MapTokenInfo } from '../../types/mapToken';

interface SpeechBubbleLayerProps {
  tokens: MapTokenInfo[];
  /** Latest action text per actor (`lastActions`). */
  bubbles: Map<string, string>;
  hexSize: number;
}

/**
 * Comic speech balloons over the pieces that acted in the turn in progress: white box with a tail pointing to
 * the piece, up to three lines (the full text in the tooltip). Drawn above every piece, never catching clicks.
 */
export const SpeechBubbleLayer = ({ tokens, bubbles, hexSize }: SpeechBubbleLayerProps) => {
  if (bubbles.size === 0) return null;
  const width = hexSize * 4;
  const height = hexSize * 2;
  const gap = hexSize * 0.75;
  return (
    <g className="stm-bubbles">
      {tokens.map((token) => {
        const key = pieceKey(token);
        const text = key ? bubbles.get(key) : undefined;
        if (!text) return null;
        const center = hexCenter(token.x, token.y, hexSize);
        return (
          <foreignObject key={token.mapTokenId} x={center.x - width / 2} y={center.y - gap - height} width={width} height={height}>
            <div className="stm-bubble-anchor">
              <div className="stm-bubble" title={`${token.name}: ${text}`}>{text}</div>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
};

export default SpeechBubbleLayer;
