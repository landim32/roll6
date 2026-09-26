/** Turn types — mirror the backend Turn DTOs (016). */

/** Entry type (backend TurnType); constants because `enum` is not allowed. */
export const TURN_TYPE = {
  movement: 1,
  action: 2,
  actionResult: 3,
} as const;

export type TurnType = (typeof TURN_TYPE)[keyof typeof TURN_TYPE];

/** One entry of a campaign turn: a move (before/after), an action or an action result (text). */
export interface TurnInfo {
  turnId: number;
  campaignId: number;
  mapId: number | null;
  turnNo: number;
  turnType: TurnType;
  /** Exactly one of character / NPC; NPC entries made from the map keep the occurrence. */
  characterId: number | null;
  npcId: number | null;
  mapNpcId: number | null;
  /** Character name, or the NPC occurrence's name. */
  actorName: string;
  beforeX: number | null;
  beforeY: number | null;
  beforeLook: number | null;
  x: number | null;
  y: number | null;
  look: number | null;
  description: string | null;
  createdAt: string;
}

/** Current turn of a campaign with its entries (chronological). */
export interface TurnStateInfo {
  turnNo: number;
  entries: TurnInfo[];
}

/** Answer of "Finalizar turno": either finished, or the characters that still have to act. */
export interface TurnFinishResultInfo {
  finished: boolean;
  pending: string[];
  finishedTurn: number | null;
  /** Turn in progress after the call. */
  turnNo: number;
}

/** Answer of "Resetar turno": removed entries and whether the piece went back to where it was. */
export interface TurnResetResultInfo {
  removed: number;
  reverted: boolean;
}
