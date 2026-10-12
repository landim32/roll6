import { arrivalCost, footprint, movementCost, pathTo } from './hexGrid';
import type { MoveState, MovementField, Offset } from './hexGrid';

/**
 * State of the "Mover" mode (015): choose the destination following the cheapest path (1 per step into the
 * hex ahead + 1 per 60° turn), then choose the facing; a player can't go past the piece's move.
 */

/**
 * Characters and NPCs spend movement; objects move freely (gray trail, no counter); in the campaign's free mode (054)
 * characters and NPCs are `unlimited`: no path, no counter, any hex where the whole shape fits.
 */
export const MOVEMENT_KIND = {
  limited: 'limited',
  free: 'free',
  unlimited: 'unlimited',
} as const;

export type MovementKind = (typeof MOVEMENT_KIND)[keyof typeof MOVEMENT_KIND];

/** Trail color: within the move, past it, or a free (object) move. */
export type MovementStatus = 'ok' | 'over' | 'free';

/**
 * Whether the piece's whole shape fits on a hex with a facing (free mode, 054): the only rule left when there is no
 * path to follow. Built by the hook from `lib/occupancy`.
 */
export type Fits = (x: number, y: number, look: number) => boolean;

export interface MovingPiece {
  mapTokenId: number;
  name: string;
  x: number;
  y: number;
  look: number;
  kind: MovementKind;
  /** The piece's move (characters/NPCs); null for objects and for unlimited moves. */
  total: number | null;
  /** Hexes the piece takes (031): the whole shape moves and turns. */
  space: number;
}

export type MovementState =
  | { phase: 'idle' }
  | {
    phase: 'path';
    piece: MovingPiece;
    field: MovementField;
    /** Hex under the mouse (null outside the grid). */
    target: Offset | null;
    /** States from the start to the cheapest arrival on the target; empty when unreachable. */
    trail: MoveState[];
    /** Cost of the trail; null when unreachable. */
    cost: number | null;
  }
  | {
    phase: 'facing';
    piece: MovingPiece;
    field: MovementField;
    destination: Offset;
    look: number;
    trail: MoveState[];
    cost: number | null;
  };

export const IDLE: MovementState = { phase: 'idle' };

export const startMovement = (piece: MovingPiece, field: MovementField): MovementState => ({
  phase: 'path',
  piece,
  field,
  target: null,
  trail: [field.start],
  cost: 0,
});

/**
 * Cheapest path to the hex under the mouse (walking into it). An unlimited piece (054) follows no path: the target is
 * fine (cost 0) when its whole shape fits there, impossible (cost null) otherwise.
 */
export const hoverPath = (state: MovementState, hex: Offset | null, fits?: Fits): MovementState => {
  if (state.phase !== 'path') return state;
  if (!hex) return { ...state, target: null, trail: [], cost: null };
  if (state.piece.kind === MOVEMENT_KIND.unlimited)
    return { ...state, target: hex, trail: [], cost: fits?.(hex.x, hex.y, state.field.start.look) ? 0 : null };
  const arrival = arrivalCost(state.field, hex.x, hex.y);
  if (!arrival) return { ...state, target: hex, trail: [], cost: null };
  return { ...state, target: hex, trail: pathTo(state.field, arrival.state), cost: arrival.cost };
};

export const statusOf = (piece: MovingPiece, cost: number | null): MovementStatus => {
  if (piece.kind === MOVEMENT_KIND.free) return 'free';
  // Unlimited (054): green wherever the shape fits, red where it does not — never "past the move".
  if (piece.kind === MOVEMENT_KIND.unlimited) return cost !== null ? 'ok' : 'over';
  return cost !== null && piece.total !== null && cost <= piece.total ? 'ok' : 'over';
};

export const currentStatus = (state: MovementState): MovementStatus | null =>
  (state.phase === 'idle' ? null : statusOf(state.piece, state.cost));

/** Players can't go past the move; the master can (FR-010/FR-011). Unreachable hexes never. */
const allowed = (state: MovementState, isMaster: boolean): boolean =>
  state.phase !== 'idle' && state.cost !== null && (isMaster || currentStatus(state) !== 'over');

export const canPickDestination = (state: MovementState, isMaster: boolean): boolean =>
  state.phase === 'path' && state.target !== null && allowed(state, isMaster);

export const canConfirm = (state: MovementState, isMaster: boolean): boolean =>
  state.phase === 'facing' && allowed(state, isMaster);

/** First click: the piece goes to the target, arriving with the facing of the last step. */
export const pickDestination = (state: MovementState): MovementState => {
  if (state.phase !== 'path' || !state.target || state.cost === null) return state;
  const arrival = state.trail[state.trail.length - 1] ?? state.field.start;
  return {
    phase: 'facing',
    piece: state.piece,
    field: state.field,
    destination: state.target,
    look: arrival.look,
    trail: state.trail,
    cost: state.cost,
  };
};

/**
 * Facing mode: the piece turns to `look`; the cost is the cheapest way to end there with that facing. An unlimited
 * piece (054) only needs its shape to fit with the new facing.
 */
export const pointFacing = (state: MovementState, look: number, fits?: Fits): MovementState => {
  if (state.phase !== 'facing') return state;
  if (state.piece.kind === MOVEMENT_KIND.unlimited)
    return { ...state, look, cost: fits?.(state.destination.x, state.destination.y, look) ? 0 : null, trail: [] };
  const end = { x: state.destination.x, y: state.destination.y, look };
  const cost = movementCost(state.field, end);
  return { ...state, look, cost, trail: cost === null ? state.trail : pathTo(state.field, end) };
};

/** Where to draw the moving piece: at the start facing its first step, or on the destination. */
export const previewOf = (state: MovementState): MoveState | null => {
  if (state.phase === 'idle') return null;
  if (state.phase === 'facing') return { x: state.destination.x, y: state.destination.y, look: state.look };
  const start = state.field.start;
  let look = start.look;
  for (const step of state.trail) {
    if (step.x !== start.x || step.y !== start.y) break;
    look = step.look;
  }
  return { x: start.x, y: start.y, look };
};

/** Hexes the moving piece would take where it is drawn now (the target outline, 031). */
export const previewHexes = (state: MovementState): Offset[] => {
  if (state.phase === 'idle') return [];
  if (state.phase === 'facing') return footprint(state.destination.x, state.destination.y, state.look, state.piece.space);
  // Unlimited (054): the shape on the target with the facing it keeps, also where it does not fit (drawn red).
  if (state.piece.kind === MOVEMENT_KIND.unlimited)
    return state.target ? footprint(state.target.x, state.target.y, state.field.start.look, state.piece.space) : [];
  if (!state.target || state.cost === null) return state.target ? [state.target] : [];
  const arrival = state.trail[state.trail.length - 1] ?? state.field.start;
  return footprint(arrival.x, arrival.y, arrival.look, state.piece.space);
};
