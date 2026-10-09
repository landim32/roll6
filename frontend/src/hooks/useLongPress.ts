import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { LONG_PRESS_MS, movedTooFar } from '../lib/chatGestures';

/**
 * Holding an element (044): after half a second without moving, `onLongPress` gets the element. A right click, the
 * context-menu key or Shift+F10 do the same at once. Moving the finger (scrolling) cancels it, and the click that ends a
 * long press is swallowed so it doesn't also open a picture or a link.
 */
export const useLongPress = (onLongPress: (element: HTMLElement) => void, enabled = true) => {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    fired.current = false;
    start.current = { x: event.clientX, y: event.clientY };
    const element = event.currentTarget;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fired.current = true;
      navigator.vibrate?.(15);
      onLongPress(element);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const from = start.current;
    if (from && movedTooFar(event.clientX - from.x, event.clientY - from.y)) clear();
  };

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    event.preventDefault();
    clear();
    fired.current = true;
    onLongPress(event.currentTarget);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!enabled) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      onLongPress(event.currentTarget);
    }
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!fired.current) return;
    fired.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu,
    onKeyDown,
    onClickCapture,
  };
};

export default useLongPress;
