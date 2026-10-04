/** Map token types — pieces on a campaign map; mirror the backend MapToken DTOs. */

/**
 * Piece type (backend MapTokenType); constants because `enum` is not allowed. NPC pieces come from the NPC
 * panel; any other token placed from the hex menu is an object.
 */
export const MAP_TOKEN_TYPE = {
  character: 1,
  npc: 2,
  object: 4,
} as const;

export type MapTokenType = (typeof MAP_TOKEN_TYPE)[keyof typeof MAP_TOKEN_TYPE];

/**
 * How a character or NPC is on the map (backend Posture, 031). Down and out-of-combat pieces lie down and take the
 * token's down size; out-of-combat pieces are drawn in black and white. Objects have none.
 */
export const POSTURE = {
  standing: 1,
  down: 2,
  outOfCombat: 3,
} as const;

export type Posture = (typeof POSTURE)[keyof typeof POSTURE];

export const POSTURES: readonly Posture[] = [POSTURE.standing, POSTURE.down, POSTURE.outOfCombat];

/** A piece on a map. Character pieces show the participation's name, vitals, status and sheet. */
export interface MapTokenInfo {
  mapTokenId: number;
  mapId: number;
  tokenId: number;
  tokenName: string;
  upImageUrl: string | null;
  /** "2,5D frente" image of the piece's token (034), the standing figure of the 3D view. */
  frontImageUrl: string | null;
  downImageUrl: string | null;
  campaignCharacterId: number | null;
  characterId: number | null;
  /** NPC occurrence of an Npc piece (its name/vitals/status are shown). */
  mapNpcId: number | null;
  npcId: number | null;
  name: string;
  tokenType: MapTokenType;
  sheet: string | null;
  /** Current values (participation / NPC occurrence for character and NPC pieces). */
  life: number;
  energy: number;
  /** Maximum values: the character's or the NPC's totals (the piece's own values for objects, 026). */
  totalLife: number;
  totalEnergy: number;
  status: string | null;
  move: number;
  /** Column/row (odd-q offset). */
  x: number;
  y: number;
  /** Hex side the piece faces, 0–5 clockwise from the top. */
  look: number;
  /** Posture of the character/NPC occurrence; null for objects. */
  posture: Posture | null;
  /** Hexes the piece takes now: the token's standing or down size, depending on the posture (1, 2, 3, 7 or 10). */
  space: number;
  createdAt: string;
  updatedAt: string;
}

/** New piece from the hex menu (always an object). */
export interface MapTokenInsertInfo {
  mapId: number;
  tokenId: number;
  name: string | null;
  tokenType: MapTokenType;
  sheet: string | null;
  life: number;
  energy: number;
  status: string | null;
  move: number;
  x: number;
  y: number;
  look: number | null;
}

/** Places a campaign character; `tokenId` is only used (and saved on the character) when it has none. */
export interface MapTokenCharacterInsertInfo {
  mapId: number;
  campaignCharacterId: number;
  tokenId: number | null;
  x: number;
  y: number;
}

export interface MapTokenPositionInfo {
  x: number;
  y: number;
  /** New facing (0–5); omitted keeps the current one. */
  look?: number;
}

export interface MapTokenPostureInfo {
  posture: Posture;
}

export interface MapTokenTokenInfo {
  tokenId: number;
}
