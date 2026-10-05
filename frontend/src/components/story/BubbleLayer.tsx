import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { bubblePlacement, orderByProximity } from '../../lib/storyBubbles';
import type { FrameResult } from './raycastRenderer';

/** A figure with something to say in the turn in progress. */
export interface StoryBubble {
  id: number;
  name: string;
  text: string;
}

export interface BubbleLayerHandle {
  /** Places every balloon for the frame that was just drawn, in canvas pixels. */
  update: (result: FrameResult, canvas: { width: number; height: number }) => void;
}

/** The balloon's box (canvas px, unscaled): as wide as the 2D balloon's limit and up to three lines of text. */
const BALLOON = { width: 220, height: 60 };

/**
 * The speech balloons of the turn over the 3D figures (036): an HTML layer above the canvas, because the frame is drawn
 * small and blown up without smoothing, which would blur the text. Each frame the layer is told where every figure
 * landed and writes the place, the size and the order straight into the DOM — no React render sixty times a second.
 * A figure that is not drawn, or whose head is behind a wall, loses its balloon with it (FR-018).
 */
export const BubbleLayer = forwardRef<BubbleLayerHandle, { bubbles: StoryBubble[] }>(({ bubbles }, ref) => {
  const { t } = useTranslation();
  const nodes = useRef(new Map<number, HTMLDivElement>());

  useImperativeHandle(ref, () => ({
    update: (result, canvas) => {
      const frame = { frameWidth: result.frameWidth, frameHeight: result.frameHeight };
      const placed = orderByProximity(
        result.sprites.flatMap((sprite) => {
          const at = bubblePlacement(sprite, frame, canvas, BALLOON);
          return at ? [at] : [];
        }),
      );
      const byId = new Map(placed.map((at) => [at.id, at]));

      for (const [id, node] of nodes.current) {
        const at = byId.get(id);
        if (!at || !at.visible) {
          node.style.opacity = '0';
          continue;
        }
        // The placement gives the box's center and its bottom edge, in canvas pixels.
        node.style.left = `${Math.round(at.x - (BALLOON.width * at.scale) / 2)}px`;
        node.style.top = `${Math.round(at.y - BALLOON.height * at.scale)}px`;
        node.style.transform = `scale(${at.scale.toFixed(3)})`;
        node.style.zIndex = String(at.order + 1);
        node.style.opacity = '1';
        node.classList.toggle('is-below', at.below);
      }
    },
  }), []); // it only reads refs, so it never needs rebuilding

  return (
    <div className="stm-story-bubbles">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="stm-story-bubble"
          title={t('story.bubbleLabel', { name: bubble.name, text: bubble.text })}
          aria-label={t('story.bubbleLabel', { name: bubble.name, text: bubble.text })}
          ref={(node) => {
            if (node) nodes.current.set(bubble.id, node);
            else nodes.current.delete(bubble.id);
          }}
        >
          {bubble.text}
        </div>
      ))}
    </div>
  );
});

BubbleLayer.displayName = 'BubbleLayer';

export default BubbleLayer;
