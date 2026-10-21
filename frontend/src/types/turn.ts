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

/** Kind of the piece an action is about (098). */
export type TargetKind = 'character' | 'npc' | 'object';

/** Side of the piece an action is about (098): the actor's own piece, an ally (characters, ally NPCs), an enemy, a neutral or an object. */
export type TargetSide = 'self' | 'ally' | 'enemy' | 'neutral' | 'object';

/**
 * What an action is about (098, "Ação sobre…"), as it was when declared: the hex, the distance from the actor's piece
 * and, with a piece on the hex, its identity and what the table showed of it. Null on a masked whispered action.
 */
export interface TurnTargetInfo {
  x: number;
  y: number;
  distance: number;
  /** The piece that covered the hex; null = empty hex (every field below is null too). */
  mapTokenId: number | null;
  kind: TargetKind | null;
  /** "personagem", "NPC" or "objeto". */
  kindLabel: string | null;
  side: TargetSide | null;
  /** "si mesmo", "aliado", "inimigo", "neutro" or "objeto". */
  sideLabel: string | null;
  name: string | null;
  characterId: number | null;
  mapNpcId: number | null;
  look: number | null;
  lookName: string | null;
  posture: number | null;
  postureLabel: string | null;
  status: string | null;
  currentLife: number | null;
  totalLife: number | null;
  currentEnergy: number | null;
  totalEnergy: number | null;
  /** The target as the summary line says it. */
  text: string;
}

/** The hex an action is about, as sent with the action (098). */
export interface ActionTargetWrite {
  x: number;
  y: number;
  /** The piece seen on the hex, when there was one. */
  mapTokenId?: number | null;
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
  /** A whisper the reader sees whole (047). */
  whisper?: boolean;
  /** A whispered action the reader is not in (047): the description is "está sussurrando!". */
  whisperHidden?: boolean;
  /** What the action is about (098); null without a target or on a masked whispered action. */
  target?: TurnTargetInfo | null;
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

/** Narration of one turn (029). `finishedAt` is null when that turn is still in progress. */
export interface TurnNarrationInfo {
  turnNo: number;
  narration: string;
  finishedAt: string | null;
}

