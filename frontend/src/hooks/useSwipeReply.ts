import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { shouldReply, swipeIntent, swipeOffset } from '../lib/chatGestures';
import type { SwipeIntent } from '../lib/chatGestures';

/**
 * Dragging a bubble to the right to answer it, like WhatsApp (044). Touch and pen only (the mouse uses the action bar);
 * the bubble follows the finger up to a limit and letting go past the threshold calls `onReply`. A vertical drag is the
 * chat's scroll: once the direction says so, this lets go (the bubbles have `touch-action: pan-y`).
 */
export const useSwipeReply = (onReply: () => void, enabled = true) => {
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; intent: SwipeIntent } | null>(null);

  const reset = () => {
    drag.current = null;
    setOffset(0);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === 'mouse') return;
    drag.current = { x: event.clientX, y: event.clientY, intent: 'undecided' };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.intent === 'undecided') {
      current.intent = swipeIntent(dx, dy);
      if (current.intent === 'vertical') {
        reset();
        return;
      }
      if (current.intent === 'horizontal') event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (current.intent === 'horizontal') setOffset(swipeOffset(dx));
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (current?.intent === 'horizontal' && shouldReply(event.clientX - current.x)) onReply();
    reset();
  };

  return { offset, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset };
};

export default useSwipeReply;
