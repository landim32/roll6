import { footprint, HEX_SIZE, isInsideGrid, pixelToHex } from './hexGrid';
import { walkerLook } from './walker';
import type { WalkerState } from './walker';

/**
 * Sharing the free-mode walk (069): when the walker tells the others where it is (the hub stream, at most every
 * `HUB_INTERVAL` ms while it moves), and what its piece stores (written through the API whenever its hex or facing
 * changes, and once more where it stops). Since 070 the piece also keeps the exact point and direction of the walk, so
 * the 3D view never pulls the figure to the middle of the hex; the 2D map still draws the hex. Pure, so every rule is
 * unit-tested; `hooks/useWalkSync` does the sending.
 */

/** Least time between two samples on the hub while walking (ms): about ten a second. */
export const HUB_INTERVAL = 100;
/** Writes remembered to recognise their echoes (they may come back late and out of order). */
export const ECHO_MEMORY = 32;
/** Tolerance when comparing a stored point/direction with a sent one (the server normalizes the direction). */
const NEAR = 1e-6;

/** The piece's place as stored: column/row and the hex side it faces. */
export interface WalkTarget {
  x: number;
  y: number;
  look: number;
}

/** A walk write (070): the hex and facing, plus the exact point (map px) and direction (radians) inside that hex. */
export interface WalkWrite extends WalkTarget {
  walkX: number;
  walkY: number;
  walkYaw: number;
}

/** What a piece says about its place (the walk fields are null when it was not left by a walk). */
export interface PiecePlace extends WalkTarget {
  walkX?: number | null;
  walkY?: number | null;
  walkYaw?: number | null;
}

/** The angle in (−π, π], as the server stores it. */
export const normalizeYaw = (yaw: number): number => Math.atan2(Math.sin(yaw), Math.cos(yaw));

/** The hex the walker stands on and the side nearest to where it faces. */
export const walkTarget = (walker: Pick<WalkerState, 'x' | 'z' | 'yaw'>): WalkTarget => {
  const hex = pixelToHex({ x: walker.x, y: walker.z }, HEX_SIZE);
  return { x: hex.x, y: hex.y, look: walkerLook(walker.yaw) };
};

/** The write for a walker: its hex and facing, and exactly where it is. */
export const walkWrite = (walker: Pick<WalkerState, 'x' | 'z' | 'yaw'>): WalkWrite => ({
  ...walkTarget(walker), walkX: walker.x, walkY: walker.z, walkYaw: normalizeYaw(walker.yaw),
});

export const sameTarget = (a: WalkTarget | null, b: WalkTarget | null): boolean =>
  a !== null && b !== null && a.x === b.x && a.y === b.y && a.look === b.look;

const near = (a: number | null | undefined, b: number): boolean => a !== null && a !== undefined && Math.abs(a - b) < NEAR;

/** Same hex, facing, point and direction. */
export const samePlace = (piece: PiecePlace | null, write: WalkWrite | null): boolean =>
  piece !== null && write !== null && sameTarget(piece, write)
  && near(piece.walkX, write.walkX) && near(piece.walkY, write.walkY)
  && piece.walkYaw !== null && piece.walkYaw !== undefined && near(normalizeYaw(piece.walkYaw), write.walkYaw);

/**
 * The piece came back exactly as one of this tab's recent writes put it: its own echo, not someone else's move — even
 * when it arrives late, after a newer write (that was what made the walk jump between two hexes).
 */
export const isOwnEcho = (piece: PiecePlace, sent: readonly WalkWrite[]): boolean => sent.some((write) => samePlace(piece, write));

/** The list of recent writes with a new one at its end. */
export const remember = (sent: readonly WalkWrite[], write: WalkWrite): WalkWrite[] => [...sent, write].slice(-ECHO_MEMORY);

/**
 * Whether to write the piece now: whenever its hex or facing changes, and where the walk stops (the exact point and
 * direction, so the others and a reload see it there) — never the same place twice.
 */
export const shouldWrite = (write: WalkWrite, previous: WalkWrite | null, stopped: boolean): boolean => {
  if (previous === null || !sameTarget(write, previous)) return true;
  return stopped && !samePlace(previous, write);
};

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
