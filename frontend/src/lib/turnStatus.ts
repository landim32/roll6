/** Pure turn rules for the cards, the piece menu and the map layers (016). */
import { movementField, pathTo } from './hexGrid';
import type { MoveState } from './hexGrid';
import { TURN_TYPE } from '../types/turn';
import type { TurnInfo } from '../types/turn';

/** Card circle: red until it moves, yellow after moving, green once it acted. */
export const TURN_STATUS = {
  none: 'none',
  moved: 'moved',
  acted: 'acted',
} as const;

export type TurnStatus = (typeof TURN_STATUS)[keyof typeof TURN_STATUS];

/** Who a piece is in the turn; objects (no character nor occurrence) take no part. */
export interface TurnPiece {
  characterId: number | null;
  mapNpcId: number | null;
}

const statusOf = (entries: TurnInfo[]): TurnStatus => {
  if (entries.some((e) => e.turnType === TURN_TYPE.action)) return TURN_STATUS.acted;
  if (entries.some((e) => e.turnType === TURN_TYPE.movement)) return TURN_STATUS.moved;
  return TURN_STATUS.none;
};

/** Entries of the piece's character or NPC occurrence. */
export const entriesOf = (entries: TurnInfo[], piece: TurnPiece): TurnInfo[] => {
  if (piece.characterId !== null) return entries.filter((e) => e.characterId === piece.characterId);
  if (piece.mapNpcId !== null) return entries.filter((e) => e.mapNpcId === piece.mapNpcId);
  return [];
};

export const characterStatus = (entries: TurnInfo[], characterId: number): TurnStatus =>
  statusOf(entries.filter((e) => e.characterId === characterId));

export const occurrenceStatus = (entries: TurnInfo[], mapNpcId: number): TurnStatus =>
  statusOf(entries.filter((e) => e.mapNpcId === mapNpcId));

/**
 * A campaign NPC may have several pieces (occurrences), each with its own turn: green when all acted, red
 * when any did nothing (or it has no piece but acted as a whole NPC), yellow otherwise. Entries recorded for
 * the NPC without an occurrence count for the NPC as a whole.
 */
export const npcStatus = (entries: TurnInfo[], npcId: number, occurrenceIds: number[]): TurnStatus => {
  if (occurrenceIds.length === 0) return statusOf(entries.filter((e) => e.npcId === npcId && e.mapNpcId === null));
  const statuses = occurrenceIds.map((id) => occurrenceStatus(entries, id));
  if (statuses.every((s) => s === TURN_STATUS.acted)) return TURN_STATUS.acted;
  if (statuses.some((s) => s === TURN_STATUS.none)) return TURN_STATUS.none;
  return TURN_STATUS.moved;
};

/** The piece already moved in this turn (only one move per turn). */
export const hasMoved = (entries: TurnInfo[], piece: TurnPiece): boolean =>
  entriesOf(entries, piece).some((e) => e.turnType === TURN_TYPE.movement);

/** The piece has something to reset in this turn. */
export const hasEntries = (entries: TurnInfo[], piece: TurnPiece): boolean => entriesOf(entries, piece).length > 0;

/** Key of a piece's actor: `c:{characterId}` or `n:{mapNpcId}`; null for objects. */
export const pieceKey = (piece: TurnPiece): string | null => {
  if (piece.characterId !== null) return `c:${piece.characterId}`;
  if (piece.mapNpcId !== null) return `n:${piece.mapNpcId}`;
  return null;
};

/** Latest action text of each actor (speech balloons), keyed like `pieceKey`. */
export const lastActions = (entries: TurnInfo[]): Map<string, string> => {
  const result = new Map<string, string>();
  for (const entry of entries) {
    if (entry.turnType !== TURN_TYPE.action || !entry.description) continue;
    const key = pieceKey(entry);
    if (key) result.set(key, entry.description);
  }
  return result;
};

/** A move of the current turn on a map: where the piece was and where it stopped. */
export interface MovementTrail {
  turnId: number;
  from: MoveState;
  to: MoveState;
}

/** Moves recorded on the given map (trails stay visible until the turn ends). */
export const movementTrails = (entries: TurnInfo[], mapId: number | null): MovementTrail[] =>
  mapId === null ? [] : entries
    .filter((e) => e.turnType === TURN_TYPE.movement && e.mapId === mapId
      && e.beforeX !== null && e.beforeY !== null && e.x !== null && e.y !== null)
    .map((e) => ({
      turnId: e.turnId,
      from: { x: e.beforeX!, y: e.beforeY!, look: e.beforeLook ?? 0 },
      to: { x: e.x!, y: e.y!, look: e.look ?? 0 },
    }));

/**
 * Hexes the trail passes through: cheapest path from the state before to the state after (ignoring the other
 * pieces, which may have moved since), consecutive turns on the same hex collapsed. Falls back to a straight
 * segment when the end is unreachable.
 */
export const trailHexes = (trail: MovementTrail, columns: number, rows: number): { x: number; y: number }[] => {
  const path = pathTo(movementField(trail.from, columns, rows, () => false), trail.to);
  const states = path.length > 0 ? path : [trail.from, trail.to];
  return states
    .filter((s, i) => i === 0 || s.x !== states[i - 1].x || s.y !== states[i - 1].y)
    .map(({ x, y }) => ({ x, y }));
};

/** What the user already knows about a campaign's turns: the last turn seen and the finished ones not read. */
export interface TurnSeen {
  known: number;
  /** Finished turns with an unread notification, most recent first. */
  unread: number[];
}

/**
 * Updates the record with the turn in progress: the first sight of a campaign only records it; a higher turn
 * means the previous one was finished, which becomes an unread notification.
 */
export const trackTurn = (seen: TurnSeen | undefined, turnNo: number): TurnSeen => {
  if (!seen) return { known: turnNo, unread: [] };
  if (turnNo <= seen.known) return seen;
  const finished = turnNo - 1;
  return { known: turnNo, unread: [finished, ...seen.unread.filter((n) => n !== finished)] };
};
