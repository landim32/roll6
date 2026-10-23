import { useEffect, useRef } from 'react';
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
 * Comic speech balloons over the pieces that acted in the turn in progress: a white oval with an ink outline, a tail
 * pointing to the piece and comic lettering (068, `.stm-comic-balloon`), up to three lines (the full text in the
 * tooltip). Drawn above every piece, never catching clicks. With the mouse over a balloon it turns see-through
 * (`.is-see-through`), so the map and the pieces under it show; the layer keeps `pointer-events: none`, so the hover is
 * found from the pointer position and every click still reaches the map.
 */
export const SpeechBubbleLayer = ({ tokens, bubbles, hexSize }: SpeechBubbleLayerProps) => {
  const layerRef = useRef<SVGGElement>(null);
  useEffect(() => {
    if (bubbles.size === 0) return;
    const onMove = (event: PointerEvent) => {
      const layer = layerRef.current;
      if (!layer) return;
      layer.querySelectorAll<HTMLElement>('.stm-bubble').forEach((balloon) => {
        const box = balloon.getBoundingClientRect();
        const over = event.clientX >= box.left && event.clientX <= box.right
          && event.clientY >= box.top && event.clientY <= box.bottom;
        balloon.classList.toggle('is-see-through', over);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [bubbles]);
  if (bubbles.size === 0) return null;
  const width = hexSize * 4.5;
  const height = hexSize * 2.5;
  const gap = hexSize * 0.75;
  return (
    <g className="stm-bubbles" ref={layerRef}>
      {tokens.map((token) => {
        const key = pieceKey(token);
        const text = key ? bubbles.get(key) : undefined;
        if (!text) return null;
        const center = hexCenter(token.x, token.y, hexSize);
        return (
          <foreignObject key={token.mapTokenId} x={center.x - width / 2} y={center.y - gap - height} width={width} height={height}>
            <div className="stm-bubble-anchor">
              <div className="stm-bubble stm-comic-balloon" title={`${token.name}: ${text}`}>
                <span className="stm-comic-text">{text}</span>
              </div>
            </div>
          </foreignObject>
        );
      })}
    </g>
  );
};

export default SpeechBubbleLayer;
