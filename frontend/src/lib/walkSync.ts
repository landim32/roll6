import { footprint, HEX_SIZE, isInsideGrid, pixelToHex } from './hexGrid';
import { walkerLook } from './walker';
import type { WalkerState } from './walker';

/**
 * Sharing the free-mode walk (069): when the walker tells the others where it is (the hub stream, at most every
 * `HUB_INTERVAL` ms while it moves), and which hex and facing its piece takes (written through the API whenever they
 * change). Pure, so every rule is unit-tested; `hooks/useWalkSync` does the sending.
 */

/** Least time between two samples on the hub while walking (ms): about ten a second. */
export const HUB_INTERVAL = 100;

/** The piece's place as stored: column/row and the hex side it faces. */
export interface WalkTarget {
  x: number;
  y: number;
  look: number;
}

/** The hex the walker stands on and the side nearest to where it faces. */
export const walkTarget = (walker: Pick<WalkerState, 'x' | 'z' | 'yaw'>): WalkTarget => {
  const hex = pixelToHex({ x: walker.x, y: walker.z }, HEX_SIZE);
  return { x: hex.x, y: hex.y, look: walkerLook(walker.yaw) };
};

export const sameTarget = (a: WalkTarget | null, b: WalkTarget | null): boolean =>
  a !== null && b !== null && a.x === b.x && a.y === b.y && a.look === b.look;

/** The piece came back exactly where this tab last put it: its own write, not someone else's move. */
export const isOwnEcho = (piece: WalkTarget, lastSent: WalkTarget | null): boolean => sameTarget(piece, lastSent);

/** The whole shape of the piece fits in the grid there (the server refuses it otherwise). */
export const fitsGrid = (target: WalkTarget, space: number, columns: number, rows: number): boolean =>
  footprint(target.x, target.y, target.look, space).every((hex) => isInsideGrid(hex, columns, rows));

/**
 * Whether to send a sample now: while moving, once `HUB_INTERVAL` passed since the last one; when it stops, the first
 * sample after moving (so the others stop it where it is) — never while it stands still.
 */
export const shouldSendHub = (lastAt: number | null, now: number, moving: boolean, wasMoving: boolean): boolean => {
  if (!moving) return wasMoving;
  return lastAt === null || now - lastAt >= HUB_INTERVAL;
};
