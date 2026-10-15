import { useCallback, useEffect, useRef } from 'react';
import { mapTokenService } from '../Services/mapTokenService';
import { fitsGrid, remember, shouldSendHub, shouldWrite, walkWrite } from '../lib/walkSync';
import type { WalkWrite } from '../lib/walkSync';
import type { WalkerState } from '../lib/walker';
import { useRealtime } from './useRealtime';

interface UseWalkSyncOptions {
  /** The walked piece, or null while nothing is walked. */
  mapTokenId: number | null;
  /** Hexes the piece takes (its shape must fit in the grid). */
  space: number;
  columns: number;
  rows: number;
}

/**
 * Shares the own free-mode walk (069): every state of the walk goes to the others through the hub (about ten samples a
 * second while it moves or turns, and one when it stops), and the piece is written through the API — one request at a
 * time, the newest winning — whenever its hex or facing changes and where the walk stops, with the exact point and
 * direction (070), so the 2D map, the reloads and the others see it where it really is.
 * `sent` keeps the recent writes: the piece coming back equal to any of them is this tab's own echo, not a move by
 * someone else, and must not restart the walk.
 */
export const useWalkSync = ({ mapTokenId, space, columns, rows }: UseWalkSyncOptions) => {
  const { sendWalk } = useRealtime();
  const latest = useRef({ mapTokenId, space, columns, rows, sendWalk });
  latest.current = { mapTokenId, space, columns, rows, sendWalk };
  const sent = useRef<WalkWrite[]>([]);
  const lastWrite = useRef<WalkWrite | null>(null);
  const pending = useRef<WalkWrite | null>(null);
  const inFlight = useRef(false);
  /** The server refused a walk (mode, map or posture changed): stop writing until the walk starts again. */
  const refused = useRef(false);
  const hub = useRef<{ lastAt: number | null; active: boolean; last: WalkerState | null }>({ lastAt: null, active: false, last: null });

  const flush = useCallback(() => {
    const id = latest.current.mapTokenId;
    const write = pending.current;
    if (inFlight.current || refused.current || id === null || write === null) return;
    pending.current = null;
    inFlight.current = true;
    // Remembered before the answer: the piece's real-time echo may arrive before it.
    sent.current = remember(sent.current, write);
    lastWrite.current = write;
    mapTokenService.walkTo(id, write)
      .catch((err: unknown) => {
        refused.current = true;
        console.warn('[walk] the server refused the walk position', err);
      })
      .finally(() => {
        inFlight.current = false;
        flush();
      });
  }, []);

  const write = useCallback((walker: WalkerState, stopped: boolean) => {
    const { space: size, columns: width, rows: height } = latest.current;
    const next = walkWrite(walker);
    if (!fitsGrid(next, size, width, height)) return;
    if (!shouldWrite(next, pending.current ?? lastWrite.current, stopped)) return;
    pending.current = next;
    flush();
  }, [flush]);

  /** Called with every state of the own walk, and null when it ends. */
  const onWalker = useCallback((walker: WalkerState | null) => {
    const { mapTokenId: id, sendWalk: send } = latest.current;
    if (id === null) return;
    const state = hub.current;
    // The same state handed again (the view re-applying it, the camera orbiting): nothing new to share.
    if (walker !== null && walker === state.last) return;
    const now = performance.now();
    const active = walker !== null && (walker.moving || (state.last !== null && walker.yaw !== state.last.yaw));
    const sample = walker ?? state.last;
    if (sample && shouldSendHub(state.lastAt, now, active, state.active)) {
      send({ mapTokenId: id, x: sample.x, z: sample.z, yaw: sample.yaw, moving: active });
      state.lastAt = now;
    }
    const stopped = state.active && !active;
    state.active = active;
    state.last = walker;
    // The walk's first state is the piece's own place: nothing to write until it moves or turns.
    if (walker && !active && lastWrite.current === null && pending.current === null) {
      lastWrite.current = walkWrite(walker);
      return;
    }
    // The walk ending while moving (the view closing) still leaves the piece where it was.
    const place = walker ?? (stopped ? sample : null);
    if (place) write(place, stopped || walker === null);
  }, [write]);

  /** A new walk (from the piece): forget the previous one's state, keep `sent` for its late echoes. */
  const reset = useCallback(() => {
    pending.current = null;
    lastWrite.current = null;
    refused.current = false;
    hub.current = { lastAt: null, active: false, last: null };
  }, []);

  useEffect(() => { reset(); }, [mapTokenId, reset]);

  return { onWalker, sent, reset };
};

export default useWalkSync;
