import { useContext, useEffect, useRef } from 'react';
import RealtimeContext from '../Contexts/RealtimeContext';
import type { TableEvent, WalkMessage } from '../types/realtime';

/** Access the Realtime context. Throws if used outside RealtimeProvider. */
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within a RealtimeProvider');
  return context;
};

/**
 * Calls `handler` for every event of the current campaign (and `resync`). The latest handler is always used,
 * so it can read fresh state without re-subscribing.
 */
export const useTableEvents = (handler: (event: TableEvent) => void) => {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => subscribe((event) => handlerRef.current(event)), [subscribe]);
};

/** Calls `handler` for every walk sample of another participant in the current campaign (069). */
export const useWalkEvents = (handler: (message: WalkMessage) => void) => {
  const { onWalk } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => onWalk((message) => handlerRef.current(message)), [onWalk]);
};

export default useRealtime;
