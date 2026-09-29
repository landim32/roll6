/** Turn types — mirror the backend Turn DTOs (016). */

/** Entry type (backend TurnType); constants because `enum` is not allowed. */
export const TURN_TYPE = {
  movement: 1,
  action: 2,
  actionResult: 3,
  /** A change to a character/NPC during the turn (024), created by the system. */
  characterUpdate: 4,
  /** What happened in the turn, written when an assistant processes it (027); no character/NPC. */
  narration: 5,
} as const;

export type TurnType = (typeof TURN_TYPE)[keyof typeof TURN_TYPE];

/** One field changed by a CharacterUpdate entry (024). */
export interface TurnChangeInfo {
  /** currentLife, currentEnergy, characterStatus, notes, name, life, energy, move or status. */
  field: string;
  before: string | null;
  after: string | null;
}

/** One entry of a campaign turn: a move (before/after), an action, an action result or a character change. */
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
  /** Who made the entry (024). */
  userId: number;
  userName: string;
  /** Movement points spent (moves). */
  moved: number | null;
  /** Fields changed (CharacterUpdate). */
  changes: TurnChangeInfo[] | null;
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

/** Readable markdown of a turn (024): "## Ações" and "## Posições". */
export interface TurnSummaryInfo {
  campaignId: number;
  turnNo: number;
  markdown: string;
}

/** One finished turn of the turn console (028). */
export interface TurnHistoryItemInfo {
  turnNo: number;
  /** "## Ações" text of the turn summary. */
  actions: string;
  /** UTC time of the turn's last entry, without zone. */
  finishedAt: string | null;
}

/** Narration of one turn (029). `finishedAt` is null when that turn is still in progress. */
export interface TurnNarrationInfo {
  turnNo: number;
  narration: string;
  finishedAt: string | null;
}

/** A page of finished turns, newest first; `nextBefore` loads older ones (null = turn 1 reached). */
export interface TurnHistoryPageInfo {
  campaignId: number;
  currentTurn: number;
  items: TurnHistoryItemInfo[];
  nextBefore: number | null;
}
