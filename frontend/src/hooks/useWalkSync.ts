import { useCallback, useEffect, useRef } from 'react';
import { mapTokenService } from '../Services/mapTokenService';
import { fitsGrid, sameTarget, shouldSendHub, walkTarget } from '../lib/walkSync';
import type { WalkTarget } from '../lib/walkSync';
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
 * second while it moves or turns, and one when it stops), and each new hex or facing is written to the piece through
 * the API — one request at a time, the newest target winning — so the 2D map, the reloads and the turns see it.
 * `lastSent` is the target this tab last wrote: the piece coming back equal to it is this tab's own echo, not a move by
 * someone else, and must not restart the walk.
 */
export const useWalkSync = ({ mapTokenId, space, columns, rows }: UseWalkSyncOptions) => {
  const { sendWalk } = useRealtime();
  const latest = useRef({ mapTokenId, space, columns, rows, sendWalk });
  latest.current = { mapTokenId, space, columns, rows, sendWalk };
  const lastSent = useRef<WalkTarget | null>(null);
  const pending = useRef<WalkTarget | null>(null);
  const inFlight = useRef(false);
  /** The server refused a walk (mode, map or posture changed): stop writing until the walk starts again. */
  const refused = useRef(false);
  const hub = useRef<{ lastAt: number | null; active: boolean; last: WalkerState | null }>({ lastAt: null, active: false, last: null });

  const flush = useCallback(() => {
    const id = latest.current.mapTokenId;
    const target = pending.current;
    if (inFlight.current || refused.current || id === null || target === null) return;
    pending.current = null;
    if (sameTarget(target, lastSent.current)) return;
    inFlight.current = true;
    // Remembered before the answer: the piece's real-time echo may arrive before it.
    lastSent.current = target;
    mapTokenService.walkTo(id, target.x, target.y, target.look)
      .catch((err: unknown) => {
        refused.current = true;
        console.warn('[walk] the server refused the walk position', err);
      })
      .finally(() => {
        inFlight.current = false;
        flush();
      });
  }, []);

  /** Called with every state of the own walk, and null when it ends. */
  const onWalker = useCallback((walker: WalkerState | null) => {
    const { mapTokenId: id, space: size, columns: width, rows: height, sendWalk: send } = latest.current;
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
    state.active = active;
    state.last = walker;
    if (!walker) return;
    const target = walkTarget(walker);
    if (sameTarget(target, pending.current ?? lastSent.current) || !fitsGrid(target, size, width, height)) return;
    pending.current = target;
    flush();
  }, [flush]);

  /** A new walk (from the piece): forget the previous one's state, keep `lastSent` for its late echo. */
  const reset = useCallback(() => {
    pending.current = null;
    refused.current = false;
    hub.current = { lastAt: null, active: false, last: null };
  }, []);

  useEffect(() => { reset(); }, [mapTokenId, reset]);

  return { onWalker, lastSent, reset };
};

export default useWalkSync;
