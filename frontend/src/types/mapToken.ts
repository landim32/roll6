/** Map token types — pieces on a campaign map; mirror the backend MapToken DTOs. */

/** Piece type (backend MapTokenType); constants because `enum` is not allowed. */
export const MAP_TOKEN_TYPE = {
  character: 1,
  npc: 2,
  enemy: 3,
  object: 4,
} as const;

export type MapTokenType = (typeof MAP_TOKEN_TYPE)[keyof typeof MAP_TOKEN_TYPE];

/** A piece on a map. Character pieces show the participation's name, vitals, status and sheet. */
export interface MapTokenInfo {
  mapTokenId: number;
  mapId: number;
  tokenId: number;
  tokenName: string;
  upImageUrl: string | null;
  downImageUrl: string | null;
  campaignCharacterId: number | null;
  characterId: number | null;
  /** NPC occurrence of an Npc piece (its name/vitals/status are shown). */
  mapNpcId: number | null;
  npcId: number | null;
  name: string;
  tokenType: MapTokenType;
  sheet: string | null;
  life: number;
  energy: number;
  status: string | null;
  move: number;
  /** Column/row (odd-q offset). */
  x: number;
  y: number;
  /** Hex side the piece faces, 0–5 clockwise from the top. */
  look: number;
  createdAt: string;
  updatedAt: string;
}

/** New piece from the hex menu (NPCs, enemies, objects). */
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
}

export interface MapTokenTokenInfo {
  tokenId: number;
}
